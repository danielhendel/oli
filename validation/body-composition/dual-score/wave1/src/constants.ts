/**
 * Wave 1 frozen constants (plan §23). Validation-only. No PHI.
 */

export const SCHEMA_VERSION = "body_composition_dual_score_wave1_manifest_v1" as const;
export const PHI_STATUS = "synthetic_no_phi" as const;

export const HEALTH_ENGINE_VERSION = "body_composition_health_score_draft_v1" as const;
export const PERF_ENGINE_VERSION =
  "body_composition_performance_supporting_score_draft_v1" as const;

export const IMPLEMENTATION_SHA = "d940b1616b341e98b19e82f2cd6a6242dfe41691" as const;
export const MATHEMATICAL_FREEZE_SHA = "e258267d109d1d05e20270f205e5fdb29ae2aca6" as const;
export const VALIDATION_PLAN_SHA = "4900f6e56f1eb83799513452cc4b5d2dcc20601d" as const;

export const AS_OF = "2026-10-04T12:00:00.000Z" as const;
export const AS_OF_MS = Date.parse(AS_OF);
export const AS_OF_YEAR = 2026 as const;
export const AS_OF_MONTH_DAY = "10-04" as const;
export const DAY_MS = 86_400_000 as const;

export const CANONICAL_SEED = 20261004 as const;

export const EPS_NUM = 1e-9 as const;
export const EPS_SURF = 1e-4 as const;
export const EPS_CM = 1e-3 as const;

export type Sex = "male" | "female";
export const SEXES: readonly Sex[] = ["male", "female"] as const;

/** Frozen stream codes (§23.2.1). */
export const STREAM_CODES = {
  "BCV-001": 1,
  "BCV-002": 2,
  "BCV-006": 6,
  "BCV-007": 7,
  "BCV-012": 12,
  "BCV-013": 13,
  "BCV-014": 14,
  "BCV-015": 15,
  "BCV-016": 16,
  "BCV-017": 17,
  "BCV-018": 18,
  "BCV-029": 29,
  "BCV-030": 30,
  "BCV-031": 31,
  "BCV-032A": 3201,
  "BCV-034": 34,
} as const;

export type ProtocolId = keyof typeof STREAM_CODES;

/** Wave 1 membership: exactly 16 protocols (§23.0). */
export const WAVE1_PROTOCOL_IDS = Object.keys(STREAM_CODES) as ProtocolId[];

export type InterpretationClass =
  | "structural_invariant"
  | "exploratory"
  | "evidence_dependent_acceptance";

export const INTERPRETATION_CLASSES: readonly InterpretationClass[] = [
  "structural_invariant",
  "exploratory",
  "evidence_dependent_acceptance",
] as const;

export const PARAMETER_SOURCE_TYPES = [
  "mathematical_freeze",
  "validation_plan",
  "evidence_review",
  "synthetic_fallback",
] as const;
export type ParameterSourceType = (typeof PARAMETER_SOURCE_TYPES)[number];

/** §23.6 fallback noise parameters (exploratory_normalized_not_empirical). */
export const SIGMA_STAR = {
  waistCm: 1.0,
  heightCm: 0.5,
  fmKg: 0.25,
  ffmKg: 0.25,
  almKg: 0.2,
} as const;

export const SIGMA_MULTIPLIERS = [0.5, 1, 1.5, 2] as const;
export const RHO_GRID = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75] as const;
export const PARAMETER_LABEL = "exploratory_normalized_not_empirical" as const;

/** §23.17.1 frozen weights. */
export const HEALTH_WEIGHTS = { H1: 0.45, H2: 0.35, H3: 0.2 } as const;
export const PERF_WEIGHTS = { P1: 0.5, P3: 0.5 } as const;

/** §23.3 Monte Carlo protocol (also the manifest `monteCarloProtocol` object). */
export const MC_PROTOCOL = {
  minimumDraws: 100000,
  maximumDraws: 1000000,
  checkpointEvery: 10000,
  batchCount: 20,
  requiredConsecutivePasses: 2,
  medianDeltaTolerance: 0.01,
  p95DeltaTolerance: 0.02,
  medianSeTolerance: 0.02,
  p95SeTolerance: 0.05,
  rateDeltaTolerance: 0.001,
  rateSeTolerance: 0.001,
  quantileEstimator: "hyndman_fan_type_7",
  batchSd: "sample_n_minus_1",
  prng: "mulberry32",
  gaussianTransform: "marsaglia_polar",
} as const;

export const THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** §23.5 synthetic computational domains. */
export const DOMAINS = {
  whtr: { male: [0.3, 0.95], female: [0.3, 0.95], range: 0.65 },
  fmi: { male: [0.5, 25.0], female: [1.0, 30.0], range: { male: 24.5, female: 29.0 } },
  almi: { male: [4.0, 12.0], female: [3.0, 10.0], range: { male: 8.0, female: 7.0 } },
  ffmi: { male: [14.0, 24.0], female: [12.0, 21.0], range: { male: 10.0, female: 9.0 } },
  heightCm: { both: [140.0, 210.0], range: 70.0 },
  waistCm: { both: [50.0, 160.0], range: 110.0 },
} as const;

/** §23.5.4 companion reference anchors. */
export const REFERENCE_ANCHORS: Record<
  Sex,
  { whtr: number; fmi: number; almi: number; ffmi: number }
> = {
  male: { whtr: 0.5, fmi: 5.5, almi: 8.0, ffmi: 19.0 },
  female: { whtr: 0.5, fmi: 8.5, almi: 6.3, ffmi: 16.5 },
};

/** §23.12.1 sex-matched structural anchors (adds height / waist). */
export const STRUCTURAL_ANCHORS: Record<
  Sex,
  { heightCm: number; waistCm: number; whtr: number; fmi: number; almi: number; ffmi: number }
> = {
  male: { heightCm: 175, waistCm: 87.5, whtr: 0.5, fmi: 5.5, almi: 8.0, ffmi: 19.0 },
  female: { heightCm: 165, waistCm: 82.5, whtr: 0.5, fmi: 8.5, almi: 6.3, ffmi: 16.5 },
};

export type ProtocolDomainVar = "whtr" | "fmi" | "almi" | "ffmi";

/** Output precision for CSV only (JSON retains IEEE-754 doubles). */
export const CSV_FLOAT_DIGITS = 12;
