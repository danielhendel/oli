/**
 * Oli P0 Food Graph Seed Catalog (Food Graph Foundation, Sprint 1).
 *
 * Curated, USDA-reference nutrition for the highest-frequency foods so that
 * first-use logging is genuinely useful before bulk USDA import runs. Values
 * are per-100g (USDA basis) with structured servings carrying gram weights.
 *
 * USDA FoodData Central data is public domain (CC0) → `attributionRequired: false`.
 * `searchTokens` are intentionally NOT populated here — token generation for
 * all nodes is implemented in Phase B.
 */

import type {
  FoodGraphNodeInput,
  FoodServing,
  NutritionPer100g,
  ServingUnit,
} from "@oli/contracts/nutritionProduct";
import { SUPPLEMENT_NODES } from "./supplementCatalog";

const USDA_REFERENCE_VERSION = "usda-2026-04";

interface SeedFoodArgs {
  key: string;
  name: string;
  brand?: string;
  per100g: NutritionPer100g;
  /** Primary, default serving. */
  serving: { id: string; label: string; grams: number; unit?: ServingUnit; household?: string };
  /** Additional named servings (besides the gram unit, which is always added). */
  extraServings?: FoodServing[];
  confidence?: number;
}

function seedFood(args: SeedFoodArgs): FoodGraphNodeInput {
  const defaultServing: FoodServing = {
    id: args.serving.id,
    label: args.serving.label,
    grams: args.serving.grams,
    isDefault: true,
    ...(args.serving.unit ? { unit: args.serving.unit } : {}),
    ...(args.serving.household ? { household: args.serving.household } : {}),
  };
  const servings: FoodServing[] = [defaultServing, ...(args.extraServings ?? [])];
  if (!servings.some((s) => s.id === "g")) {
    servings.push({ id: "g", label: "grams", grams: 1, unit: "g" });
  }
  return {
    sourceKey: `usda:seed:${args.key}`,
    source: "usda",
    name: args.name,
    productType: "food",
    basis: "mass",
    per100g: args.per100g,
    servings,
    defaultServingLabel: args.serving.label,
    confidence: args.confidence ?? 0.9,
    attributionRequired: false,
    sourceVersion: USDA_REFERENCE_VERSION,
    ...(args.brand ? { brand: args.brand } : {}),
  };
}

