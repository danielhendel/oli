import type { NutritionStore } from "@oli/contracts/nutritionStore";

/** Static reference store catalog (seeded; no PII). */
const STORES: readonly NutritionStore[] = [
  { id: "stop_and_shop", name: "Stop & Shop", shortName: "Stop & Shop", schemaVersion: 1 },
  { id: "aldi", name: "Aldi", shortName: "Aldi", schemaVersion: 1 },
  { id: "costco", name: "Costco", shortName: "Costco", schemaVersion: 1 },
  { id: "whole_foods", name: "Whole Foods Market", shortName: "Whole Foods", schemaVersion: 1 },
  { id: "vitamin_shoppe", name: "Vitamin Shoppe", shortName: "Vitamin Shoppe", schemaVersion: 1 },
  { id: "oli_pantry", name: "Oli Pantry", shortName: "Oli Pantry", schemaVersion: 1 },
] as const;

export function listNutritionStores(): NutritionStore[] {
  return [...STORES];
}

export function getNutritionStoreById(storeId: string): NutritionStore | null {
  const id = storeId.trim();
  return STORES.find((s) => s.id === id) ?? null;
}
