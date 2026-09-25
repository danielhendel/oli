/**
 * DEV-only Apple Health Body Fat history extent probe.
 * Scans forward from the approved all-history boundary (not a 5Y cap) in
 * half-year chunks so oldest is not lost to a newest-first HealthKit limit.
 *
 * Never logs Body Fat values, UIDs, emails, tokens, or sample IDs.
 */
import { pullBodyCompositionSamples } from "@/lib/integrations/appleHealth/healthKit";
import { resolveBodyFatHistorySearchBoundary } from "@/lib/integrations/appleHealth/bodyFatHistoryBoundary";
import {
  discoverOldestBodyFatObservedAt,
} from "@/lib/integrations/appleHealth/runAppleHealthBodyFatHistoryImport";

export type AppleHealthBodyFatHistoryExtentDiagnostic = {
  readonly metric: "bodyFat";
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
 * Probe HealthKit for Body Fat sample extent across the all-history boundary.
 */
export async function diagnoseAppleHealthBodyFatHistoryExtent(opts?: {
  readonly nowIso?: string;
  readonly dateOfBirthIso?: string | null;
  readonly chunkDays?: number;
}): Promise<AppleHealthBodyFatHistoryExtentDiagnostic> {
  const now = opts?.nowIso ?? new Date().toISOString();
  const discovery = await discoverOldestBodyFatObservedAt({
    nowIso: () => now,
    pullBodyCompositionSamples,
    ...(opts?.dateOfBirthIso !== undefined
      ? { dateOfBirthIso: opts.dateOfBirthIso }
      : {}),
    ...(opts?.chunkDays !== undefined ? { chunkDays: opts.chunkDays } : {}),
  });

  // Ensure scanStart reflects the approved boundary even when discovery short-circuits.
  const scanStart = resolveBodyFatHistorySearchBoundary({
    nowIso: now,
    ...(opts?.dateOfBirthIso !== undefined
      ? { dateOfBirthIso: opts.dateOfBirthIso }
      : {}),
  });

  return {
    metric: "bodyFat",
    oldestObservedAt: discovery.oldestObservedAt,
    newestObservedAt: discovery.newestObservedAt,
    sampleCountBucket: discovery.sampleCountBucket,
    chunksScanned: discovery.chunksScanned,
    scanStart: discovery.scanStart || scanStart,
    scanEnd: discovery.scanEnd || now,
    status: discovery.status,
    safeErrorCode: discovery.safeErrorCode,
  };
}
