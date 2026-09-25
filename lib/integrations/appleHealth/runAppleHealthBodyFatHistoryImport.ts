/**
 * Body Fat–specific Apple Health all-history import.
 *
 * Independent of the domain Body backfill checkpoint so Weight completion
 * cannot falsely mark Body Fat complete. Not capped at five years — scans
 * from {@link resolveBodyFatHistorySearchBoundary} (or discovered oldest)
 * through now using half-year chunks that tolerate empty windows.
 */

import type { AppleHealthBodyWeightSample } from "./healthKit";
import { ingestAppleHealthBodySamples } from "./runAppleHealthBodySync";
import {
  APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_DAYS,
  APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_LIMIT,
  resolveBodyFatHistorySearchBoundary,
} from "./bodyFatHistoryBoundary";
import type { AppleHealthBodyFatBackfillStateV1 } from "./storage";

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b;
}

function approxBucket(n: number): string {
  if (n <= 0) return "0";
  if (n < 10) return "1-9";
  if (n < 50) return "10-49";
  if (n < 100) return "50-99";
  if (n < 500) return "100-499";
  if (n < 2000) return "500-1999";
  return "2000+";
}

function logBfHistory(fields: Record<string, string | number | boolean | null>): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY_FAT_HISTORY]", { operation: "body_fat_history_import", ...fields });
  }
}

export type BodyFatHistoryPullOpts = {
  startDate: string;
  endDate: string;
  limit?: number;
  ascending?: boolean;
  include?: { weight?: boolean; bodyFat?: boolean; leanTissue?: boolean };
};

