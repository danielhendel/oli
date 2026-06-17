// lib/nutrition/composedMealNutritionPayload.ts
/**
 * Builds a meal-scoped {@link ManualNutritionPayload} for a composed meal-builder meal
 * ("Add meal to day"). One RawEvent carries the meal's combined totals — it mirrors the
 * per-food tracked-meal payload shape (see trackedMealNutritionPayload.ts) so DailyFacts
 * aggregation treats it identically to any other meal-scoped nutrition event.
 *
 * No I/O, no Firebase. Vendor blobs (here: a small builder marker) stay in providerResponse only.
 */
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { DayKey } from "@/lib/ui/calendar/types";
import { computeFoodHash } from "@/lib/nutrition/normalizeFoodName";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ComposedMealTotals = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export type BuildComposedMealNutritionPayloadInput = {
  dayKey: DayKey;
  timeZone: string;
  /** ISO instant when the meal was logged (meal anchor). */
  observedAtIso: string;
  name: string;
  totals: ComposedMealTotals;
  itemCount: number;
};

function mealWindowIso(observedAtIso: string): { start: string; end: string } {
  const t = Date.parse(observedAtIso);
  if (Number.isNaN(t)) {
    const now = new Date().toISOString();
    return { start: now, end: new Date(Date.parse(now) + 1000).toISOString() };
  }
  return { start: observedAtIso, end: new Date(t + 1000).toISOString() };
}

export function buildComposedMealNutritionPayload(
  input: BuildComposedMealNutritionPayloadInput,
): ManualNutritionPayload {
  const { start, end } = mealWindowIso(input.observedAtIso);
  const label = input.name.trim() || "Meal";
  const payload: ManualNutritionPayload = {
    start,
    end,
    timezone: input.timeZone,
    day: input.dayKey,
    totalKcal: round2(input.totals.caloriesKcal),
    proteinG: round2(input.totals.proteinG),
    carbsG: round2(input.totals.carbsG),
    fatG: round2(input.totals.fatG),
    logScope: "meal",
    nutritionIngestSource: "manual",
    foodLabel: label,
    foodHash: computeFoodHash({ name: label, brand: null, externalFoodId: `meal:${label}` }),
    providerResponse: { provider: "meal_builder", itemCount: input.itemCount },
  };
  if (Number.isFinite(input.totals.fiberG) && input.totals.fiberG > 0) {
    payload.fiberG = round2(input.totals.fiberG);
  }
  return payload;
}
