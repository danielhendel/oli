import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { Meal } from "@oli/contracts/nutritionMeal";
import type { DayKey } from "@/lib/ui/calendar/types";
import { computeFoodHash } from "@/lib/nutrition/normalizeFoodName";
import { trackedMealNutritionIdempotencyKey } from "@/lib/nutrition/trackedMealNutritionPayload";

export type BuildMealNutritionPayloadInput = {
  dayKey: DayKey;
  timeZone: string;
  observedAtIso: string;
  meal: Meal;
  /** Optional override for default meal slot. */
  mealSlot?: Meal["defaultMealSlot"];
};

function mealWindowIso(observedAtIso: string): { start: string; end: string } {
  const t = Date.parse(observedAtIso);
  if (Number.isNaN(t)) {
    const now = new Date().toISOString();
    const endMs = Date.parse(now) + 1000;
    return { start: now, end: new Date(endMs).toISOString() };
  }
  const endMs = t + 1000;
  return { start: observedAtIso, end: new Date(endMs).toISOString() };
}

/**
 * Builds a manual nutrition RawEvent payload from a saved Meal template.
 */
export function buildMealNutritionPayload(input: BuildMealNutritionPayloadInput): ManualNutritionPayload {
  const { start, end } = mealWindowIso(input.observedAtIso);
  const { meal } = input;
  const foodHash = computeFoodHash({ name: meal.name, brand: null, externalFoodId: meal.id });

  const payload: ManualNutritionPayload = {
    start,
    end,
    timezone: input.timeZone,
    day: input.dayKey,
    totalKcal: meal.totals.caloriesKcal,
    proteinG: meal.totals.proteinG,
    carbsG: meal.totals.carbsG,
    fatG: meal.totals.fatG,
    logScope: "meal",
    nutritionIngestSource: "search",
    externalFoodId: meal.id,
    foodLabel: meal.name,
    providerResponse: { source: "saved_meal", mealId: meal.id, itemCount: meal.items.length },
    foodHash,
  };

  const slot = input.mealSlot ?? meal.defaultMealSlot;
  if (slot !== undefined) {
    payload.mealSlot = slot;
  }

  return payload;
}

export { trackedMealNutritionIdempotencyKey as mealNutritionIdempotencyKey };
