/**
 * Map a canonical {@link FoodGraphNodeInput} (seed / USDA / OFF / supplement)
 * into the wire {@link NutritionFoodSearchItemDto} (Phase B).
 *
 * The DTO's top-level macros represent ONE default serving (preserving the
 * existing "macros = one serving" contract consumed by logging today), while
 * `per100g` + `servings` carry the canonical basis for the Phase C serving
 * picker. The id is the deterministic canonical Food Graph id so seed/graph
 * rows de-duplicate cleanly.
 *
 * Pure, no I/O, no `any`.
 */

import type { FoodGraphNodeInput, FoodServing } from "@oli/contracts/nutritionProduct";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { computeOliFoodIdFromItem } from "../foodGraphIds";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function defaultServing(servings: readonly FoodServing[]): FoodServing | null {
  return servings.find((s) => s.isDefault === true) ?? servings[0] ?? null;
}

export function foodGraphNodeInputToSearchDto(node: FoodGraphNodeInput): NutritionFoodSearchItemDto {
  const serving = defaultServing(node.servings);
  const grams = serving && serving.grams > 0 ? serving.grams : 100;
  const factor = grams / 100;
  const p = node.per100g;

  const servingLabel = node.defaultServingLabel ?? serving?.label ?? "1 serving";
  const barcode = node.barcode;

  const base: NutritionFoodSearchItemDto = {
    id: "",
    name: node.name,
    servingLabel,
    caloriesKcal: round2(p.caloriesKcal * factor),
    proteinG: round2(p.proteinG * factor),
    carbsG: round2(p.carbsG * factor),
    fatG: round2(p.fatG * factor),
    productType: node.productType,
    basis: node.basis,
    per100g: p,
    servings: [...node.servings],
    source: node.source,
    confidence: node.confidence,
    attributionRequired: node.attributionRequired,
    ...(node.brand ? { brand: node.brand } : {}),
    ...(barcode ? { barcode } : {}),
    ...(node.storeId ? { storeId: node.storeId } : {}),
    ...(node.processingClass ? { processingClass: node.processingClass } : {}),
    ...(p.fiberG !== undefined ? { fiberG: round2(p.fiberG * factor) } : {}),
    ...(p.sugarG !== undefined ? { sugarG: round2(p.sugarG * factor) } : {}),
    ...(p.sodiumMg !== undefined ? { sodiumMg: round2(p.sodiumMg * factor) } : {}),
    ...(p.potassiumMg !== undefined ? { potassiumMg: round2(p.potassiumMg * factor) } : {}),
    ...(p.caffeineMg !== undefined ? { caffeineMg: round2(p.caffeineMg * factor) } : {}),
    ...(p.alcoholG !== undefined ? { alcoholG: round2(p.alcoholG * factor) } : {}),
  };

  return { ...base, id: computeOliFoodIdFromItem(base, node.sourceKey) };
}
