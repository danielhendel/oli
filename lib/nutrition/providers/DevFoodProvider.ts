import {
  getNutritionFoodByBarcode,
  getNutritionFoodDetail,
  searchNutritionFoods,
} from "@/lib/api/usersMe";
import {
  type FoodDetail,
  type FoodProviderClient,
  FoodProviderNotFoundError,
  type FoodSearchResult,
} from "@/lib/nutrition/FoodProviderClient";
import { computeFoodHash } from "@/lib/nutrition/normalizeFoodName";
import type {
  NutritionFoodDetailResponseDto,
  NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";

function annotateSearch(row: NutritionFoodSearchItemDto): FoodSearchResult {
  return {
    ...row,
    foodHash: computeFoodHash({
      name: row.name,
      brand: row.brand ?? null,
      externalFoodId: row.id,
    }),
  };
}

function annotateDetail(row: NutritionFoodDetailResponseDto): FoodDetail {
  return {
    ...row,
    foodHash: computeFoodHash({
      name: row.name,
      brand: row.brand ?? null,
      externalFoodId: row.id,
    }),
  };
}

export type DevFoodProviderArgs = {
  getIdToken: () => Promise<string | null>;
};

/**
 * Gateway-backed dev catalog (`GET /users/me/nutrition/*`).
 */
export function createDevFoodProvider(args: DevFoodProviderArgs): FoodProviderClient {
  const tokenOrThrow = async (): Promise<string> => {
    const t = await args.getIdToken();
    if (!t) throw new Error("Not signed in");
    return t;
  };

  return {
    async searchFoods(query: string): Promise<FoodSearchResult[]> {
      const token = await tokenOrThrow();
      const res = await searchNutritionFoods(query, token);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Food search is not available in this build.");
        }
        throw new Error(res.error);
      }
      return res.json.items.map((r) => annotateSearch(r));
    },

    async getFoodById(id: string): Promise<FoodDetail> {
      const token = await tokenOrThrow();
      const res = await getNutritionFoodDetail(id, token);
      if (!res.ok) {
        if (res.status === 404) throw new FoodProviderNotFoundError("food", id);
        throw new Error(res.error);
      }
      return annotateDetail(res.json);
    },

    async getFoodByBarcode(barcode: string): Promise<FoodDetail | null> {
      const token = await tokenOrThrow();
      const res = await getNutritionFoodByBarcode(barcode, token);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(res.error);
      }
      return annotateDetail(res.json);
    },
  };
}
