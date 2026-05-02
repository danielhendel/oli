import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
export type DevFoodCatalogItem = NutritionFoodSearchItemDto;
/**
 * Deterministic substring search over the dev catalog (no network; stable for tests).
 */
export declare function searchDevFoodCatalog(query: string, limit?: number): DevFoodCatalogItem[];
export declare function getDevFoodById(id: string): DevFoodCatalogItem | null;
export declare function getDevFoodByBarcode(barcode: string): DevFoodCatalogItem | null;
