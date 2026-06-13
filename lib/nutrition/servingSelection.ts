/**
 * Serving Picker selection logic (Phase C — Nutrition UX).
 *
 * Pure glue between a {@link NutritionFoodSearchItemDto} and the Phase A
 * {@link computeServingNutrition} engine. Produces the list of selectable
 * serving options for a food and resolves a (option + quantity) choice into:
 *   - grams (when a canonical per-100g basis exists)
 *   - servingMultiplier (vs the catalog default serving — what the ingest
 *     payload builder expects)
 *   - live scaled nutrition
 *   - serving confidence
 *
 * No I/O, no Firebase, no duplicate conversion math: all gram/nutrition math
 * is delegated to the Phase A engine.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { ServingUnit } from "@oli/contracts/nutritionProduct";
import {
  computeServingNutrition,
  defaultServing,
  type ScaledNutrition,
  type ServingConvertibleFood,
} from "@/lib/nutrition/servingConversion";

/** The fixed generic unit set the picker always offers (Phase C requirement). */
export const SERVING_UNIT_OPTIONS: readonly ServingUnit[] = [
  "g",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "scoop",
  "piece",
  "slice",
  "container",
] as const;

const UNIT_LABEL: Readonly<Record<ServingUnit, string>> = {
  g: "Grams",
  oz: "Ounces",
  lb: "Pounds",
  ml: "Milliliters",
  cup: "Cups",
  tbsp: "Tablespoons",
  tsp: "Teaspoons",
  scoop: "Scoops",
  piece: "Pieces",
  slice: "Slices",
  container: "Containers",
  serving: "Servings",
};

export type ServingOption =
  | { key: string; label: string; kind: "serving"; servingId: string }
  | { key: string; label: string; kind: "unit"; unit: ServingUnit }
  | { key: string; label: string; kind: "legacy" };

export interface ResolvedServing {
  /** Grams of the logged quantity, or null for legacy foods without per-100g. */
  grams: number | null;
  /** Multiplier vs the catalog default serving (ingest payload basis). */
  servingMultiplier: number;
  nutrition: ScaledNutrition;
  /** 0..1 trust in the grams resolution (1 for named servings / mass units). */
  servingConfidence: number;
}

/** A food can drive the full serving picker only when it carries a per-100g basis. */
export function isServingConvertible(
  food: NutritionFoodSearchItemDto,
): food is NutritionFoodSearchItemDto & ServingConvertibleFood {
  return (
    food.per100g !== undefined &&
    Array.isArray(food.servings) &&
    food.servings.length > 0
  );
}

/**
 * Build the selectable serving options for a food.
 * Named servings come first (confidence 1), then the generic unit set.
 * Legacy foods (no per-100g) return a single "servings" option.
 */
export function buildServingOptions(food: NutritionFoodSearchItemDto): ServingOption[] {
  if (!isServingConvertible(food)) {
    return [{ key: "legacy", label: food.servingLabel, kind: "legacy" }];
  }
  const options: ServingOption[] = [];
  const seenUnits = new Set<ServingUnit>();
  for (const s of food.servings ?? []) {
    options.push({ key: `serving:${s.id}`, label: s.label, kind: "serving", servingId: s.id });
    if (s.unit) seenUnits.add(s.unit);
  }
  for (const unit of SERVING_UNIT_OPTIONS) {
    if (seenUnits.has(unit)) continue;
    options.push({ key: `unit:${unit}`, label: UNIT_LABEL[unit], kind: "unit", unit });
  }
  return options;
}

/** The option that should be selected initially (the catalog default serving). */
export function defaultServingOption(food: NutritionFoodSearchItemDto): ServingOption {
  const options = buildServingOptions(food);
  if (isServingConvertible(food)) {
    const def = defaultServing(food.servings ?? []);
    if (def) {
      const match = options.find((o) => o.kind === "serving" && o.servingId === def.id);
      if (match) return match;
    }
  }
  return options[0]!;
}

function defaultServingGrams(food: NutritionFoodSearchItemDto & ServingConvertibleFood): number {
  const def = defaultServing(food.servings);
  return def ? def.grams : 0;
}

function legacyNutrition(food: NutritionFoodSearchItemDto, quantity: number): ScaledNutrition {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const out: ScaledNutrition = {
    caloriesKcal: round2(food.caloriesKcal * q),
    proteinG: round2(food.proteinG * q),
    carbsG: round2(food.carbsG * q),
    fatG: round2(food.fatG * q),
  };
  if (food.fiberG !== undefined) out.fiberG = round2(food.fiberG * q);
  if (food.sugarG !== undefined) out.sugarG = round2(food.sugarG * q);
  if (food.sodiumMg !== undefined) out.sodiumMg = round2(food.sodiumMg * q);
  return out;
}

/**
 * Resolve a serving option + quantity into grams, the ingest serving multiplier,
 * live nutrition, and confidence.
 */
export function resolveServing(
  food: NutritionFoodSearchItemDto,
  option: ServingOption,
  quantity: number,
): ResolvedServing {
  if (!isServingConvertible(food) || option.kind === "legacy") {
    const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    return {
      grams: null,
      servingMultiplier: q,
      nutrition: legacyNutrition(food, q),
      servingConfidence: 1,
    };
  }

  const selection =
    option.kind === "serving"
      ? ({ kind: "serving", servingId: option.servingId, quantity } as const)
      : ({ kind: "unit", unit: option.unit, quantity } as const);

  const result = computeServingNutrition(food, selection);
  const defGrams = defaultServingGrams(food);
  const servingMultiplier = defGrams > 0 ? result.grams / defGrams : quantity;

  return {
    grams: result.grams,
    servingMultiplier,
    nutrition: result.nutrition,
    servingConfidence: result.servingConfidence,
  };
}
