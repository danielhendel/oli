import { createCachedFoodProvider } from "@/lib/nutrition/cachedFoodProvider";
import type { FoodProviderClient } from "@/lib/nutrition/FoodProviderClient";
import { getSharedFoodCache } from "@/lib/nutrition/FoodCache";
import { createDevFoodProvider } from "@/lib/nutrition/providers/DevFoodProvider";

export type GetIdTokenFn = (forceRefresh?: boolean) => Promise<string | null>;

/**
 * Cached Dev gateway provider — single process-wide cache instance.
 */
export function createDefaultFoodProvider(getIdToken: GetIdTokenFn): FoodProviderClient {
  const inner = createDevFoodProvider({ getIdToken });
  return createCachedFoodProvider(inner, getSharedFoodCache());
}
