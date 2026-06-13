/**
 * Oli Curated Supplement Catalog (Food Graph Foundation, Sprint 1).
 *
 * Supplements live in the Food Graph as `productType: "supplement"` nodes.
 * They differ from foods in that macros are often ~0 and the meaningful signal
 * is the dose + active ingredients (carried in `activeIngredients`). They log
 * through the same nutrition pipeline as foods; dedicated adherence facts are
 * deferred to a later sprint.
 *
 * Source is internal/curated → `attributionRequired: false`.
 */

import type { FoodGraphNodeInput } from "@oli/contracts/nutritionProduct";

const CURATED_VERSION = "oli-supplements-2026-06";

export const SUPPLEMENT_NODES: readonly FoodGraphNodeInput[] = [
  {
    sourceKey: "curated:creatine_monohydrate",
    source: "curated",
    name: "Creatine monohydrate",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    servings: [
      { id: "scoop", label: "1 scoop (5 g)", grams: 5, unit: "scoop", household: "scoop", isDefault: true },
      { id: "g", label: "grams", grams: 1, unit: "g" },
    ],
    defaultServingLabel: "1 scoop (5 g)",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "scoop",
    activeIngredients: [{ name: "Creatine monohydrate", amount: 5000, unit: "mg" }],
  },
  {
    sourceKey: "curated:magnesium_glycinate",
    source: "curated",
    name: "Magnesium glycinate",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    servings: [{ id: "capsules2", label: "2 capsules", grams: 2, household: "capsule", isDefault: true }],
    defaultServingLabel: "2 capsules",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "capsule",
    activeIngredients: [{ name: "Magnesium (as glycinate)", amount: 200, unit: "mg" }],
  },
  {
    sourceKey: "curated:vitamin_d3",
    source: "curated",
    name: "Vitamin D3",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    servings: [{ id: "softgel", label: "1 softgel", grams: 0.5, household: "softgel", isDefault: true }],
    defaultServingLabel: "1 softgel",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "softgel",
    activeIngredients: [{ name: "Vitamin D3 (cholecalciferol)", amount: 5000, unit: "iu" }],
  },
  {
    sourceKey: "curated:fish_oil_omega3",
    source: "curated",
    name: "Fish oil (omega-3)",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 900, proteinG: 0, carbsG: 0, fatG: 100 },
    servings: [{ id: "softgels2", label: "2 softgels", grams: 2, household: "softgel", isDefault: true }],
    defaultServingLabel: "2 softgels",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "softgel",
    activeIngredients: [
      { name: "EPA", amount: 360, unit: "mg" },
      { name: "DHA", amount: 240, unit: "mg" },
    ],
  },
  {
    sourceKey: "curated:ag1",
    source: "curated",
    name: "AG1 (greens powder)",
    brand: "AG1",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 417, proteinG: 16.7, carbsG: 50, fatG: 0, fiberG: 16.7 },
    servings: [
      { id: "scoop", label: "1 scoop (12 g)", grams: 12, unit: "scoop", household: "scoop", isDefault: true },
      { id: "g", label: "grams", grams: 1, unit: "g" },
    ],
    defaultServingLabel: "1 scoop (12 g)",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "scoop",
    activeIngredients: [{ name: "Vitamin C", amount: 420, unit: "mg" }],
  },
  {
    sourceKey: "curated:whey_protein",
    source: "curated",
    name: "Whey protein (generic)",
    productType: "supplement",
    basis: "mass",
    per100g: { caloriesKcal: 400, proteinG: 80, carbsG: 26.7, fatG: 6.7 },
    servings: [
      { id: "scoop", label: "1 scoop (30 g)", grams: 30, unit: "scoop", household: "scoop", isDefault: true },
      { id: "g", label: "grams", grams: 1, unit: "g" },
    ],
    defaultServingLabel: "1 scoop (30 g)",
    confidence: 0.9,
    attributionRequired: false,
    sourceVersion: CURATED_VERSION,
    doseUnit: "scoop",
  },
];
