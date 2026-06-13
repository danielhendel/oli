import { describe, it, expect } from "@jest/globals";
import type { FoodServing, NutritionPer100g } from "@oli/contracts/nutritionProduct";
import {
  computeServingNutrition,
  defaultServing,
  gramsForSelection,
  scaleNutritionFromPer100g,
  type ServingConvertibleFood,
} from "../servingConversion";

const egg: ServingConvertibleFood = {
  basis: "mass",
  per100g: { caloriesKcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  servings: [
    { id: "large_egg", label: "1 large egg", grams: 50, unit: "piece", household: "egg", isDefault: true },
    { id: "g", label: "grams", grams: 1, unit: "g" },
  ],
};

const rice: ServingConvertibleFood = {
  basis: "mass",
  per100g: { caloriesKcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4 },
  servings: [
    { id: "cup", label: "1 cup cooked", grams: 158, unit: "cup", isDefault: true },
    { id: "g", label: "grams", grams: 1, unit: "g" },
  ],
};

const chicken: ServingConvertibleFood = {
  basis: "mass",
  per100g: { caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  servings: [{ id: "oz4", label: "4 oz", grams: 113, isDefault: true }],
};

const oliveOil: ServingConvertibleFood = {
  basis: "mass",
  per100g: { caloriesKcal: 884, proteinG: 0, carbsG: 0, fatG: 100 },
  servings: [
    { id: "tbsp", label: "1 tbsp", grams: 13.5, unit: "tbsp", isDefault: true },
    { id: "g", label: "grams", grams: 1, unit: "g" },
  ],
};

const whey: ServingConvertibleFood = {
  basis: "mass",
  per100g: { caloriesKcal: 400, proteinG: 80, carbsG: 26.7, fatG: 6.7 },
  servings: [{ id: "scoop", label: "1 scoop (30 g)", grams: 30, unit: "scoop", isDefault: true }],
};

describe("computeServingNutrition — worked examples", () => {
  it("3 eggs by serving → 150 g, 214.5 kcal", () => {
    const r = computeServingNutrition(egg, { kind: "serving", servingId: "large_egg", quantity: 3 });
    expect(r.grams).toBe(150);
    expect(r.nutrition.caloriesKcal).toBe(214.5);
    expect(r.nutrition.proteinG).toBe(18.9);
    expect(r.servingConfidence).toBe(1);
  });

  it("3 eggs by 'piece' unit resolves through the matching serving", () => {
    const r = computeServingNutrition(egg, { kind: "unit", unit: "piece", quantity: 3 });
    expect(r.grams).toBe(150);
    expect(r.servingConfidence).toBe(1);
  });

  it("150 g rice → factor 1.5", () => {
    const r = computeServingNutrition(rice, { kind: "unit", unit: "g", quantity: 150 });
    expect(r.grams).toBe(150);
    expect(r.nutrition.caloriesKcal).toBe(195);
    expect(r.nutrition.carbsG).toBe(42);
    expect(r.nutrition.fiberG).toBe(0.6);
    expect(r.servingConfidence).toBe(1);
  });

  it("1 cup rice uses the cup serving exactly (158 g)", () => {
    const r = computeServingNutrition(rice, { kind: "unit", unit: "cup", quantity: 1 });
    expect(r.grams).toBe(158);
    expect(r.servingConfidence).toBe(1);
  });

  it("6 oz chicken → 170.1 g", () => {
    const r = computeServingNutrition(chicken, { kind: "unit", unit: "oz", quantity: 6 });
    expect(r.grams).toBe(170.1);
    expect(r.nutrition.caloriesKcal).toBe(280.66);
    expect(r.servingConfidence).toBe(1);
  });

  it("1 tbsp olive oil → 13.5 g, ~119 kcal", () => {
    const r = computeServingNutrition(oliveOil, { kind: "unit", unit: "tbsp", quantity: 1 });
    expect(r.grams).toBe(13.5);
    expect(r.nutrition.caloriesKcal).toBe(119.34);
    expect(r.servingConfidence).toBe(1);
  });

  it("2 scoops whey → 60 g, 240 kcal, 48 g protein", () => {
    const r = computeServingNutrition(whey, { kind: "serving", servingId: "scoop", quantity: 2 });
    expect(r.grams).toBe(60);
    expect(r.nutrition.caloriesKcal).toBe(240);
    expect(r.nutrition.proteinG).toBe(48);
    expect(r.servingConfidence).toBe(1);
  });
});

describe("computeServingNutrition — fallbacks & edge cases", () => {
  it("cup with no matching serving uses generic fallback at reduced confidence", () => {
    const generic: ServingConvertibleFood = {
      basis: "mass",
      per100g: { caloriesKcal: 50, proteinG: 0, carbsG: 12, fatG: 0 },
      servings: [{ id: "g", label: "grams", grams: 1, unit: "g" }],
    };
    const r = computeServingNutrition(generic, { kind: "unit", unit: "cup", quantity: 1 });
    expect(r.grams).toBe(240);
    expect(r.servingConfidence).toBe(0.5);
  });

  it("ml assumes density ~1 with 0.7 confidence", () => {
    const r = computeServingNutrition(rice, { kind: "unit", unit: "ml", quantity: 100 });
    expect(r.grams).toBe(100);
    expect(r.servingConfidence).toBe(0.7);
  });

  it("unknown servingId falls back to default serving at reduced confidence", () => {
    const r = computeServingNutrition(egg, { kind: "serving", servingId: "nope", quantity: 2 });
    expect(r.grams).toBe(100);
    expect(r.servingConfidence).toBe(0.5);
  });

  it("non-positive quantity yields zero grams and zero nutrition", () => {
    const r = computeServingNutrition(rice, { kind: "unit", unit: "g", quantity: 0 });
    expect(r.grams).toBe(0);
    expect(r.nutrition.caloriesKcal).toBe(0);
    expect(r.servingConfidence).toBe(0);
  });

  it("NaN quantity is treated as invalid", () => {
    const r = computeServingNutrition(rice, { kind: "unit", unit: "g", quantity: Number.NaN });
    expect(r.grams).toBe(0);
    expect(r.servingConfidence).toBe(0);
  });
});

describe("scaleNutritionFromPer100g", () => {
  it("omits micros that are absent on the basis", () => {
    const per100g: NutritionPer100g = { caloriesKcal: 100, proteinG: 10, carbsG: 5, fatG: 2 };
    const scaled = scaleNutritionFromPer100g(per100g, 200);
    expect(scaled).toEqual({ caloriesKcal: 200, proteinG: 20, carbsG: 10, fatG: 4 });
    expect("fiberG" in scaled).toBe(false);
  });

  it("includes micros that are present", () => {
    const per100g: NutritionPer100g = {
      caloriesKcal: 100,
      proteinG: 10,
      carbsG: 5,
      fatG: 2,
      potassiumMg: 300,
      caffeineMg: 40,
    };
    const scaled = scaleNutritionFromPer100g(per100g, 50);
    expect(scaled.potassiumMg).toBe(150);
    expect(scaled.caffeineMg).toBe(20);
  });
});

describe("helpers", () => {
  it("defaultServing prefers the flagged serving", () => {
    const servings: FoodServing[] = [
      { id: "g", label: "grams", grams: 1, unit: "g" },
      { id: "cup", label: "1 cup", grams: 158, unit: "cup", isDefault: true },
    ];
    expect(defaultServing(servings)?.id).toBe("cup");
  });

  it("defaultServing falls back to the first entry", () => {
    const servings: FoodServing[] = [{ id: "a", label: "A", grams: 10 }];
    expect(defaultServing(servings)?.id).toBe("a");
  });

  it("gramsForSelection returns rounded grams", () => {
    expect(gramsForSelection(chicken, { kind: "unit", unit: "oz", quantity: 6 })).toBe(170.1);
  });
});
