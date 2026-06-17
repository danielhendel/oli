/**
 * Static visualization goals for nutrition macro progress.
 *
 * These are placeholder reference targets used only to render progress bars and
 * percentages until persisted user targets exist (see `app/(app)/nutrition/targets.tsx`).
 * DailyFacts remains the single source of truth for actuals — these never affect the rollup.
 */
export const NUTRITION_KCAL_GOAL = 2000;
export const NUTRITION_PROTEIN_G_GOAL = 150;
export const NUTRITION_CARBS_G_GOAL = 250;
export const NUTRITION_FAT_G_GOAL = 65;

export type NutritionMacroKey = "protein" | "carbs" | "fat";

export const NUTRITION_MACRO_TARGET_G: Record<NutritionMacroKey, number> = {
  protein: NUTRITION_PROTEIN_G_GOAL,
  carbs: NUTRITION_CARBS_G_GOAL,
  fat: NUTRITION_FAT_G_GOAL,
};

export const NUTRITION_MACRO_LABEL: Record<NutritionMacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export function clamp01(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

export function isFiniteNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Progress fraction (0–1) of a value toward a target. */
export function goalProgress(value: number | null | undefined, target: number): number {
  if (!isFiniteNonNegative(value) || !(target > 0)) return 0;
  return clamp01(value / target);
}

/** Whole-percent label vs target, e.g. "19%". Returns "—" when no value. */
export function goalPercentLabel(value: number | null | undefined, target: number): string {
  if (!isFiniteNonNegative(value) || !(target > 0)) return "—";
  return `${Math.round((value / target) * 100)}%`;
}

/** "43 / 250 g" style label. Rounds the current value; target shown as-is. */
export function amountOfTargetLabel(
  value: number | null | undefined,
  target: number,
  unit: string,
): string {
  const current = isFiniteNonNegative(value) ? Math.round(value).toLocaleString() : "—";
  const suffix = unit.length > 0 ? ` ${unit}` : "";
  return `${current} / ${target.toLocaleString()}${suffix}`;
}
