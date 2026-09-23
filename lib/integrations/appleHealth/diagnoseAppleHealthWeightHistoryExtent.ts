/**
 * DEV-only Apple Health Weight history extent probe.
 * Never logs Weight values, UIDs, emails, tokens, or sample IDs.
 */
import { pullBodyCompositionSamples } from "@/lib/integrations/appleHealth/healthKit";
import {
  APPLE_HEALTH_BODY_BACKFILL_YEARS,
  isoYearsAgoFromNow,
} from "@/lib/integrations/appleHealth/runAppleHealthBodyBackfill";

function approxBucket(n: number): string {
  if (n <= 0) return "0";
  if (n < 10) return "1-9";
  if (n < 50) return "10-49";
  if (n < 100) return "50-99";
  if (n < 500) return "100-499";
  if (n < 2000) return "500-1999";
  return "2000+";
}

export type AppleHealthWeightHistoryExtentDiagnostic = {
  readonly metric: "weight";
  readonly queryStart: string;
  readonly queryEnd: string;
  readonly oldestObservedAt: string | null;
  readonly newestObservedAt: string | null;
  readonly samplesApprox: string;
  readonly ok: boolean;
  readonly safeErrorCode: string | null;
};

/**
 * Probe HealthKit for Weight samples across the Body backfill horizon.
 * Uses ascending:false native default with a high limit inside pullBodyCompositionSamples
 * via an unbounded-ish window pull — prefer chunked production backfill for ingest.
 */
export async function diagnoseAppleHealthWeightHistoryExtent(opts?: {
  readonly nowIso?: string;
  readonly years?: number;
}): Promise<AppleHealthWeightHistoryExtentDiagnostic> {
  const now = opts?.nowIso ?? new Date().toISOString();
  const years = opts?.years ?? APPLE_HEALTH_BODY_BACKFILL_YEARS;
  const queryStart = isoYearsAgoFromNow(years, now);
  const queryEnd = now;

  const pulled = await pullBodyCompositionSamples({
    startDate: queryStart,
    endDate: queryEnd,
    limit: 5000,
    include: { weight: true, bodyFat: false, leanTissue: false },
  });

  if (!pulled.ok) {
    const diag: AppleHealthWeightHistoryExtentDiagnostic = {
      metric: "weight",
      queryStart,
      queryEnd,
      oldestObservedAt: null,
      newestObservedAt: null,
      samplesApprox: "0",
      ok: false,
      safeErrorCode: "healthkit_pull_failed",
    };
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.info("[AH_BODY_HISTORY]", diag);
    }
    return diag;
  }

  const withWeight = pulled.data
    .filter((s) => typeof s.weightKg === "number" && s.weightKg > 0)
    .map((s) => s.observedAt)
    .filter((iso) => typeof iso === "string" && iso.length > 0)
    .sort((a, b) => a.localeCompare(b));

  const diag: AppleHealthWeightHistoryExtentDiagnostic = {
    metric: "weight",
    queryStart,
    queryEnd,
    oldestObservedAt: withWeight[0] ?? null,
    newestObservedAt: withWeight.length > 0 ? withWeight[withWeight.length - 1]! : null,
    samplesApprox: approxBucket(withWeight.length),
    ok: true,
    safeErrorCode: null,
  };

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY_HISTORY]", diag);
  }
  return diag;
}
