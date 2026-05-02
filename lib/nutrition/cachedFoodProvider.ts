import type { FoodDetail, FoodProviderClient, FoodSearchResult } from "@/lib/nutrition/FoodProviderClient";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";
import type { FoodCache } from "@/lib/nutrition/FoodCache";

function normQuery(q: string): string {
  return q.trim().toLowerCase();
}

/**
 * Decorates a {@link FoodProviderClient} with {@link FoodCache} reads (write-through on miss).
 */
export function createCachedFoodProvider(inner: FoodProviderClient, cache: FoodCache): FoodProviderClient {
  return {
    async searchFoods(query: string): Promise<FoodSearchResult[]> {
      const key = normQuery(query);
      const hit = cache.getSearch<FoodSearchResult[]>(key);
      if (hit) return hit;
      const fresh = await inner.searchFoods(query);
      cache.setSearch(key, fresh);
      return fresh;
    },

    async getFoodById(id: string): Promise<FoodDetail> {
      const hit = cache.getById<FoodDetail>(id);
      if (hit) return hit;
      try {
        const fresh = await inner.getFoodById(id);
        cache.setById(id, fresh);
        return fresh;
      } catch (e) {
        if (e instanceof FoodProviderNotFoundError) throw e;
        throw e;
      }
    },

    async getFoodByBarcode(barcode: string): Promise<FoodDetail | null> {
      const hit = cache.getBarcode<FoodDetail>(barcode);
      if (hit) return hit;
      const fresh = await inner.getFoodByBarcode(barcode);
      if (fresh) cache.setBarcode(barcode, fresh);
      return fresh;
    },
  };
}
