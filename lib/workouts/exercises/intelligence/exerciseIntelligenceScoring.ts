/**
 * Canonical scoring rules for ExerciseIntelligenceV1 (Core 50 audit).
 * Pure functions — no IO, no React.
 *
 * ## Stimulus
 * - Regional weights are each in [0, 1].
 * - Active regions should sum to ~1.0 (≤ 1.0 enforced at validation).
 *
 * ## Stimulus-to-fatigue ratio (SFR)
 * - rawSfr = stimulusSum / fatigue
 * - stimulusToFatigueRatio = min(1, rawSfr / SFR_RAW_RATIO_NORMALIZER)
 * - SFR_RAW_RATIO_NORMALIZER = max rawSfr across bundled Core rows (≈4.545 when min fatigue is 0.22).
 *
 * ## Fatigue vs recoveryDemand
 * - recoveryDemand is a spacing index in [0, 1].
 * - Expected: recoveryDemand ≤ fatigue (recovery index never exceeds set fatigue cost).
 * - Expected: recoveryDemand ≥ fatigue × 0.7 when fatigue ≥ 0.3.
 *
 * ## Requirements & hypertrophy
 * - skill / mobility / stability / loadedStretch / hypertrophyPotential / program fields ∈ [0, 1].
 * - hypertrophyPotential ≥ loadedStretch − 0.2 (allow small divergence for mobility/isometric work).
 *
 * ## Compounds vs isolations
 * - Mean compound fatigue > mean isolation fatigue in Core 50.
 * - No isolation should exceed the minimum compound fatigue by more than 0.02.
 */

import {
  exerciseIntelligenceStimulusSum,
  type ExerciseIntelligenceV1,
  type RegionalStimulusV1,
} from "./exerciseIntelligenceV1Types";

/** Normalizer so the highest raw SFR in Core 50 maps to 1.0. */
export const SFR_RAW_RATIO_NORMALIZER = 4.545454545454546;

export const SFR_TOLERANCE = 0.001;

/** Compounds: multi-joint primary lifts and rows/presses/squats/hinges in Core 50. */
export const CORE_COMPOUND_EXERCISE_IDS: ReadonlySet<string> = new Set([
  "bench_press",
  "incline_bench_press",
  "dumbbell_bench_press",
  "machine_chest_press",
  "decline_bench_press",
  "dumbbell_incline_bench_press",
  "push_up",
  "close_grip_bench_press",
  "dip",
  "lat_pulldown",
  "pull_up",
  "seated_cable_row",
  "barbell_row",
  "dumbbell_row",
  "chin_up",
  "overhead_press",
  "dumbbell_shoulder_press",
  "squat",
  "leg_press",
  "front_squat",
  "hack_squat",
  "bulgarian_split_squat_barbell",
  "romanian_deadlift",
  "stiff_leg_deadlift",
  "good_morning",
  "hip_thrust",
  "sumo_deadlift",
  "reverse_lunge_barbell",
  "smith_machine_incline_bench",
  "pendlay_row",
  "rack_pull",
  "single_arm_dumbbell_row",
  "machine_row",
  "cable_row_straight_bar",
  "neutral_grip_pull_up",
  "wide_grip_pull_up",
  "pause_squat",
  "box_squat",
  "safety_bar_squat",
  "barbell_lunge",
  "dumbbell_lunge",
  "deadlift",
  "deficit_deadlift",
  "jm_press",
  "dumbbell_decline_bench_press",
  "machine_incline_chest_press",
  "machine_decline_chest_press",
  "dumbbell_romanian_deadlift",
  "dumbbell_hip_thrust",
  "diamond_push_up",
]);

export function computeRawStimulusToFatigueRatio(
  stimulus: RegionalStimulusV1,
  fatigue: number,
): number {
  if (!Number.isFinite(fatigue) || fatigue <= 0) return 0;
  return exerciseIntelligenceStimulusSum(stimulus) / fatigue;
}

/** Normalized SFR stored on ExerciseIntelligenceV1 (0–1). */
export function computeStimulusToFatigueRatio(
  stimulus: RegionalStimulusV1,
  fatigue: number,
): number {
  const raw = computeRawStimulusToFatigueRatio(stimulus, fatigue);
  return Math.min(1, raw / SFR_RAW_RATIO_NORMALIZER);
}

export function isCoreCompoundExerciseId(exerciseId: string): boolean {
  return CORE_COMPOUND_EXERCISE_IDS.has(exerciseId);
}

