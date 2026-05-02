import type {
  NutritionFoodDetailResponseDto,
  NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";

/** Alias types for provider abstraction (maps to API DTOs). */
export type FoodSearchResult = NutritionFoodSearchItemDto & { foodHash?: string };
export type FoodDetail = NutritionFoodDetailResponseDto & { foodHash?: string };

export class FoodProviderNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(readonly resource: "food" | "barcode", readonly id: string) {
    super(`FoodProviderNotFound: ${resource} ${id}`);
    this.name = "FoodProviderNotFoundError";
  }
}

/**
 * Pluggable food catalog/search (dev catalog today; Nutritionix/USDA proxy tomorrow).
 */
export interface FoodProviderClient {
  searchFoods(query: string): Promise<FoodSearchResult[]>;

  /** Throws {@link FoodProviderNotFoundError} when unknown id. */
  getFoodById(id: string): Promise<FoodDetail>;

  /** Null when barcode unknown. */
  getFoodByBarcode(barcode: string): Promise<FoodDetail | null>;
}
