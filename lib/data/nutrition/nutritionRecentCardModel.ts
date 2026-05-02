import type { NutritionRecentMealRow } from "./nutritionRecentMealsFromRaw";

export type { NutritionRecentMealRow } from "./nutritionRecentMealsFromRaw";
export { buildNutritionRecentMealRowsFromRaw } from "./nutritionRecentMealsFromRaw";

/** Recent meals on Nutrition overview — derived from raw nutrition events with payloads for the selected day. */
export type NutritionRecentCardModel = {
  rows: readonly NutritionRecentMealRow[];
};
