// lib/data/nutrition/nutritionDayDraftMerge.ts
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";
import type { MealDraftTotals } from "@/lib/data/nutrition/buildNutritionMealBuilderTotals";

function parseDraftAdd(s: string): number {
  const t = s.trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatRequired(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return String(r);
}

function formatFiber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return String(r);
}

/**
 * Adds meal totals to the current day draft (string fields). Used when "Add meal to day" is confirmed.
 */
export function mergeMealTotalsIntoDraftFields(
  draft: NutritionLogFormFields,
  meal: MealDraftTotals,
): NutritionLogFormFields {
  const k = parseDraftAdd(draft.totalKcal) + meal.totalKcal;
  const p = parseDraftAdd(draft.proteinG) + meal.proteinG;
  const c = parseDraftAdd(draft.carbsG) + meal.carbsG;
  const f = parseDraftAdd(draft.fatG) + meal.fatG;
  const prevFiber = parseDraftAdd(draft.fiberG);
  const fiberSum = prevFiber + meal.fiberG;

  return {
    totalKcal: formatRequired(k),
    proteinG: formatRequired(p),
    carbsG: formatRequired(c),
    fatG: formatRequired(f),
    fiberG: formatFiber(fiberSum),
  };
}