export type RunAppleHealthBodyFatHistoryImportDeps = {
  nowIso: () => string;
  pullBodyCompositionSamples: (
    opts: BodyFatHistoryPullOpts,
  ) => Promise<{ ok: true; data: AppleHealthBodyWeightSample[] } | { ok: false; error: string }>;
  ingestRawEvent: (
    body: unknown,
    token: string,
    opts: { idempotencyKey: string; timeoutMs: number },
  ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
  appleHealthBodyWeightIdempotencyKey: (params: {
    observedAtIso: string;
    sourceId?: string | null;
  }) => string;
  appleHealthBodyCompositionIdempotencyKey: (params: {
    observedAtIso: string;
    sourceId?: string | null;
    metric: "bodyFatPercent" | "bmi" | "leanBodyMassKg" | "restingMetabolicRateKcal";
  }) => string;
  getDeviceTimezone: () => string;
  getBackfillState: () => Promise<AppleHealthBodyFatBackfillStateV1 | null>;
  setBackfillState: (state: AppleHealthBodyFatBackfillStateV1) => Promise<void>;
  /** Optional profile DOB (YYYY-MM-DD or ISO) for search boundary. */
  dateOfBirthIso?: string | null;
};

export type BodyFatHistoryExtentDiscovery = {
  readonly oldestObservedAt: string | null;
  readonly newestObservedAt: string | null;
  readonly sampleCountBucket: string;
  readonly chunksScanned: number;
  readonly scanStart: string;
  readonly scanEnd: string;
  readonly status: "ok" | "empty" | "error";
  readonly safeErrorCode: string | null;
};

/**
 * Discover the oldest Body Fat sample from the approved search boundary.
 *
 * Strategy:
 * 1) Prefer ascending + limit 1 over [boundary, now] when the bridge honors it.
 * 2) Fallback: forward half-year chunks from boundary, tolerating empty windows,
 *    tracking min/max observedAt (mandatory for sparse 2017→2024 gaps).
 */
export async function discoverOldestBodyFatObservedAt(
  deps: Pick<RunAppleHealthBodyFatHistoryImportDeps, "nowIso" | "pullBodyCompositionSamples"> & {
    readonly dateOfBirthIso?: string | null;
    readonly chunkDays?: number;
  },
): Promise<BodyFatHistoryExtentDiscovery> {
  const now = deps.nowIso();
  const scanStart = resolveBodyFatHistorySearchBoundary({
    nowIso: now,
    ...(deps.dateOfBirthIso !== undefined
      ? { dateOfBirthIso: deps.dateOfBirthIso }
      : {}),
  });
  const scanEnd = now;
  const chunkDays = Math.max(1, deps.chunkDays ?? APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_DAYS);

  // Prefer single-shot oldest discovery when the bridge honors ascending.
  const ascendingProbe = await deps.pullBodyCompositionSamples({
    startDate: scanStart,
    endDate: scanEnd,
    limit: 1,
    ascending: true,
    include: { weight: false, bodyFat: true, leanTissue: false },
  });
  if (!ascendingProbe.ok) {
    const diag: BodyFatHistoryExtentDiscovery = {
      oldestObservedAt: null,
      newestObservedAt: null,
      sampleCountBucket: "0",
      chunksScanned: 1,
      scanStart,
      scanEnd,
      status: "error",
      safeErrorCode: "healthkit_pull_failed",
    };
    emitAhBodyFatExtent(diag, "discover_ascending");
    return diag;
  }
  if (ascendingProbe.data.length > 0) {
    const at = ascendingProbe.data[0]?.observedAt;
    if (typeof at === "string" && at.length > 0) {
      const ageDays = (Date.parse(scanEnd) - Date.parse(at)) / 86_400_000;
      const spanYears =
        (Date.parse(scanEnd) - Date.parse(scanStart)) / (365.25 * 86_400_000);
      // Trust ascending when the hit is materially older than "recent" on a wide window,
      // or when the search window itself is short.
      const looksLikeOldest = ageDays > 400 || spanYears <= 2;
      if (looksLikeOldest) {
        const diag: BodyFatHistoryExtentDiscovery = {
          oldestObservedAt: at,
          newestObservedAt: at,
          sampleCountBucket: "1-9",
          chunksScanned: 1,
          scanStart,
          scanEnd,
          status: "ok",
          safeErrorCode: null,
        };
        emitAhBodyFatExtent(diag, "discover_ascending");
        return diag;
      }
      // Bridge likely ignored ascending (returned newest) — fall through to chunk scan.
    }
  }

  // Forward chunk scan — empty years must not terminate.
  let cursor = scanStart;
  let chunksScanned = 0;
  let oldestObservedAt: string | null = null;
  let newestObservedAt: string | null = null;
  let sampleCount = 0;

  while (cursor < scanEnd) {
    const chunkEnd = minIso(addDaysIso(cursor, chunkDays), scanEnd);
    const pulled = await deps.pullBodyCompositionSamples({
      startDate: cursor,
      endDate: chunkEnd,
      limit: APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_LIMIT,
      ascending: true,
      include: { weight: false, bodyFat: true, leanTissue: false },
    });
    chunksScanned += 1;
    if (!pulled.ok) {
      const diag: BodyFatHistoryExtentDiscovery = {
        oldestObservedAt,
        newestObservedAt,
        sampleCountBucket: approxBucket(sampleCount),
        chunksScanned,
        scanStart,
        scanEnd,
        status: "error",
        safeErrorCode: "healthkit_pull_failed",
      };
      emitAhBodyFatExtent(diag, "discover_chunk");
      return diag;
    }

    const times = pulled.data
      .map((s) => s.observedAt)
      .filter((iso): iso is string => typeof iso === "string" && iso.length > 0)
      .sort((a, b) => a.localeCompare(b));
    sampleCount += times.length;
    if (times.length > 0) {
      const chunkOldest = times[0]!;
      const chunkNewest = times[times.length - 1]!;
      if (oldestObservedAt == null || chunkOldest < oldestObservedAt) {
        oldestObservedAt = chunkOldest;
      }
      if (newestObservedAt == null || chunkNewest > newestObservedAt) {
        newestObservedAt = chunkNewest;
      }
    }
    // Hit limit → may have truncated; keep scanning (idempotent ingest later).
    cursor = chunkEnd;
  }

  const diag: BodyFatHistoryExtentDiscovery = {
    oldestObservedAt,
    newestObservedAt,
    sampleCountBucket: approxBucket(sampleCount),
    chunksScanned,
    scanStart,
    scanEnd,
    status: sampleCount > 0 ? "ok" : "empty",
    safeErrorCode: null,
  };
  emitAhBodyFatExtent(diag, "discover_chunk");
  return diag;
}

function emitAhBodyFatExtent(diag: BodyFatHistoryExtentDiscovery, operation: string): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY_FAT_HISTORY_EXTENT]", {
      metric: "bodyFat",
      operation,
      ...diag,
    });
  }
}

export type RunAppleHealthBodyFatHistoryImportResult =
  | {
      ok: true;
      status: "completed" | "already_completed";
      startedAt: string;
      completedAt: string;
      chunkCount: number;
      samplesRead: number;
      samplesIngested: number;
      oldestHealthKitObservedAt: string | null;
      newestHealthKitObservedAt: string | null;
    }
  | { ok: false; error: string; requestId: string | null };

/**
 * True when a prior "completed" Body Fat checkpoint never covered the
 * discovered/oldest HealthKit extent (e.g. leftover 5Y domain false-complete).
 */
