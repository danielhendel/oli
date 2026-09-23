/**
 * DEV-only Apple Health Weight history extent probe.
 * Scans forward from the 5Y horizon in chunks so oldest is not lost to a
 * newest-first HealthKit limit on the full window.
 *
 * Never logs Weight values, UIDs, emails, tokens, or sample IDs.
 */
import { pullBodyCompositionSamples } from "@/lib/integrations/appleHealth/healthKit";
import {
  APPLE_HEALTH_BODY_BACKFILL_YEARS,
  isoYearsAgoFromNow,
} from "@/lib/integrations/appleHealth/runAppleHealthBodyBackfill";

const PROBE_CHUNK_DAYS = 90;

function approxBucket(n: number): string {
  if (n <= 0) return "0";
  if (n < 10) return "1-9";
  if (n < 50) return "10-49";
  if (n < 100) return "50-99";
  if (n < 500) return "100-499";
  if (n < 2000) return "500-1999";
  return "2000+";
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

export type AppleHealthWeightHistoryExtentDiagnostic = {
  readonly metric: "weight";
  readonly oldestObservedAt: string | null;
  readonly newestObservedAt: string | null;
  readonly sampleCountBucket: string;
  readonly pagesOrChunks: number;
  readonly scanStart: string;
  readonly scanEnd: string;
  readonly status: "ok" | "empty" | "error";
  readonly safeErrorCode: string | null;
};

function emitExtent(diag: AppleHealthWeightHistoryExtentDiagnostic): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_WEIGHT_HISTORY_EXTENT]", diag);
  }
}

/**
 * Probe HealthKit for Weight sample extent across the Body backfill horizon.
 * Forward chunk scan finds true oldest; trailing window finds newest.
 */
export async function diagnoseAppleHealthWeightHistoryExtent(opts?: {
  readonly nowIso?: string;
  readonly years?: number;
  readonly chunkDays?: number;
}): Promise<AppleHealthWeightHistoryExtentDiagnostic> {
  const now = opts?.nowIso ?? new Date().toISOString();
  const years = opts?.years ?? APPLE_HEALTH_BODY_BACKFILL_YEARS;
  const chunkDays = Math.max(1, opts?.chunkDays ?? PROBE_CHUNK_DAYS);
  const scanStart = isoYearsAgoFromNow(years, now);
  const scanEnd = now;

  let cursor = scanStart;
  let pagesOrChunks = 0;
  let oldestObservedAt: string | null = null;
  let newestObservedAt: string | null = null;
  let sampleCount = 0;

  while (cursor < scanEnd) {
    const chunkEnd = minIso(addDaysIso(cursor, chunkDays), scanEnd);
    const pulled = await pullBodyCompositionSamples({
      startDate: cursor,
      endDate: chunkEnd,
      limit: 500,
      include: { weight: true, bodyFat: false, leanTissue: false },
    });
    pagesOrChunks += 1;

    if (!pulled.ok) {
      const diag: AppleHealthWeightHistoryExtentDiagnostic = {
        metric: "weight",
        oldestObservedAt,
        newestObservedAt,
        sampleCountBucket: approxBucket(sampleCount),
        pagesOrChunks,
        scanStart,
        scanEnd,
        status: "error",
        safeErrorCode: "healthkit_pull_failed",
      };
      emitExtent(diag);
      return diag;
    }

    const times = pulled.data
      .filter((s) => typeof s.weightKg === "number" && s.weightKg > 0)
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

    cursor = chunkEnd;
  }

  const diag: AppleHealthWeightHistoryExtentDiagnostic = {
    metric: "weight",
    oldestObservedAt,
    newestObservedAt,
    sampleCountBucket: approxBucket(sampleCount),
    pagesOrChunks,
    scanStart,
    scanEnd,
    status: sampleCount > 0 ? "ok" : "empty",
    safeErrorCode: null,
  };
  emitExtent(diag);
  return diag;
}
