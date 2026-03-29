// lib/data/nutrition/buildNutritionMealBuilderTotals.ts
/** Local-only meal row (no server meal entity). */
export type MealFoodRow = {
  id: string;
  label: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
};

export type MealDraftTotals = {
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Sum of explicit fiber entries only (empty row cells contribute 0). */
  fiberG: number;
};

function finiteNonNeg(s: string): number {
  const t = s.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n;
}

/**
 * Sums macro strings across meal rows. Invalid numbers in any row → not ok.
 */
export function buildNutritionMealBuilderTotals(
  rows: readonly MealFoodRow[],
): { ok: true; totals: MealDraftTotals; isEmpty: boolean } | { ok: false; error: string } {
  let totalKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;

  for (const row of rows) {
    const k = finiteNonNeg(row.calories);
    const p = finiteNonNeg(row.proteinG);
    const c = finiteNonNeg(row.carbsG);
    const f = finiteNonNeg(row.fatG);
    const fb = finiteNonNeg(row.fiberG);
    if ([k, p, c, f, fb].some((x) => Number.isNaN(x))) {
      return { ok: false, error: "Use valid numbers for each item." };
    }
    totalKcal += k;
    proteinG += p;
    carbsG += c;
    fatG += f;
    fiberG += fb;
  }

  const isEmpty = totalKcal === 0 && proteinG === 0 && carbsG === 0 && fatG === 0 && fiberG === 0;
  return {
    ok: true,
    totals: { totalKcal, proteinG, carbsG, fatG, fiberG },
    isEmpty,
  };
}

export function createEmptyMealFoodRow(id: string): MealFoodRow {
  return {
    id,
    label: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    fiberG: "",
  };
}