export function isBodyFatHistoryCompletionImplausible(args: {
  readonly existing: AppleHealthBodyFatBackfillStateV1;
  readonly discoveredOldestObservedAt: string | null;
  readonly searchBoundaryIso: string;
}): boolean {
  if (args.existing.status !== "completed") return false;
  const target = args.existing.targetStartDate;
  if (!target) return true;
  // Completed but target still sits near a short horizon while discovery found older data.
  if (
    args.discoveredOldestObservedAt != null &&
    args.discoveredOldestObservedAt < target
  ) {
    return true;
  }
  // Completed with a target newer than the approved search boundary by >1 year
  // and no recorded HK oldest → treat as false-complete from the 5Y era.
  if (
    args.existing.oldestHealthKitObservedAt == null &&
    Date.parse(target) - Date.parse(args.searchBoundaryIso) > 365 * 86_400_000
  ) {
    return true;
  }
  return false;
}

async function pullChunkWithBisection(
  deps: RunAppleHealthBodyFatHistoryImportDeps,
  startDate: string,
  endDate: string,
  depth: number,
): Promise<
  | { ok: true; data: AppleHealthBodyWeightSample[] }
  | { ok: false; error: string }
> {
  const pulled = await deps.pullBodyCompositionSamples({
    startDate,
    endDate,
    limit: APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_LIMIT,
    ascending: true,
    include: { weight: false, bodyFat: true, leanTissue: false },
  });
  if (!pulled.ok) return pulled;
  if (
    pulled.data.length < APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_LIMIT ||
    depth >= 4
  ) {
    return pulled;
  }
  // Limit saturated — bisect to avoid silent truncation.
  const midMs = (Date.parse(startDate) + Date.parse(endDate)) / 2;
  if (!Number.isFinite(midMs) || midMs <= Date.parse(startDate)) {
    return pulled;
  }
  const midIso = new Date(midMs).toISOString();
  const left = await pullChunkWithBisection(deps, startDate, midIso, depth + 1);
  if (!left.ok) return left;
  const right = await pullChunkWithBisection(deps, midIso, endDate, depth + 1);
  if (!right.ok) return right;
  return { ok: true, data: [...left.data, ...right.data] };
}

/**
 * Import all available Body Fat history from the discovered oldest sample
 * (or search boundary) forward to now. Empty half-year windows continue.
 */
