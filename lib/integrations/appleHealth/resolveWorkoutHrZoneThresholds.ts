/**
 * Workout Physiology v1 — Heart-rate zone threshold resolver.
 *
 * SINGLE SOURCE OF TRUTH for which thresholds produce `heartRateZoneMinutes`
 * + `heartRateZoneBasis`. No other module may hardcode zone cutoffs.
 *
 * Phase B ships `default_thresholds_v1` only:
 * - Population defaults; not personalized.
 * - `userMaxHrBpm` is null (no personalized max-HR is stored on the user profile yet —
 *   see `lib/contracts/userProfileMain.ts`).
 *
 * Future personalized models (e.g. user max-HR, lab test thresholds, %HR-reserve)
 * will be introduced behind this resolver WITHOUT schema changes:
 * - Add a new `modelVersion` value in `WorkoutHrZoneBasisModelVersion`.
 * - Return new thresholds + populate `userMaxHrBpm` from profile/test data.
 * - Schema enum `default_thresholds_v1` extends additively; legacy stamps remain valid.
 */

/**
 * Accepted modelVersion values. Phase B = `default_thresholds_v1` only.
 * New versions are added here; the raw + canonical zod schemas accept the same enum.
 */
export type WorkoutHrZoneBasisModelVersion = "default_thresholds_v1";

/**
 * Default heart-rate zone cutoffs (BPM) used by `default_thresholds_v1`.
 *
 * Zones:
 * - z1 < 110 (Recovery)
 * - z2 110..129 (Aerobic base)
 * - z3 130..149 (Tempo)
 * - z4 150..169 (Threshold)
 * - z5 >= 170 (VO2 max / Anaerobic)
 *
 * The tuple stores the four ascending cutoffs that separate z1/z2, z2/z3, z3/z4, z4/z5.
 * Exported as a readonly tuple so callers cannot mutate the constant.
 */
export const DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM: readonly [number, number, number, number] = [
  110,
  130,
  150,
  170,
] as const;

/** Identifier used by raw + canonical schemas; centralized to avoid typos. */
export const WORKOUT_HR_ZONE_BASIS_MODEL_VERSION_V1: WorkoutHrZoneBasisModelVersion =
  "default_thresholds_v1";

export type WorkoutHrZoneThresholdsResolution = {
  modelVersion: WorkoutHrZoneBasisModelVersion;
  thresholdsBpm: readonly [number, number, number, number];
  /** Null when no personalized max-HR is available (Phase B baseline). */
  userMaxHrBpm: number | null;
};

/**
 * Resolve the active HR zone thresholds for a workout enrichment pass.
 *
 * Phase B: always returns `default_thresholds_v1` with `userMaxHrBpm: null`.
 * Future phases will accept profile inputs (DOB, sex-at-birth, lab tests) and
 * return personalized thresholds without changing the call signature shape.
 *
 * @param _context — reserved for future personalization inputs; ignored in Phase B.
 */
export function resolveWorkoutHrZoneThresholds(
  context?: { userId?: string } | undefined,
): WorkoutHrZoneThresholdsResolution {
  // Phase B: `context` is intentionally unused; future personalized models will
  // resolve thresholds from profile state passed via this argument.
  void context;
  return {
    modelVersion: WORKOUT_HR_ZONE_BASIS_MODEL_VERSION_V1,
    thresholdsBpm: DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM,
    userMaxHrBpm: null,
  };
}

/**
 * Classify a single HR sample value into zone index 0..4 using the resolved thresholds.
 *
 * Rules:
 * - value < thresholds[0]  → zone 0 (z1)
 * - value < thresholds[1]  → zone 1 (z2)
 * - value < thresholds[2]  → zone 2 (z3)
 * - value < thresholds[3]  → zone 3 (z4)
 * - value ≥ thresholds[3]  → zone 4 (z5)
 *
 * Returns `null` for non-finite or non-positive values so callers can skip
 * malformed samples without inventing a zone.
 */
export function classifyHrSampleToZoneIndex(
  bpm: number,
  thresholdsBpm: readonly [number, number, number, number],
): 0 | 1 | 2 | 3 | 4 | null {
  if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm <= 0) return null;
  if (bpm < thresholdsBpm[0]) return 0;
  if (bpm < thresholdsBpm[1]) return 1;
  if (bpm < thresholdsBpm[2]) return 2;
  if (bpm < thresholdsBpm[3]) return 3;
  return 4;
}
