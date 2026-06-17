import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { ScaledNutrition } from "@/lib/nutrition/servingConversion";
import type { ServingOption } from "@/lib/nutrition/servingSelection";
import {
  buildManualMealDraftItem,
  buildMealDraftItemFromFood,
  describeServingSelection,
  formatMealDraftSubtotal,
  mealDraftItemsToMealItems,
  sumMealDraftMacros,
} from "@/lib/nutrition/mealDraftItem";
import type { NutritionMealDraftItem } from "@/lib/data/nutrition/nutritionMealDraftStore";

const food = {
  id: "oli:fg:chicken",
  name: "Chicken breast",
  brand: "Costco",
  servingLabel: "100 g",
  caloriesKcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  fiberG: 0,
  source: "usda",
  productType: "food",
  attributionRequired: false,
} as unknown as NutritionFoodSearchItemDto;

const nutrition: ScaledNutrition = { caloriesKcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4, fiberG: 0 };

describe("describeServingSelection", () => {
  it("formats a mass unit selection", () => {
    const option: ServingOption = { key: "unit:g", label: "Grams", kind: "unit", unit: "g" };
    expect(describeServingSelection(food, option, 150)).toBe("150 g");
  });

  it("formats a named serving selection", () => {
    const option: ServingOption = { key: "serving:scoop", label: "1 scoop", kind: "serving", servingId: "scoop" };
    expect(describeServingSelection(food, option, 1)).toBe("1 scoop");
    expect(describeServingSelection(food, option, 2)).toBe("2 × 1 scoop");
  });

  it("formats a legacy selection from the food serving label", () => {
    const option: ServingOption = { key: "legacy", label: food.servingLabel, kind: "legacy" };
    expect(describeServingSelection(food, option, 1)).toBe("100 g");
  });
});

describe("buildMealDraftItemFromFood", () => {
  it("captures label, serving, macros, badges, and oli id", () => {
    const item = buildMealDraftItemFromFood({ id: "row-1", food, nutrition, servingLabel: "150 g" });
    expect(item).toMatchObject({
      id: "row-1",
      label: "Chicken breast",
      servingLabel: "150 g",
      manual: false,
      source: "usda",
      productType: "food",
      attributionRequired: false,
      oliFoodId: "oli:fg:chicken",
    });
    expect(item.macros).toEqual({ caloriesKcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4, fiberG: 0 });
  });

  it("omits oli id for non-graph foods", () => {
    const offFood = { ...food, id: "off:12345" } as unknown as NutritionFoodSearchItemDto;
    const item = buildMealDraftItemFromFood({ id: "row-2", food: offFood, nutrition, servingLabel: "1 serving" });
    expect(item.oliFoodId).toBeUndefined();
  });
});

describe("sumMealDraftMacros / formatMealDraftSubtotal", () => {
  const items: NutritionMealDraftItem[] = [
    buildManualMealDraftItem({ id: "a", label: "Eggs", macros: { caloriesKcal: 140, proteinG: 12, carbsG: 1, fatG: 10, fiberG: 0 } }),
    buildManualMealDraftItem({ id: "b", label: "Rice", macros: { caloriesKcal: 200, proteinG: 4, carbsG: 44, fatG: 0.4, fiberG: 1.2 } }),
  ];

  it("sums macros including fiber", () => {
    expect(sumMealDraftMacros(items)).toEqual({
      caloriesKcal: 340,
      proteinG: 16,
      carbsG: 45,
      fatG: 10.4,
      fiberG: 1.2,
    });
  });

  it("formats a subtotal line", () => {
    expect(formatMealDraftSubtotal(sumMealDraftMacros(items))).toBe("340 kcal · P 16 · C 45 · F 10");
  });
});

describe("mealDraftItemsToMealItems", () => {
  it("projects to MealItem shape (drops fiber, one serving, keeps oli id)", () => {
    const draftItem = buildMealDraftItemFromFood({ id: "row-1", food, nutrition, servingLabel: "150 g" });
    const [mealItem] = mealDraftItemsToMealItems([draftItem]);
    expect(mealItem).toEqual({
      id: "row-1",
      label: "Chicken breast",
      servings: 1,
      macrosPerServing: { caloriesKcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4 },
      oliFoodId: "oli:fg:chicken",
    });
    expect(mealItem).not.toHaveProperty("macrosPerServing.fiberG");
  });
});