export async function runAppleHealthBodyFatHistoryImport(
  opts: {
    token: string;
    forceRestart?: boolean;
    chunkDays?: number;
  },
  deps: RunAppleHealthBodyFatHistoryImportDeps,
): Promise<RunAppleHealthBodyFatHistoryImportResult> {
  const now = deps.nowIso();
  const searchBoundary = resolveBodyFatHistorySearchBoundary({
    nowIso: now,
    ...(deps.dateOfBirthIso !== undefined
      ? { dateOfBirthIso: deps.dateOfBirthIso }
      : {}),
  });
  const chunkDays = Math.max(1, opts.chunkDays ?? APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_DAYS);
  const existing = await deps.getBackfillState();

  const discovery = await discoverOldestBodyFatObservedAt({
    nowIso: deps.nowIso,
    pullBodyCompositionSamples: deps.pullBodyCompositionSamples,
    ...(deps.dateOfBirthIso !== undefined
      ? { dateOfBirthIso: deps.dateOfBirthIso }
      : {}),
    chunkDays,
  });

  const discoveredOldest = discovery.oldestObservedAt;
  // Import from the oldest proven sample (clamped to the HealthKit-era floor).
  // When discovery is empty, still scan the full approved boundary to prove terminal empty.
  const importStart =
    discoveredOldest != null
      ? maxIso(discoveredOldest, searchBoundary)
      : searchBoundary;

  const forceRestart =
    opts.forceRestart === true ||
    (existing != null &&
      isBodyFatHistoryCompletionImplausible({
        existing,
        discoveredOldestObservedAt: discoveredOldest,
        searchBoundaryIso: searchBoundary,
      }));

  if (forceRestart && existing?.status === "completed" && opts.forceRestart !== true) {
    logBfHistory({
      phase: "force_restart_implausible_complete",
      priorTargetStart: existing.targetStartDate,
      discoveredOldest: discoveredOldest,
    });
  }

  if (!forceRestart && existing?.status === "completed") {
    return {
      ok: true,
      status: "already_completed",
      startedAt: existing.summary.startedAt,
      completedAt: existing.summary.completedAt ?? now,
      chunkCount: existing.summary.chunkCount,
      samplesRead: existing.summary.samplesRead,
      samplesIngested: existing.summary.samplesIngested,
      oldestHealthKitObservedAt: existing.oldestHealthKitObservedAt,
      newestHealthKitObservedAt: existing.newestHealthKitObservedAt,
    };
  }

  const startedAt =
    (existing?.status === "in_progress" || existing?.status === "failed") && !forceRestart
      ? existing.summary.startedAt
      : now;
  const initialCursor =
    (existing?.status === "in_progress" || existing?.status === "failed") &&
    existing.lastProcessedDate &&
    !forceRestart
      ? existing.lastProcessedDate
      : importStart;

  let cursor = initialCursor;
  let chunkCount =
    (existing?.status === "in_progress" || existing?.status === "failed") && !forceRestart
      ? existing.summary.chunkCount
      : 0;
  let samplesRead =
    (existing?.status === "in_progress" || existing?.status === "failed") && !forceRestart
      ? existing.summary.samplesRead
      : 0;
  let samplesIngested =
    (existing?.status === "in_progress" || existing?.status === "failed") && !forceRestart
      ? existing.summary.samplesIngested
      : 0;
  let oldestHealthKitObservedAt =
    (!forceRestart ? existing?.oldestHealthKitObservedAt : null) ?? discoveredOldest;
  let newestHealthKitObservedAt =
    (!forceRestart ? existing?.newestHealthKitObservedAt : null) ??
    discovery.newestObservedAt;

  const persist = async (
    status: AppleHealthBodyFatBackfillStateV1["status"],
    extra?: { error?: string | null; completedAt?: string | null },
  ) => {
    await deps.setBackfillState({
      version: 1,
      metric: "bodyFat",
      status,
      backfillStartDate: startedAt,
      targetStartDate: importStart,
      lastProcessedDate: cursor,
      lastRunAt: deps.nowIso(),
      error: extra?.error ?? null,
      oldestHealthKitObservedAt,
      newestHealthKitObservedAt,
      summary: {
        startedAt,
        completedAt: extra?.completedAt ?? null,
        chunkCount,
        samplesRead,
        samplesIngested,
        samplesSkippedDuplicate: 0,
        lastProcessedDate: cursor,
      },
    });
  };

  await persist("in_progress");
  logBfHistory({
    phase: "import_started",
    importStart,
    discoveredOldest: discoveredOldest,
    forceRestart,
    searchBoundary,
  });

  while (cursor < now) {
    const chunkEnd = minIso(addDaysIso(cursor, chunkDays), now);
    const pulled = await pullChunkWithBisection(deps, cursor, chunkEnd, 0);
    if (!pulled.ok) {
      await persist("failed", { error: pulled.error });
      return { ok: false, error: pulled.error, requestId: null };
    }

    const ingested = await ingestAppleHealthBodySamples(
      { token: opts.token, samples: pulled.data },
      {
        ingestRawEvent: deps.ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: deps.appleHealthBodyWeightIdempotencyKey,
        appleHealthBodyCompositionIdempotencyKey: deps.appleHealthBodyCompositionIdempotencyKey,
        getDeviceTimezone: deps.getDeviceTimezone,
      },
    );
    if (!ingested.ok) {
      await persist("failed", { error: ingested.error });
      return { ok: false, error: ingested.error, requestId: ingested.requestId };
    }

    for (const sample of pulled.data) {
      const at = sample.observedAt;
      if (typeof at !== "string" || at.length === 0) continue;
      if (oldestHealthKitObservedAt == null || at < oldestHealthKitObservedAt) {
        oldestHealthKitObservedAt = at;
      }
      if (newestHealthKitObservedAt == null || at > newestHealthKitObservedAt) {
        newestHealthKitObservedAt = at;
      }
    }

    chunkCount += 1;
    samplesRead += ingested.samplesRead;
    samplesIngested += ingested.ingested;
    cursor = chunkEnd;
    await persist("in_progress");
  }

  const completedAt = deps.nowIso();
  await persist("completed", { completedAt });
  logBfHistory({
    phase: "completed",
    chunkCount,
    samplesReadBucket: samplesRead > 0 ? "nonzero" : "zero",
    oldestHealthKitObservedAt,
    newestHealthKitObservedAt,
    importStart,
  });

  return {
    ok: true,
    status: "completed",
    startedAt,
    completedAt,
    chunkCount,
    samplesRead,
    samplesIngested,
    oldestHealthKitObservedAt,
    newestHealthKitObservedAt,
  };
}
