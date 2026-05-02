/**
 * Cloud Run–only nutrition food provider configuration (never exposed to mobile).
 */

export type NutritionFoodProviderMode = "dev" | "nutritionix" | "hybrid";

export function getNutritionFoodProviderMode(): NutritionFoodProviderMode {
  const raw = process.env.NUTRITION_FOOD_PROVIDER?.trim().toLowerCase();
  if (raw === "nutritionix" || raw === "hybrid" || raw === "dev") return raw;
  return "dev";
}

export type NutritionixCredentials = {
  appId: string;
  appKey: string;
  remoteUserId: string;
};

/** Returns null when Nutritionix is not configured (missing or blank vars). */
export function getNutritionixCredentials(): NutritionixCredentials | null {
  const appId = process.env.NUTRITIONIX_APP_ID?.trim();
  const appKey = process.env.NUTRITIONIX_APP_KEY?.trim();
  const remoteUserId = process.env.NUTRITIONIX_REMOTE_USER_ID?.trim() || "0";
  if (!appId || !appKey) return null;
  return { appId, appKey, remoteUserId };
}
