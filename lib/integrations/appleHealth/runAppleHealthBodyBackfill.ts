import type { AppleHealthBodyBackfillState } from "./storage";
import type { AppleHealthBodyWeightSample } from "./healthKit";
import { ingestAppleHealthBodySamples } from "./runAppleHealthBodySync";

export const APPLE_HEALTH_BODY_BACKFILL_YEARS = 5;
export const APPLE_HEALTH_BODY_BACKFILL_CHUNK_DAYS = 31;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

export function isoYearsAgoFromNow(years: number, nowIso: string): string {
  const d = new Date(nowIso);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString();
}

export type RunAppleHealthBodyBackfillDeps = {
  nowIso: () => string;
  pullBodyCompositionSamples: (opts: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) => Promise<{ ok: true; data: AppleHealthBodyWeightSample[] } | { ok: false; error: string }>;
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
  getBackfillState: () => Promise<AppleHealthBodyBackfillState | null>;
  setBackfillState: (state: AppleHealthBodyBackfillState) => Promise<void>;
};

export type RunAppleHealthBodyBackfillResult =
  | {
      ok: true;
      status: "completed" | "already_completed";
      startedAt: string;
      completedAt: string;
      chunkCount: number;
      samplesRead: number;
      samplesIngested: number;
      samplesSkippedDuplicate: number;
      lastProcessedDate: string | null;
    }
  | { ok: false; error: string; requestId: string | null };

export async function runAppleHealthBodyBackfill(
  opts: {
    token: string;
    forceRestart?: boolean;
    chunkDays?: number;
  },
  deps: RunAppleHealthBodyBackfillDeps,
): Promise<RunAppleHealthBodyBackfillResult> {
  const now = deps.nowIso();
  const targetStartDate = isoYearsAgoFromNow(APPLE_HEALTH_BODY_BACKFILL_YEARS, now);
  const chunkDays = Math.max(1, opts.chunkDays ?? APPLE_HEALTH_BODY_BACKFILL_CHUNK_DAYS);
  const existing = await deps.getBackfillState();

  if (!opts.forceRestart && existing?.status === "completed") {
    return {
      ok: true,
      status: "already_completed",
      startedAt: existing.summary.startedAt,
      completedAt: existing.summary.completedAt ?? now,
      chunkCount: existing.summary.chunkCount,
      samplesRead: existing.summary.samplesRead,
      samplesIngested: existing.summary.samplesIngested,
      samplesSkippedDuplicate: existing.summary.samplesSkippedDuplicate,
      lastProcessedDate: existing.summary.lastProcessedDate,
    };
  }

  const startedAt = existing?.status === "in_progress" && !opts.forceRestart ? existing.summary.startedAt : now;
  const initialCursor =
    existing?.status === "in_progress" && existing.lastProcessedDate && !opts.forceRestart
      ? existing.lastProcessedDate
      : targetStartDate;

  let cursor = initialCursor;
  let chunkCount = existing?.status === "in_progress" && !opts.forceRestart ? existing.summary.chunkCount : 0;
  let samplesRead = existing?.status === "in_progress" && !opts.forceRestart ? existing.summary.samplesRead : 0;
  let samplesIngested =
    existing?.status === "in_progress" && !opts.forceRestart ? existing.summary.samplesIngested : 0;
  const samplesSkippedDuplicate = 0;

  await deps.setBackfillState({
    status: "in_progress",
    backfillStartDate: startedAt,
    targetStartDate,
    lastProcessedDate: cursor,
    lastRunAt: now,
    error: null,
    summary: {
      startedAt,
      completedAt: null,
      chunkCount,
      samplesRead,
      samplesIngested,
      samplesSkippedDuplicate,
      lastProcessedDate: cursor,
    },
  });

  while (cursor < now) {
    const chunkEnd = minIso(addDaysIso(cursor, chunkDays), now);
    const pulled = await deps.pullBodyCompositionSamples({ startDate: cursor, endDate: chunkEnd });
    if (!pulled.ok) {
      await deps.setBackfillState({
        status: "failed",
        backfillStartDate: startedAt,
        targetStartDate,
        lastProcessedDate: cursor,
        lastRunAt: deps.nowIso(),
        error: pulled.error,
        summary: {
          startedAt,
          completedAt: null,
          chunkCount,
          samplesRead,
          samplesIngested,
          samplesSkippedDuplicate,
          lastProcessedDate: cursor,
        },
      });
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
      await deps.setBackfillState({
        status: "failed",
        backfillStartDate: startedAt,
        targetStartDate,
        lastProcessedDate: cursor,
        lastRunAt: deps.nowIso(),
        error: ingested.error,
        summary: {
          startedAt,
          completedAt: null,
          chunkCount,
          samplesRead,
          samplesIngested,
          samplesSkippedDuplicate,
          lastProcessedDate: cursor,
        },
      });
      return { ok: false, error: ingested.error, requestId: ingested.requestId };
    }

    chunkCount += 1;
    samplesRead += ingested.samplesRead;
    samplesIngested += ingested.ingested;
    cursor = chunkEnd;
    await deps.setBackfillState({
      status: "in_progress",
      backfillStartDate: startedAt,
      targetStartDate,
      lastProcessedDate: cursor,
      lastRunAt: deps.nowIso(),
      error: null,
      summary: {
        startedAt,
        completedAt: null,
        chunkCount,
        samplesRead,
        samplesIngested,
        samplesSkippedDuplicate,
        lastProcessedDate: cursor,
      },
    });
  }

  const completedAt = deps.nowIso();
  await deps.setBackfillState({
    status: "completed",
    backfillStartDate: startedAt,
    targetStartDate,
    lastProcessedDate: cursor,
    lastRunAt: completedAt,
    error: null,
    summary: {
      startedAt,
      completedAt,
      chunkCount,
      samplesRead,
      samplesIngested,
      samplesSkippedDuplicate,
      lastProcessedDate: cursor,
    },
  });
  return {
    ok: true,
    status: "completed",
    startedAt,
    completedAt,
    chunkCount,
    samplesRead,
    samplesIngested,
    samplesSkippedDuplicate,
    lastProcessedDate: cursor,
  };
}
