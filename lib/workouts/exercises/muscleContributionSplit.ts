import type { MuscleContribution } from "@/lib/workouts/exercises/taxonomy";

/** Tolerance when comparing muscle-split weight sums to 1.0 (100%). */
export const MUSCLE_SPLIT_SUM_EPSILON = 0.005;

export function muscleContributionWeightSum(rows: readonly { weight: number }[]): number {
  let t = 0;
  for (const r of rows) {
    if (Number.isFinite(r.weight) && r.weight >= 0) t += r.weight;
  }
  return t;
}

export function isMuscleSplitTotalUnit(sum: number): boolean {
  return Math.abs(sum - 1) <= MUSCLE_SPLIT_SUM_EPSILON;
}

/**
 * Scales non-negative weights so their sum is 1.0.
 * If every weight is 0 (or sum is 0), assigns equal weight to each row.
 */
export function normalizeMuscleContributionsToUnit(rows: readonly MuscleContribution[]): MuscleContribution[] {
  if (rows.length === 0) return [];
  const cleaned: MuscleContribution[] = rows.map((r) => ({
    ...r,
    weight: Number.isFinite(r.weight) && r.weight >= 0 ? r.weight : 0,
  }));
  const sum = muscleContributionWeightSum(cleaned);
  if (sum > 0) {
    return cleaned.map((r) => ({ ...r, weight: r.weight / sum }));
  }
  const w = 1 / cleaned.length;
  return cleaned.map((r) => ({ ...r, weight: w }));
}
