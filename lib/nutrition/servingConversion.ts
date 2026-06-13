/**
 * Serving Conversion Engine (Food Graph Foundation, Sprint 1).
 *
 * Pure, deterministic conversion from a user's serving selection to grams and
 * scaled nutrition, using the canonical per-100g basis. No I/O, no Firebase,
 * no `any`. Macros are always derived from `per100g`; nothing here mutates or
 * stores truth.
 *
 * Resolution rules (deterministic):
 *  - Mass units (g/oz/lb) convert directly to grams — confidence 1.
 *  - A named serving (`servingId`) uses its gram weight — confidence 1.
 *  - A unit that matches a serving's `unit` uses that serving's grams — confidence 1.
 *  - `ml` assumes density ≈ 1 g/mL — confidence 0.7.
 *  - Other volume/household units with no matching serving use a generic
 *    fallback table — confidence 0.5.
 *  - Invalid (≤0 / non-finite) quantities resolve to 0 grams / zero nutrition.
 */

import type {
  FoodServing,
  NutritionBasis,
  NutritionPer100g,
  ServingUnit,
} from "@oli/contracts/nutritionProduct";

/** Nutrition scaled to a specific logged quantity. */
export interface ScaledNutrition {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  caffeineMg?: number;
  alcoholG?: number;
}

/** Minimal food shape the engine needs (a search item or Food Graph node). */
export interface ServingConvertibleFood {
  per100g: NutritionPer100g;
  servings: readonly FoodServing[];
  basis?: NutritionBasis;
}

/** A user's chosen quantity expressed either as a named serving or a raw unit. */
export type ServingSelection =
  | { kind: "serving"; servingId: string; quantity: number }
  | { kind: "unit"; unit: ServingUnit; quantity: number };

export interface ServingConversionResult {
  grams: number;
  nutrition: ScaledNutrition;
  /** 0..1 — how trustworthy the grams resolution is. */
  servingConfidence: number;
}

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_POUND = 453.59237;

/** Generic gram fallbacks for volume/household units with no matching serving. */
const GENERIC_UNIT_GRAMS: Readonly<Record<ServingUnit, number>> = {
  g: 1,
  oz: GRAMS_PER_OUNCE,
  lb: GRAMS_PER_POUND,
  ml: 1,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  scoop: 30,
  piece: 50,
  slice: 30,
  container: 240,
  serving: 100,
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const isPositiveFinite = (n: number): boolean => Number.isFinite(n) && n > 0;

/** The default serving (explicitly flagged, else the first entry). */
export function defaultServing(servings: readonly FoodServing[]): FoodServing | null {
  const flagged = servings.find((s) => s.isDefault === true);
  if (flagged) return flagged;
  return servings[0] ?? null;
}

function findServingById(servings: readonly FoodServing[], id: string): FoodServing | null {
  return servings.find((s) => s.id === id) ?? null;
}

function findServingByUnit(servings: readonly FoodServing[], unit: ServingUnit): FoodServing | null {
  return servings.find((s) => s.unit === unit) ?? null;
}

interface GramsResolution {
  grams: number;
  confidence: number;
}

function resolveGrams(food: ServingConvertibleFood, selection: ServingSelection): GramsResolution {
  if (!isPositiveFinite(selection.quantity)) {
    return { grams: 0, confidence: 0 };
  }
  const qty = selection.quantity;

  if (selection.kind === "serving") {
    const serving = findServingById(food.servings, selection.servingId);
    if (serving) {
      return { grams: serving.grams * qty, confidence: 1 };
    }
    const fallback = defaultServing(food.servings);
    if (fallback) {
      return { grams: fallback.grams * qty, confidence: 0.5 };
    }
    return { grams: 0, confidence: 0 };
  }

  const unit = selection.unit;

  if (unit === "g") return { grams: qty, confidence: 1 };
  if (unit === "oz") return { grams: qty * GRAMS_PER_OUNCE, confidence: 1 };
  if (unit === "lb") return { grams: qty * GRAMS_PER_POUND, confidence: 1 };

  // Prefer a serving that explicitly represents this unit (exact gram weight).
  const matched = findServingByUnit(food.servings, unit);
  if (matched) {
    return { grams: matched.grams * qty, confidence: 1 };
  }

  if (unit === "ml") return { grams: qty * GENERIC_UNIT_GRAMS.ml, confidence: 0.7 };

  return { grams: qty * GENERIC_UNIT_GRAMS[unit], confidence: 0.5 };
}

/** Scale a per-100g basis to an arbitrary gram quantity (omits absent micros). */
export function scaleNutritionFromPer100g(per100g: NutritionPer100g, grams: number): ScaledNutrition {
  const factor = Number.isFinite(grams) && grams > 0 ? grams / 100 : 0;
  const out: ScaledNutrition = {
    caloriesKcal: round2(per100g.caloriesKcal * factor),
    proteinG: round2(per100g.proteinG * factor),
    carbsG: round2(per100g.carbsG * factor),
    fatG: round2(per100g.fatG * factor),
  };
  if (per100g.fiberG !== undefined) out.fiberG = round2(per100g.fiberG * factor);
  if (per100g.sugarG !== undefined) out.sugarG = round2(per100g.sugarG * factor);
  if (per100g.sodiumMg !== undefined) out.sodiumMg = round2(per100g.sodiumMg * factor);
  if (per100g.potassiumMg !== undefined) out.potassiumMg = round2(per100g.potassiumMg * factor);
  if (per100g.caffeineMg !== undefined) out.caffeineMg = round2(per100g.caffeineMg * factor);
  if (per100g.alcoholG !== undefined) out.alcoholG = round2(per100g.alcoholG * factor);
  return out;
}

/** Resolve a serving selection into grams + scaled nutrition + confidence. */
export function computeServingNutrition(
  food: ServingConvertibleFood,
  selection: ServingSelection,
): ServingConversionResult {
  const { grams, confidence } = resolveGrams(food, selection);
  const roundedGrams = round2(grams);
  return {
    grams: roundedGrams,
    nutrition: scaleNutritionFromPer100g(food.per100g, roundedGrams),
    servingConfidence: confidence,
  };
}

/** Convert a quantity of a given unit into grams (engine-internal helper, exported for reuse). */
export function gramsForSelection(food: ServingConvertibleFood, selection: ServingSelection): number {
  return round2(resolveGrams(food, selection).grams);
}
