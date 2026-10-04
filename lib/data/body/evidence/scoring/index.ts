/**
 * Body Composition Dual Score engines — pure internal draft domain.
 * Not imported by consumer UI / API / persistence.
 */

export {
  BODY_COMPOSITION_HEALTH_SCORE_VERSION,
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
} from "@oli/contracts";

export { completedUtcYears, adultAgeOk, parseDobUtc, utcYmd } from "./age";
export {
  DAY_MS,
  MAX_SCORE_INPUT_AGE_MS,
  MAX_SCORE_CONSTRUCT_GAP_MS,
  measuredAtReason,
  eraGapMs,
  parseAsOfMs,
  parseMeasuredAtMs,
} from "./recency";
export { piecewiseLinearScore, lerp, clip01 } from "./piecewiseLinear";
export {
  H1_whtr,
  H2_fmi_male,
  H2_fmi_female,
  H3_almi_male,
  H3_almi_female,
  H3_ffmi_male,
  H3_ffmi_female,
  P1_ffmi_male,
  P1_ffmi_female,
  P3_fmi_male,
  P3_fmi_female,
  Health_aggregate,
  PerformanceSupporting_aggregate,
} from "./transforms";
export { scoreHealthComposition } from "./scoreHealthComposition";
export type { ScoreHealthCompositionInput } from "./scoreHealthComposition";
export {
  scorePerformanceSupportingComposition,
  publicReleaseNotAuthorizedReason,
} from "./scorePerformanceSupportingComposition";
export type { ScorePerformanceSupportingCompositionInput } from "./scorePerformanceSupportingComposition";