const PROTEINS: readonly FoodGraphNodeInput[] = [
  seedFood({
    key: "eggs_whole",
    name: "Eggs, whole, raw",
    per100g: { caloriesKcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
    serving: { id: "large_egg", label: "1 large egg", grams: 50, unit: "piece", household: "egg" },
    extraServings: [{ id: "medium_egg", label: "1 medium egg", grams: 44 }],
  }),
  seedFood({
    key: "egg_whites",
    name: "Egg whites, raw",
    per100g: { caloriesKcal: 52, proteinG: 10.9, carbsG: 0.7, fatG: 0.2, sodiumMg: 166 },
    serving: { id: "large_white", label: "1 large egg white", grams: 33, unit: "piece", household: "white" },
  }),
  seedFood({
    key: "chicken_breast",
    name: "Chicken breast, grilled, skinless",
    per100g: { caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, sodiumMg: 74 },
    serving: { id: "oz4", label: "4 oz", grams: 113 },
  }),
  seedFood({
    key: "rotisserie_chicken",
    name: "Rotisserie chicken, meat",
    per100g: { caloriesKcal: 190, proteinG: 25, carbsG: 0, fatG: 10, sodiumMg: 380 },
    serving: { id: "oz3", label: "3 oz", grams: 85 },
  }),
  seedFood({
    key: "turkey_breast",
    name: "Turkey breast, roasted",
    per100g: { caloriesKcal: 135, proteinG: 30, carbsG: 0, fatG: 1, sodiumMg: 1015 },
    serving: { id: "oz3", label: "3 oz", grams: 85 },
  }),
  seedFood({
    key: "lean_ground_beef",
    name: "Lean ground beef (90/10), cooked",
    per100g: { caloriesKcal: 176, proteinG: 20, carbsG: 0, fatG: 10, sodiumMg: 75 },
    serving: { id: "oz4", label: "4 oz", grams: 113 },
  }),
  seedFood({
    key: "salmon",
    name: "Salmon, Atlantic, cooked",
    per100g: { caloriesKcal: 206, proteinG: 22, carbsG: 0, fatG: 12, sodiumMg: 61, potassiumMg: 384 },
    serving: { id: "oz4", label: "4 oz", grams: 113 },
  }),
  seedFood({
    key: "tuna_canned",
    name: "Tuna, canned in water, drained",
    per100g: { caloriesKcal: 116, proteinG: 26, carbsG: 0, fatG: 0.8, sodiumMg: 247 },
    serving: { id: "can", label: "1 can (142 g)", grams: 142, household: "can" },
    extraServings: [{ id: "oz3", label: "3 oz", grams: 85 }],
  }),
  seedFood({
    key: "shrimp",
    name: "Shrimp, cooked",
    per100g: { caloriesKcal: 99, proteinG: 24, carbsG: 0.2, fatG: 0.3, sodiumMg: 111 },
    serving: { id: "oz3", label: "3 oz", grams: 85 },
  }),
  seedFood({
    key: "greek_yogurt",
    name: "Greek yogurt, plain, nonfat",
    per100g: { caloriesKcal: 59, proteinG: 10, carbsG: 3.6, fatG: 0.4, sugarG: 3.2, sodiumMg: 36 },
    serving: { id: "container", label: "1 container (170 g)", grams: 170, unit: "container", household: "container" },
    extraServings: [{ id: "cup", label: "1 cup", grams: 245, unit: "cup" }],
  }),
];

const CARBS: readonly FoodGraphNodeInput[] = [
  seedFood({
    key: "white_rice_cooked",
    name: "White rice, cooked",
    per100g: { caloriesKcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4 },
    serving: { id: "cup", label: "1 cup cooked", grams: 158, unit: "cup" },
  }),
  seedFood({
    key: "brown_rice_cooked",
    name: "Brown rice, cooked",
    per100g: { caloriesKcal: 123, proteinG: 2.7, carbsG: 25.6, fatG: 1, fiberG: 1.6 },
    serving: { id: "cup", label: "1 cup cooked", grams: 195, unit: "cup" },
  }),
  seedFood({
    key: "quinoa_cooked",
    name: "Quinoa, cooked",
    per100g: { caloriesKcal: 120, proteinG: 4.4, carbsG: 21.3, fatG: 1.9, fiberG: 2.8 },
    serving: { id: "cup", label: "1 cup cooked", grams: 185, unit: "cup" },
  }),
  seedFood({
    key: "oats_dry",
    name: "Oats, rolled, dry",
    per100g: { caloriesKcal: 379, proteinG: 13, carbsG: 67, fatG: 7, fiberG: 10, sugarG: 1 },
    serving: { id: "half_cup", label: "1/2 cup dry (40 g)", grams: 40, unit: "cup" },
  }),
  seedFood({
    key: "sweet_potato",
    name: "Sweet potato, baked",
    per100g: { caloriesKcal: 90, proteinG: 2, carbsG: 20.7, fatG: 0.2, fiberG: 3.3, potassiumMg: 475 },
    serving: { id: "medium", label: "1 medium", grams: 130, unit: "piece", household: "potato" },
  }),
  seedFood({
    key: "potato",
    name: "Potato, baked, flesh and skin",
    per100g: { caloriesKcal: 93, proteinG: 2.5, carbsG: 21, fatG: 0.1, fiberG: 2.2, potassiumMg: 535 },
    serving: { id: "medium", label: "1 medium", grams: 173, unit: "piece", household: "potato" },
  }),
  seedFood({
    key: "pasta_cooked",
    name: "Pasta, cooked",
    per100g: { caloriesKcal: 157, proteinG: 5.8, carbsG: 30.9, fatG: 0.9, fiberG: 1.8 },
    serving: { id: "cup", label: "1 cup cooked", grams: 140, unit: "cup" },
  }),
  seedFood({
    key: "bread_whole_wheat",
    name: "Bread, whole wheat",
    per100g: { caloriesKcal: 247, proteinG: 13, carbsG: 41, fatG: 3.4, fiberG: 7, sodiumMg: 450 },
    serving: { id: "slice", label: "1 slice", grams: 28, unit: "slice", household: "slice" },
  }),
  seedFood({
    key: "banana",
    name: "Banana",
    per100g: { caloriesKcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fiberG: 2.6, sugarG: 12, potassiumMg: 358 },
    serving: { id: "medium", label: "1 medium (118 g)", grams: 118, unit: "piece", household: "banana" },
  }),
  seedFood({
    key: "apple",
    name: "Apple",
    per100g: { caloriesKcal: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2, fiberG: 2.4, sugarG: 10.4, potassiumMg: 107 },
    serving: { id: "medium", label: "1 medium (182 g)", grams: 182, unit: "piece", household: "apple" },
  }),
  seedFood({
    key: "blueberries",
    name: "Blueberries",
    per100g: { caloriesKcal: 57, proteinG: 0.7, carbsG: 14.5, fatG: 0.3, fiberG: 2.4, sugarG: 10 },
    serving: { id: "cup", label: "1 cup", grams: 148, unit: "cup" },
  }),
];

const FATS: readonly FoodGraphNodeInput[] = [
  seedFood({
    key: "olive_oil",
    name: "Olive oil",
    per100g: { caloriesKcal: 884, proteinG: 0, carbsG: 0, fatG: 100 },
    serving: { id: "tbsp", label: "1 tbsp", grams: 13.5, unit: "tbsp" },
    extraServings: [{ id: "tsp", label: "1 tsp", grams: 4.5, unit: "tsp" }],
  }),
  seedFood({
    key: "avocado",
    name: "Avocado",
    per100g: { caloriesKcal: 160, proteinG: 2, carbsG: 8.5, fatG: 14.7, fiberG: 6.7, potassiumMg: 485 },
    serving: { id: "half", label: "1/2 avocado", grams: 100, household: "half" },
    extraServings: [{ id: "whole", label: "1 whole avocado", grams: 200, unit: "piece" }],
  }),
  seedFood({
    key: "almonds",
    name: "Almonds",
    per100g: { caloriesKcal: 579, proteinG: 21, carbsG: 21.6, fatG: 49.9, fiberG: 12.5, sugarG: 4.4 },
    serving: { id: "oz1", label: "1 oz (28 g)", grams: 28 },
  }),
  seedFood({
    key: "peanut_butter",
    name: "Peanut butter",
    per100g: { caloriesKcal: 588, proteinG: 25, carbsG: 20, fatG: 50, fiberG: 6, sugarG: 9, sodiumMg: 459 },
    serving: { id: "tbsp2", label: "2 tbsp (32 g)", grams: 32, unit: "tbsp" },
  }),
];

const VEGETABLES: readonly FoodGraphNodeInput[] = [
  seedFood({
    key: "broccoli",
    name: "Broccoli, raw",
    per100g: { caloriesKcal: 34, proteinG: 2.8, carbsG: 6.6, fatG: 0.4, fiberG: 2.6, potassiumMg: 316 },
    serving: { id: "cup", label: "1 cup chopped", grams: 91, unit: "cup" },
  }),
  seedFood({
    key: "spinach",
    name: "Spinach, raw",
    per100g: { caloriesKcal: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.4, fiberG: 2.2, potassiumMg: 558 },
    serving: { id: "cup", label: "1 cup", grams: 30, unit: "cup" },
  }),
  seedFood({
    key: "bell_pepper",
    name: "Bell pepper, raw",
    per100g: { caloriesKcal: 31, proteinG: 1, carbsG: 6, fatG: 0.3, fiberG: 2.1, sugarG: 4.2 },
    serving: { id: "medium", label: "1 medium", grams: 119, unit: "piece", household: "pepper" },
  }),
  seedFood({
    key: "onion",
    name: "Onion, raw",
    per100g: { caloriesKcal: 40, proteinG: 1.1, carbsG: 9.3, fatG: 0.1, fiberG: 1.7, sugarG: 4.2 },
    serving: { id: "medium", label: "1 medium", grams: 110, unit: "piece", household: "onion" },
  }),
];

/** All seed food nodes (foods only; supplements provided separately). */
export const SEED_FOOD_NODES: readonly FoodGraphNodeInput[] = [
  ...PROTEINS,
  ...CARBS,
  ...FATS,
  ...VEGETABLES,
];

/** Full P0 seed: foods + curated supplements. */
export function getSeedFoodGraphNodes(): readonly FoodGraphNodeInput[] {
  return [...SEED_FOOD_NODES, ...SUPPLEMENT_NODES];
}
