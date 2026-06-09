import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

export type DevFoodCatalogItem = NutritionFoodSearchItemDto;

const CATALOG: readonly DevFoodCatalogItem[] = [
  {
    id: "dev_oats_40g",
    name: "Rolled oats",
    brand: "Oli Pantry",
    servingLabel: "40 g dry",
    caloriesKcal: 150,
    proteinG: 5,
    carbsG: 27,
    fatG: 3,
    fiberG: 4,
    sugarG: 1,
    sodiumMg: 0,
    barcode: "0085000427483",
    productType: "food",
    storeId: "oli_pantry",
  },
  {
    id: "dev_greek_yogurt_170g",
    name: "Greek yogurt plain",
    brand: "Oli Pantry",
    servingLabel: "170 g",
    caloriesKcal: 100,
    proteinG: 17,
    carbsG: 6,
    fatG: 0,
    sugarG: 4,
    sodiumMg: 65,
    barcode: "0085000427484",
    productType: "food",
    storeId: "oli_pantry",
  },
  {
    id: "dev_chicken_breast_100g",
    name: "Chicken breast grilled",
    brand: "Oli Pantry",
    servingLabel: "100 g",
    caloriesKcal: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    sodiumMg: 74,
    barcode: "0850040999123",
    productType: "food",
    storeId: "oli_pantry",
  },
  {
    id: "dev_banana_medium",
    name: "Banana",
    brand: "",
    servingLabel: "1 medium (118 g)",
    caloriesKcal: 105,
    proteinG: 1.3,
    carbsG: 27,
    fatG: 0.4,
    fiberG: 3.1,
    sugarG: 14,
    sodiumMg: 1,
    productType: "food",
  },
  {
    id: "dev_stop_shop_eggs_12",
    name: "Large eggs",
    brand: "Stop & Shop",
    servingLabel: "2 large eggs",
    caloriesKcal: 140,
    proteinG: 12,
    carbsG: 1,
    fatG: 10,
    sodiumMg: 140,
    barcode: "0085000427501",
    productType: "food",
    storeId: "stop_and_shop",
  },
  {
    id: "dev_aldi_rice_1cup",
    name: "Long grain white rice",
    brand: "Aldi",
    servingLabel: "1 cup cooked",
    caloriesKcal: 205,
    proteinG: 4,
    carbsG: 45,
    fatG: 0.4,
    sodiumMg: 2,
    barcode: "0085000427502",
    productType: "food",
    storeId: "aldi",
  },
  {
    id: "dev_costco_rotisserie",
    name: "Rotisserie chicken",
    brand: "Costco",
    servingLabel: "4 oz (113 g)",
    caloriesKcal: 190,
    proteinG: 29,
    carbsG: 0,
    fatG: 7,
    sodiumMg: 520,
    barcode: "0085000427503",
    productType: "food",
    storeId: "costco",
  },
  {
    id: "dev_whole_foods_salmon",
    name: "Wild Atlantic salmon",
    brand: "Whole Foods Market",
    servingLabel: "4 oz (113 g)",
    caloriesKcal: 206,
    proteinG: 23,
    carbsG: 0,
    fatG: 12,
    sodiumMg: 59,
    barcode: "0085000427504",
    productType: "food",
    storeId: "whole_foods",
  },
  {
    id: "dev_on_whey_1scoop",
    name: "Gold Standard 100% Whey",
    brand: "Optimum Nutrition",
    servingLabel: "1 scoop (30 g)",
    caloriesKcal: 120,
    proteinG: 24,
    carbsG: 3,
    fatG: 1.5,
    sodiumMg: 130,
    barcode: "0085000427505",
    productType: "supplement",
    storeId: "vitamin_shoppe",
  },
  {
    id: "dev_vs_multivitamin",
    name: "Daily multivitamin",
    brand: "Vitamin Shoppe",
    servingLabel: "1 tablet",
    caloriesKcal: 5,
    proteinG: 0,
    carbsG: 1,
    fatG: 0,
    sodiumMg: 0,
    barcode: "0085000427506",
    productType: "supplement",
    storeId: "vitamin_shoppe",
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Deterministic substring search over the dev catalog (no network; stable for tests).
 */
export function searchDevFoodCatalog(query: string, limit = 40): DevFoodCatalogItem[] {
  const q = norm(query);
  if (q.length === 0) {
    return [...CATALOG].slice(0, Math.min(limit, CATALOG.length));
  }
  const out: DevFoodCatalogItem[] = [];
  for (const item of CATALOG) {
    const hay = `${item.name} ${item.brand ?? ""} ${item.servingLabel}`.toLowerCase();
    if (hay.includes(q)) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function getDevFoodById(id: string): DevFoodCatalogItem | null {
  const t = id.trim();
  for (const item of CATALOG) {
    if (item.id === t) return item;
  }
  return null;
}

export function getDevFoodByBarcode(barcode: string): DevFoodCatalogItem | null {
  const t = barcode.trim();
  if (!t) return null;
  for (const item of CATALOG) {
    if (item.barcode === t) return item;
  }
  return null;
}
