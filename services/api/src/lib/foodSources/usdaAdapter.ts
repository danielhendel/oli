/**
 * USDA FoodData Central → Oli Food Graph adapter.
 *
 * Pure mapping only: takes a USDA FDC food record (search or detail shape) and
 * returns a canonical {@link FoodGraphNodeInput}. Raw USDA payloads are NEVER
 * stored — only the normalized canonical form. USDA analytical/branded nutrient
 * amounts are reported per 100 g, which maps directly to our per-100g basis.
 *
 * License: USDA FoodData Central is public domain (CC0) → `attributionRequired: false`.
 */

import type {
  FoodGraphNodeInput,
  FoodServing,
  NutritionPer100g,
} from "@oli/contracts/nutritionProduct";

/** Flat nutrient shape (FDC `/foods/search`). */
interface UsdaFlatNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

/** Nested nutrient shape (FDC `/food/{id}`). */
interface UsdaNestedNutrient {
  nutrient?: {
    id?: number;
    number?: string;
    name?: string;
    unitName?: string;
  };
  amount?: number;
}

type UsdaFoodNutrient = UsdaFlatNutrient | UsdaNestedNutrient;

interface UsdaFoodPortion {
  id?: number;
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string; abbreviation?: string };
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandName?: string;
  brandOwner?: string;
  gtinUpc?: string;
  publishedDate?: string;
  foodNutrients?: UsdaFoodNutrient[];
  foodPortions?: UsdaFoodPortion[];
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface UsdaAdapterOptions {
  /** USDA release tag persisted as `sourceVersion` (e.g. "2026-04"). */
  sourceVersion?: string;
}

/** USDA nutrient numbers (stable across releases). */
const NUTRIENT_NUMBER = {
  energyKcal: "208",
  protein: "203",
  fat: "204",
  carbs: "205",
  fiber: "291",
  sugars: "269",
  sodiumMg: "307",
  potassiumMg: "306",
  caffeineMg: "262",
  alcoholG: "221",
} as const;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function normalizeNutrient(n: UsdaFoodNutrient): { number: string; unit: string; value: number } | null {
  if ("nutrient" in n && n.nutrient) {
    const number = (n.nutrient.number ?? "").trim();
    const unit = (n.nutrient.unitName ?? "").trim().toUpperCase();
    const value = typeof n.amount === "number" ? n.amount : Number.NaN;
    if (!number || !Number.isFinite(value)) return null;
    return { number, unit, value };
  }
  const flat = n as UsdaFlatNutrient;
  const number = (flat.nutrientNumber ?? "").trim();
  const unit = (flat.unitName ?? "").trim().toUpperCase();
  const value = typeof flat.value === "number" ? flat.value : Number.NaN;
  if (!number || !Number.isFinite(value)) return null;
  return { number, unit, value };
}

function buildNutrientMap(food: UsdaFood): Map<string, { unit: string; value: number }> {
  const map = new Map<string, { unit: string; value: number }>();
  for (const raw of food.foodNutrients ?? []) {
    const n = normalizeNutrient(raw);
    if (!n) continue;
    // Energy: prefer KCAL (number 208 can appear as kJ on some records).
    if (n.number === NUTRIENT_NUMBER.energyKcal && n.unit && n.unit !== "KCAL") continue;
    if (!map.has(n.number)) {
      map.set(n.number, { unit: n.unit, value: n.value });
    }
  }
  return map;
}

function valueFor(map: Map<string, { unit: string; value: number }>, number: string): number | undefined {
  const hit = map.get(number);
  return hit ? Math.max(0, hit.value) : undefined;
}

function buildPer100g(food: UsdaFood): NutritionPer100g | null {
  const map = buildNutrientMap(food);
  const protein = valueFor(map, NUTRIENT_NUMBER.protein) ?? 0;
  const carbs = valueFor(map, NUTRIENT_NUMBER.carbs) ?? 0;
  const fat = valueFor(map, NUTRIENT_NUMBER.fat) ?? 0;
  let kcal = valueFor(map, NUTRIENT_NUMBER.energyKcal);
  if (kcal === undefined) {
    // Derive from Atwater factors when energy is absent.
    const derived = protein * 4 + carbs * 4 + fat * 9;
    kcal = derived > 0 ? derived : undefined;
  }
  if (kcal === undefined) return null;

  const per100g: NutritionPer100g = {
    caloriesKcal: round2(kcal),
    proteinG: round2(protein),
    carbsG: round2(carbs),
    fatG: round2(fat),
  };
  const fiber = valueFor(map, NUTRIENT_NUMBER.fiber);
  const sugar = valueFor(map, NUTRIENT_NUMBER.sugars);
  const sodium = valueFor(map, NUTRIENT_NUMBER.sodiumMg);
  const potassium = valueFor(map, NUTRIENT_NUMBER.potassiumMg);
  const caffeine = valueFor(map, NUTRIENT_NUMBER.caffeineMg);
  const alcohol = valueFor(map, NUTRIENT_NUMBER.alcoholG);
  if (fiber !== undefined) per100g.fiberG = round2(fiber);
  if (sugar !== undefined) per100g.sugarG = round2(sugar);
  if (sodium !== undefined) per100g.sodiumMg = round2(sodium);
  if (potassium !== undefined) per100g.potassiumMg = round2(potassium);
  if (caffeine !== undefined) per100g.caffeineMg = round2(caffeine);
  if (alcohol !== undefined) per100g.alcoholG = round2(alcohol);
  return per100g;
}

