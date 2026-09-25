/**
 * Body Scan → continuous tracking isolation (pure).
 *
 * Stage 3E invariant: a Body Scan is a periodic assessment. Its values must never reach
 * the continuous Weight / Body Fat / Lean Mass surfaces — not as a measurement, not as a
 * fallback, not as a marker, and not as a Low / High / Change input.
 *
 * This module is the single definition of that boundary. Server confirm/ingest paths call
 * `assertBodyScanWriteTargetAllowed` before writing, and CI CHECK 23 greps Body Scans code
 * for the forbidden targets below.
 */

/** Collections Body Scan data is allowed to live in. */
export const BODY_SCAN_ALLOWED_WRITE_COLLECTIONS = [
  "bodyScans",
  "bodyScanDrafts",
  "bodyScanFacts",
] as const;

export type BodyScanAllowedWriteCollection = (typeof BODY_SCAN_ALLOWED_WRITE_COLLECTIONS)[number];

/**
 * Continuous-tracking and derived-truth collections Body Scan data must never be written to.
 * Writing a scan value here would silently merge assessment data into scale trends.
 */
export const BODY_SCAN_FORBIDDEN_WRITE_COLLECTIONS = [
  "rawEvents",
  "events",
  "dailyFacts",
  "insights",
  "intelligenceContext",
  "healthScores",
  "healthSignals",
  "bodyComposition",
  "weights",
] as const;

/** Continuous body metrics that must never receive a scan-sourced value. */
export const BODY_SCAN_FORBIDDEN_TREND_METRICS = ["weight", "bodyFat", "leanTissue"] as const;

export type BodyScanForbiddenTrendMetric = (typeof BODY_SCAN_FORBIDDEN_TREND_METRICS)[number];

export function isBodyScanAllowedWriteCollection(
  collection: string,
): collection is BodyScanAllowedWriteCollection {
  return (BODY_SCAN_ALLOWED_WRITE_COLLECTIONS as readonly string[]).includes(collection);
}

export class BodyScanIsolationViolationError extends Error {
  readonly collection: string;

  constructor(collection: string) {
    super(`BODY_SCAN_ISOLATION_VIOLATION:${collection}`);
    this.name = "BodyScanIsolationViolationError";
    this.collection = collection;
  }
}

/**
 * Fail closed before any Body Scan write. Unknown collections are rejected too — the
 * allowlist has to be widened deliberately, with the isolation argument re-made.
 */
export function assertBodyScanWriteTargetAllowed(collection: string): void {
  if (!isBodyScanAllowedWriteCollection(collection)) {
    throw new BodyScanIsolationViolationError(collection);
  }
}

/**
 * Body Scan values are never a source for continuous trend surfaces.
 * Exposed as a function so call sites read as an explicit policy check, not a constant.
 */
export function bodyScanMayContributeToContinuousTrend(): false {
  return false;
}

/** Drop anything scan-sourced from a continuous body-metric sample set. */
export function excludeBodyScanSourcedSamples<T extends { source?: string | null }>(
  samples: readonly T[],
): T[] {
  return samples.filter((sample) => {
    const source = (sample.source ?? "").toLowerCase();
    return !source.startsWith("body_scan") && !source.startsWith("bodyscan");
  });
}
