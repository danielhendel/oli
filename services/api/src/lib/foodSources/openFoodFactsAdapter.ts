/**
 * Open Food Facts → Oli Food Graph adapter (Phase B Task 3).
 *
 * Pure mapping only: takes a parsed OFF product object and returns a canonical
 * {@link FoodGraphNodeInput}. Raw OFF payloads are NEVER stored — only the
 * normalized canonical form.
 *
 * Open Food Facts data is licensed under the Open Database License (ODbL),
 * which requires attribution → `attributionRequired: true`.
 */

import type {
  FoodGraphNodeInput,
  FoodServing,
  NutritionPer100g,
  ProcessingClass,
} from "@oli/contracts/nutritionProduct";

/** Subset of the OFF `product` object we consume (others ignored, never stored). */
export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
  serving_quantity?: number | string;
  serving_size?: string;
  nova_group?: number | string;
  rev?: number | string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function nonNegative(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return value < 0 ? 0 : value;
}

function firstBrand(brands: string | undefined): string | undefined {
  if (!brands) return undefined;
  const first = brands.split(",")[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}

function sanitizeBarcode(code: string | undefined): string | undefined {
  const digits = (code ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 32) : undefined;
}

function processingClassFromNova(nova: number | string | undefined): ProcessingClass | undefined {
  const n = num(nova);
  if (n === undefined) return undefined;
  switch (Math.trunc(n)) {
    case 1:
      return "nova1";
    case 2:
      return "nova2";
    case 3:
      return "nova3";
    case 4:
      return "nova4";
    default:
      return undefined;
  }
}

function buildPer100g(nutriments: Record<string, unknown> | undefined): {
  per100g: NutritionPer100g;
  macroCount: number;
} | null {
  if (!nutriments) return null;
  const kcal = nonNegative(num(nutriments["energy-kcal_100g"]));
  const protein = nonNegative(num(nutriments["proteins_100g"]));
  const carbs = nonNegative(num(nutriments["carbohydrates_100g"]));
  const fat = nonNegative(num(nutriments["fat_100g"]));

  // Require at least energy + one macro to consider the record usable.
  let macroCount = 0;
  if (protein !== undefined) macroCount += 1;
  if (carbs !== undefined) macroCount += 1;
  if (fat !== undefined) macroCount += 1;
  if (kcal === undefined && macroCount === 0) return null;

  const resolvedKcal =
    kcal ?? round2((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9);
  if (resolvedKcal <= 0 && macroCount === 0) return null;

  const per100g: NutritionPer100g = {
    caloriesKcal: round2(resolvedKcal),
    proteinG: round2(protein ?? 0),
    carbsG: round2(carbs ?? 0),
    fatG: round2(fat ?? 0),
  };

  const fiber = nonNegative(num(nutriments["fiber_100g"]));
  const sugar = nonNegative(num(nutriments["sugars_100g"]));
  if (fiber !== undefined) per100g.fiberG = round2(fiber);
  if (sugar !== undefined) per100g.sugarG = round2(sugar);

  // OFF reports sodium/salt in grams per 100 g.
  const sodiumG = nonNegative(num(nutriments["sodium_100g"]));
  const saltG = nonNegative(num(nutriments["salt_100g"]));
  if (sodiumG !== undefined) per100g.sodiumMg = round2(sodiumG * 1000);
  else if (saltG !== undefined) per100g.sodiumMg = round2((saltG / 2.5) * 1000);

  return { per100g, macroCount: macroCount + (kcal !== undefined ? 1 : 0) };
}

function buildServings(product: OpenFoodFactsProduct): FoodServing[] {
  const servings: FoodServing[] = [];
  const servingGrams = nonNegative(num(product.serving_quantity));
  if (servingGrams !== undefined && servingGrams > 0) {
    const label =
      product.serving_size && product.serving_size.trim().length > 0
        ? product.serving_size.trim().slice(0, 60)
        : `${servingGrams} g`;
    servings.push({ id: "off_serving", label, grams: round2(servingGrams), isDefault: true });
  } else {
    servings.push({ id: "off_100g", label: "100 g", grams: 100, isDefault: true });
  }
  servings.push({ id: "g", label: "grams", grams: 1, unit: "g" });
  return servings;
}

function confidenceFor(macroCount: number, hasServing: boolean, hasName: boolean): number {
  let c = 0.4;
  if (hasName) c += 0.05;
  if (macroCount >= 4) c += 0.15;
  else if (macroCount >= 2) c += 0.1;
  if (hasServing) c += 0.05;
  // OFF is community-sourced → cap below curated/USDA confidence.
  return Math.min(0.7, round2(c));
}

export interface OpenFoodFactsAdapterOptions {
  /** Falls back to the OFF product `rev` when omitted. */
  sourceVersion?: string;
}

/**
 * Map one OFF product into a canonical Food Graph node input.
 * Returns `null` when the record lacks a usable name or nutrition.
 */
export function mapOpenFoodFactsProductToFoodGraphNode(
  product: OpenFoodFactsProduct,
  options: OpenFoodFactsAdapterOptions = {},
): FoodGraphNodeInput | null {
  const name = (product.product_name ?? product.product_name_en ?? "").trim();
  if (!name) return null;

  const built = buildPer100g(product.nutriments);
  if (!built) return null;

  const barcode = sanitizeBarcode(product.code);
  const servings = buildServings(product);
  const brand = firstBrand(product.brands);
  const processingClass = processingClassFromNova(product.nova_group);
  const rev = num(product.rev);
  const sourceVersion = options.sourceVersion ?? (rev !== undefined ? `off:rev:${Math.trunc(rev)}` : "off");
  const hasServing = servings.some((s) => s.id === "off_serving");

  const node: FoodGraphNodeInput = {
    sourceKey: barcode ? `open:upc:${barcode}` : `open:name:${name.toLowerCase()}`,
    source: "open",
    name: name.slice(0, 200),
    productType: "food",
    basis: "mass",
    per100g: built.per100g,
    servings,
    confidence: confidenceFor(built.macroCount, hasServing, name.length > 0),
    attributionRequired: true,
    sourceVersion,
    defaultServingLabel: servings.find((s) => s.isDefault)?.label ?? "100 g",
    ...(brand ? { brand } : {}),
    ...(barcode ? { barcode } : {}),
    ...(processingClass ? { processingClass } : {}),
  };
  return node;
}
