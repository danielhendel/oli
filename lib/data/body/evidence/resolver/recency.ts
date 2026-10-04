/**
 * Recency metadata for the Evidence Resolver.
 * Exact half-lives and freshness scores are OPEN — do not invent them.
 */

import type {
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverRecencyMetadata,
} from "@oli/contracts";

const MS_PER_DAY = 86_400_000;

export function parseAsOfMs(asOf: string): number | null {
  const ms = Date.parse(asOf);
  return Number.isFinite(ms) ? ms : null;
}

export function parseMeasuredAtMs(measuredAt: string): number | null {
  if (!measuredAt?.trim()) return null;
  const ms = Date.parse(measuredAt);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * UTC day keys are intentionally NOT used for same-day DXA precedence in
 * body_composition_resolver_draft_v1 — measurement-day boundary is unfrozen.
 * Do not reintroduce utcDayKey into active selection without a day-boundary ADR.
 */

export function ageDays(measuredAtMs: number, asOfMs: number): number {
  return Math.max(0, (asOfMs - measuredAtMs) / MS_PER_DAY);
}

export function buildRecencyMetadata(args: {
  primaryObservation: BodyCompositionEvidenceObservation | null;
  asOfMs: number;
  datedPrimaryCount: number;
  undatedCandidateCount: number;
  futureExcludedCount: number;
}): BodyCompositionResolverRecencyMetadata {
  const primary = args.primaryObservation;
  if (!primary) {
    return {
      recencyPolicyState: "threshold_not_frozen",
      primaryAgeDays: null,
      primaryRecencyClass: null,
      datedPrimaryCount: args.datedPrimaryCount,
      undatedCandidateCount: args.undatedCandidateCount,
      futureExcludedCount: args.futureExcludedCount,
    };
  }
  const measuredMs = parseMeasuredAtMs(primary.measuredAt);
  if (measuredMs == null) {
    return {
      recencyPolicyState: "undated",
      primaryAgeDays: null,
      primaryRecencyClass: primary.recencyClass,
      datedPrimaryCount: args.datedPrimaryCount,
      undatedCandidateCount: args.undatedCandidateCount,
      futureExcludedCount: args.futureExcludedCount,
    };
  }
  if (measuredMs > args.asOfMs) {
    return {
      recencyPolicyState: "future_invalid",
      primaryAgeDays: null,
      primaryRecencyClass: primary.recencyClass,
      datedPrimaryCount: args.datedPrimaryCount,
      undatedCandidateCount: args.undatedCandidateCount,
      futureExcludedCount: args.futureExcludedCount,
    };
  }
  return {
    // Exact current/aging/historical thresholds are not frozen in repository truth.
    recencyPolicyState: "threshold_not_frozen",
    primaryAgeDays: ageDays(measuredMs, args.asOfMs),
    primaryRecencyClass: primary.recencyClass,
    datedPrimaryCount: args.datedPrimaryCount,
    undatedCandidateCount: args.undatedCandidateCount,
    futureExcludedCount: args.futureExcludedCount,
  };
}