export type ScoringConsistencyIssue =
  | { kind: "sfr_mismatch"; exerciseId: string; stored: number; expected: number }
  | { kind: "stimulus_empty"; exerciseId: string }
  | { kind: "stimulus_sum_invalid"; exerciseId: string; sum: number }
  | { kind: "recovery_exceeds_fatigue"; exerciseId: string; recoveryDemand: number; fatigue: number }
  | { kind: "hypertrophy_below_stretch"; exerciseId: string; hypertrophyPotential: number; loadedStretch: number }
  | { kind: "score_out_of_range"; exerciseId: string; field: string; value: number };

const SCORE_FIELDS: (keyof ExerciseIntelligenceV1)[] = [
  "fatigue",
  "recoveryDemand",
  "stimulusToFatigueRatio",
  "skillRequirement",
  "mobilityRequirement",
  "stabilityRequirement",
  "loadedStretch",
  "hypertrophyPotential",
  "frequencySuitability",
  "progressionPotential",
];

/** Audit a single row against Core 50 scoring rules. */
export function auditExerciseIntelligenceScoring(row: ExerciseIntelligenceV1): ScoringConsistencyIssue[] {
  const issues: ScoringConsistencyIssue[] = [];
  const stimulusSum = exerciseIntelligenceStimulusSum(row.stimulus);

  if (stimulusSum <= 0) {
    issues.push({ kind: "stimulus_empty", exerciseId: row.exerciseId });
  }
  if (stimulusSum > 1 + 1e-9) {
    issues.push({ kind: "stimulus_sum_invalid", exerciseId: row.exerciseId, sum: stimulusSum });
  }

  const expectedSfr = computeStimulusToFatigueRatio(row.stimulus, row.fatigue);
  if (Math.abs(row.stimulusToFatigueRatio - expectedSfr) > SFR_TOLERANCE) {
    issues.push({
      kind: "sfr_mismatch",
      exerciseId: row.exerciseId,
      stored: row.stimulusToFatigueRatio,
      expected: expectedSfr,
    });
  }

  if (row.recoveryDemand > row.fatigue + 1e-9) {
    issues.push({
      kind: "recovery_exceeds_fatigue",
      exerciseId: row.exerciseId,
      recoveryDemand: row.recoveryDemand,
      fatigue: row.fatigue,
    });
  }

  if (row.hypertrophyPotential < row.loadedStretch - 0.2 - 1e-9) {
    issues.push({
      kind: "hypertrophy_below_stretch",
      exerciseId: row.exerciseId,
      hypertrophyPotential: row.hypertrophyPotential,
      loadedStretch: row.loadedStretch,
    });
  }

  for (const key of SCORE_FIELDS) {
    const v = row[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
      issues.push({ kind: "score_out_of_range", exerciseId: row.exerciseId, field: key, value: v as number });
    }
  }

  for (const v of Object.values(row.stimulus)) {
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1)) {
      issues.push({ kind: "score_out_of_range", exerciseId: row.exerciseId, field: "stimulus", value: v });
    }
  }

  for (const v of Object.values(row.jointStress)) {
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1)) {
      issues.push({ kind: "score_out_of_range", exerciseId: row.exerciseId, field: "jointStress", value: v });
    }
  }

  return issues;
}

/** Audit all rows against Core scoring rules; returns empty when consistent. */
export function auditExerciseIntelligenceScoringBatch(
  rows: readonly ExerciseIntelligenceV1[],
): ScoringConsistencyIssue[] {
  const issues: ScoringConsistencyIssue[] = [];
  for (const row of rows) {
    issues.push(...auditExerciseIntelligenceScoring(row));
  }
  return issues;
}

export function meanFatigueForRows(
  rows: readonly ExerciseIntelligenceV1[],
  exerciseIds: ReadonlySet<string>,
): number {
  const filtered = rows.filter((r) => exerciseIds.has(r.exerciseId));
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, r) => sum + r.fatigue, 0) / filtered.length;
}

export function minFatigueForRows(
  rows: readonly ExerciseIntelligenceV1[],
  exerciseIds: ReadonlySet<string>,
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    if (!exerciseIds.has(row.exerciseId)) continue;
    if (row.fatigue < min) min = row.fatigue;
  }
  return min;
}

export function maxIsolationFatigue(rows: readonly ExerciseIntelligenceV1[]): number {
  let max = 0;
  for (const row of rows) {
    if (CORE_COMPOUND_EXERCISE_IDS.has(row.exerciseId)) continue;
    if (row.fatigue > max) max = row.fatigue;
  }
  return max;
}
