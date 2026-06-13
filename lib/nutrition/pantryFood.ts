/**
 * Mapping between Food Graph search items and user-owned pantry (Kitchen) items.
 * Pure, deterministic, no I/O.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { AddPantryItemRequest, PantryItem } from "@oli/contracts/nutritionPantry";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** True when an id is a canonical Food Graph id (safe to store as `oliFoodId`). */
function asOliFoodId(id: string): string | undefined {
  return id.startsWith("oli:fg:") ? id : undefined;
}

/**
 * Build a "Save to Kitchen" request from a food + the user's chosen default
 * serving multiplier (1 = the catalog serving). Macros are stored per saved
 * serving so quick logging can replay them without re-deriving from per-100g.
 */
export function foodToAddPantryRequest(
  food: NutritionFoodSearchItemDto,
  defaultServings: number,
): AddPantryItemRequest {
  const mult = Number.isFinite(defaultServings) && defaultServings > 0 ? defaultServings : 1;
  const req: AddPantryItemRequest = {
    label: food.name,
    macrosPerServing: {
      caloriesKcal: round2(food.caloriesKcal * mult),
      proteinG: round2(food.proteinG * mult),
      carbsG: round2(food.carbsG * mult),
      fatG: round2(food.fatG * mult),
    },
  };
  const oliFoodId = asOliFoodId(food.id);
  if (oliFoodId !== undefined) req.oliFoodId = oliFoodId;
  if (food.storeId !== undefined) req.storeId = food.storeId;
  if (food.productType !== undefined) req.productType = food.productType;
  if (food.servingLabel) req.servingLabel = food.servingLabel;
  req.defaultServings = mult;
  return req;
}

/**
 * Reconstruct a search-item shape from a saved pantry item for quick logging.
 * The pantry stores macros for the saved serving, so the resulting item logs
 * at multiplier 1 (one saved serving).
 */
export function pantryItemToFood(item: PantryItem): NutritionFoodSearchItemDto {
  const food: NutritionFoodSearchItemDto = {
    id: item.oliFoodId ?? item.id,
    name: item.label,
    servingLabel: item.servingLabel ?? "1 serving",
    caloriesKcal: item.macrosPerServing.caloriesKcal,
    proteinG: item.macrosPerServing.proteinG,
    carbsG: item.macrosPerServing.carbsG,
    fatG: item.macrosPerServing.fatG,
  };
  if (item.productType !== undefined) food.productType = item.productType;
  if (item.storeId !== undefined) food.storeId = item.storeId;
  return food;
}