function portionLabel(p: UsdaFoodPortion): string {
  const desc = p.portionDescription?.trim();
  if (desc) return desc;
  const modifier = p.modifier?.trim();
  const unitName = p.measureUnit?.name?.trim();
  const amount = typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : undefined;
  if (amount !== undefined && unitName && unitName.toLowerCase() !== "undetermined") {
    return `${amount} ${unitName}`;
  }
  if (modifier) return modifier;
  if (unitName && unitName.toLowerCase() !== "undetermined") return unitName;
  return "1 serving";
}

function buildServings(food: UsdaFood): FoodServing[] {
  const servings: FoodServing[] = [];
  const portions = food.foodPortions ?? [];
  portions.forEach((p, idx) => {
    const grams = typeof p.gramWeight === "number" ? p.gramWeight : Number.NaN;
    if (!Number.isFinite(grams) || grams <= 0) return;
    servings.push({
      id: `usda_portion_${p.id ?? idx}`,
      label: portionLabel(p),
      grams: round2(grams),
      ...(idx === 0 ? { isDefault: true } : {}),
    });
  });

  // Branded foods often carry servingSize in grams instead of foodPortions.
  if (
    servings.length === 0 &&
    typeof food.servingSize === "number" &&
    Number.isFinite(food.servingSize) &&
    food.servingSize > 0 &&
    (food.servingSizeUnit ?? "").trim().toLowerCase() === "g"
  ) {
    servings.push({
      id: "usda_serving",
      label: `${food.servingSize} g`,
      grams: round2(food.servingSize),
      isDefault: true,
    });
  }

  if (servings.length === 0) {
    servings.push({ id: "usda_100g", label: "100 g", grams: 100, isDefault: true });
  }

  servings.push({ id: "g", label: "grams", grams: 1, unit: "g" });
  return servings;
}

function confidenceForDataType(dataType: string | undefined): number {
  switch ((dataType ?? "").trim().toLowerCase()) {
    case "foundation":
    case "sr legacy":
      return 0.95;
    case "survey (fndds)":
      return 0.9;
    case "branded":
      return 0.8;
    default:
      return 0.85;
  }
}

function sanitizeBarcode(gtinUpc: string | undefined): string | undefined {
  const digits = (gtinUpc ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 32) : undefined;
}

/**
 * Map one USDA FDC food into a canonical Food Graph node input.
 * Returns `null` when the record lacks usable energy/macro data.
 */
export function mapUsdaFoodToFoodGraphNode(
  food: UsdaFood,
  options: UsdaAdapterOptions = {},
): FoodGraphNodeInput | null {
  const name = (food.description ?? "").trim();
  if (!name || !Number.isFinite(food.fdcId)) return null;

  const per100g = buildPer100g(food);
  if (!per100g) return null;

  const servings = buildServings(food);
  const defaultLabel = servings.find((s) => s.isDefault)?.label;
  const brand = (food.brandName ?? food.brandOwner ?? "").trim();
  const barcode = sanitizeBarcode(food.gtinUpc);

  const node: FoodGraphNodeInput = {
    sourceKey: `usda:${food.fdcId}`,
    source: "usda",
    name,
    productType: "food",
    basis: "mass",
    per100g,
    servings,
    confidence: confidenceForDataType(food.dataType),
    attributionRequired: false,
    ...(brand ? { brand } : {}),
    ...(defaultLabel ? { defaultServingLabel: defaultLabel } : {}),
    ...(barcode ? { barcode } : {}),
    ...(options.sourceVersion ? { sourceVersion: options.sourceVersion } : {}),
  };
  return node;
}
