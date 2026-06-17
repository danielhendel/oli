// lib/nutrition/mealDraftItem.ts
/**
 * Pure helpers that turn a resolved food + serving selection into a meal-draft item, sum draft
 * totals, and project draft items into the server `MealItem[]` shape on save.
 *
 * No I/O, no Firebase, no duplicate conversion math — all gram/nutrition scaling already happened in
 * the Phase A serving engine (see lib/nutrition/servingSelection.ts); this module only shapes data.
 */
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { MealItem } from "@oli/contracts/nutritionMeal";
import type { ServingUnit } from "@oli/contracts/nutritionProduct";
import type { ScaledNutrition } from "@/lib/nutrition/servingConversion";
import type { ServingOption } from "@/lib/nutrition/servingSelection";
import type {
  NutritionMealDraftItem,
  NutritionMealDraftMacros,
} from "@/lib/data/nutrition/nutritionMealDraftStore";

const UNIT_SHORT: Readonly<Record<ServingUnit, string>> = {
  g: "g",
  oz: "oz",
  lb: "lb",
  ml: "ml",
  cup: "cup",
  tbsp: "tbsp",
  tsp: "tsp",
  scoop: "scoop",
  piece: "piece",
  slice: "slice",
  container: "container",
  serving: "serving",
};

function formatQuantity(quantity: number): string {
  if (!Number.isFinite(quantity) || quantity <= 0) return "0";
  return Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 100) / 100);
}

/** Human-readable serving line for a chosen option + quantity, e.g. "150 g", "2 × 1 scoop". */
export function describeServingSelection(
  food: NutritionFoodSearchItemDto,
  option: ServingOption,
  quantity: number,
): string {
  if (option.kind === "legacy") {
    return quantity === 1 ? food.servingLabel : `${formatQuantity(quantity)} × ${food.servingLabel}`;
  }
  if (option.kind === "unit") {
    return `${formatQuantity(quantity)} ${UNIT_SHORT[option.unit]}`;
  }
  return quantity === 1 ? option.label : `${formatQuantity(quantity)} × ${option.label}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build a draft item from a resolved serving. Optional badges are only set when present. */
export function buildMealDraftItemFromFood(args: {
  id: string;
  food: NutritionFoodSearchItemDto;
  nutrition: ScaledNutrition;
  servingLabel: string;
}): NutritionMealDraftItem {
  const { id, food, nutrition, servingLabel } = args;
  const item: NutritionMealDraftItem = {
    id,
    label: food.name,
    servingLabel,
    manual: false,
    macros: {
      caloriesKcal: round2(nutrition.caloriesKcal),
      proteinG: round2(nutrition.proteinG),
      carbsG: round2(nutrition.carbsG),
      fatG: round2(nutrition.fatG),
      fiberG: round2(nutrition.fiberG ?? 0),
    },
  };
  if (food.source !== undefined) item.source = food.source;
  if (food.productType !== undefined) item.productType = food.productType;
  if (food.attributionRequired !== undefined) item.attributionRequired = food.attributionRequired;
  if (food.id.startsWith("oli:")) item.oliFoodId = food.id;
  return item;
}

/** Build a manual (hand-entered) draft item. */
export function buildManualMealDraftItem(args: {
  id: string;
  label: string;
  macros: NutritionMealDraftMacros;
}): NutritionMealDraftItem {
  return {
    id: args.id,
    label: args.label.trim() || "Item",
    servingLabel: "1 serving",
    manual: true,
    macros: {
      caloriesKcal: round2(args.macros.caloriesKcal),
      proteinG: round2(args.macros.proteinG),
      carbsG: round2(args.macros.carbsG),
      fatG: round2(args.macros.fatG),
      fiberG: round2(args.macros.fiberG),
    },
  };
}

/** Sum draft item macros into live totals (fiber included for display). */
export function sumMealDraftMacros(
  items: readonly NutritionMealDraftItem[],
): NutritionMealDraftMacros {
  return items.reduce<NutritionMealDraftMacros>(
    (acc, it) => ({
      caloriesKcal: round2(acc.caloriesKcal + it.macros.caloriesKcal),
      proteinG: round2(acc.proteinG + it.macros.proteinG),
      carbsG: round2(acc.carbsG + it.macros.carbsG),
      fatG: round2(acc.fatG + it.macros.fatG),
      fiberG: round2(acc.fiberG + it.macros.fiberG),
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/** One-line subtotal label for the meal builder card. */
export function formatMealDraftSubtotal(totals: NutritionMealDraftMacros): string {
  return `${Math.round(totals.caloriesKcal)} kcal · P ${Math.round(totals.proteinG)} · C ${Math.round(
    totals.carbsG,
  )} · F ${Math.round(totals.fatG)}`;
}

/**
 * Project draft items into the server {@link MealItem} shape for "Save meal".
 * NOTE: the meal contract has no fiber field, so item fiber is intentionally dropped on save
 * (display-only). Each item is stored as one serving with its scaled macros as macrosPerServing.
 */
export function mealDraftItemsToMealItems(
  items: readonly NutritionMealDraftItem[],
): MealItem[] {
  return items.map((it) => {
    const base: MealItem = {
      id: it.id,
      label: it.label.trim() || "Item",
      servings: 1,
      macrosPerServing: {
        caloriesKcal: it.macros.caloriesKcal,
        proteinG: it.macros.proteinG,
        carbsG: it.macros.carbsG,
        fatG: it.macros.fatG,
      },
    };
    return it.oliFoodId !== undefined ? { ...base, oliFoodId: it.oliFoodId } : base;
  });
}
