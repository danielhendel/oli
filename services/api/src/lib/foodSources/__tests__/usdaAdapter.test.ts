import { describe, it, expect } from "@jest/globals";
import { foodGraphNodeInputSchema } from "@oli/contracts/nutritionProduct";
import { mapUsdaFoodToFoodGraphNode, type UsdaFood } from "../usdaAdapter";

describe("mapUsdaFoodToFoodGraphNode", () => {
  it("maps a Foundation food (flat nutrients + portions) to a canonical node", () => {
    const food: UsdaFood = {
      fdcId: 171287,
      description: "Egg, whole, raw, fresh",
      dataType: "Foundation",
      publishedDate: "2026-04-01",
      foodNutrients: [
        { nutrientNumber: "208", unitName: "KCAL", value: 143 },
        { nutrientNumber: "203", unitName: "G", value: 12.6 },
        { nutrientNumber: "204", unitName: "G", value: 9.5 },
        { nutrientNumber: "205", unitName: "G", value: 0.7 },
        { nutrientNumber: "307", unitName: "MG", value: 142 },
      ],
      foodPortions: [{ id: 1, amount: 1, gramWeight: 50, portionDescription: "1 large" }],
    };

    const node = mapUsdaFoodToFoodGraphNode(food, { sourceVersion: "2026-04" });
    expect(node).not.toBeNull();
    const parsed = foodGraphNodeInputSchema.parse(node);
    expect(parsed.sourceKey).toBe("usda:171287");
    expect(parsed.source).toBe("usda");
    expect(parsed.basis).toBe("mass");
    expect(parsed.per100g.caloriesKcal).toBe(143);
    expect(parsed.per100g.sodiumMg).toBe(142);
    expect(parsed.confidence).toBe(0.95);
    expect(parsed.attributionRequired).toBe(false);
    expect(parsed.sourceVersion).toBe("2026-04");
    expect(parsed.servings[0]?.isDefault).toBe(true);
    expect(parsed.servings[0]?.grams).toBe(50);
    // Always appends a gram unit serving.
    expect(parsed.servings.some((s) => s.id === "g" && s.unit === "g")).toBe(true);
  });

  it("handles nested nutrient shape (detail endpoint) and branded serving size", () => {
    const food: UsdaFood = {
      fdcId: 999001,
      description: "Branded Protein Bar",
      dataType: "Branded",
      brandName: "BrandCo",
      gtinUpc: "0123456789012",
      servingSize: 60,
      servingSizeUnit: "g",
      foodNutrients: [
        { nutrient: { number: "208", unitName: "KCAL" }, amount: 350 },
        { nutrient: { number: "203", unitName: "G" }, amount: 20 },
        { nutrient: { number: "204", unitName: "G" }, amount: 12 },
        { nutrient: { number: "205", unitName: "G" }, amount: 40 },
      ],
    };

    const node = mapUsdaFoodToFoodGraphNode(food);
    expect(node).not.toBeNull();
    const parsed = foodGraphNodeInputSchema.parse(node);
    expect(parsed.brand).toBe("BrandCo");
    expect(parsed.barcode).toBe("0123456789012");
    expect(parsed.confidence).toBe(0.8);
    expect(parsed.servings.find((s) => s.id === "usda_serving")?.grams).toBe(60);
  });

  it("derives kcal from Atwater factors when energy is missing", () => {
    const food: UsdaFood = {
      fdcId: 222,
      description: "Macro-only food",
      dataType: "SR Legacy",
      foodNutrients: [
        { nutrientNumber: "203", unitName: "G", value: 10 },
        { nutrientNumber: "205", unitName: "G", value: 10 },
        { nutrientNumber: "204", unitName: "G", value: 5 },
      ],
    };
    const node = mapUsdaFoodToFoodGraphNode(food);
    expect(node?.per100g.caloriesKcal).toBe(125); // 10*4 + 10*4 + 5*9
  });

  it("ignores kJ energy entries (number 208 in non-KCAL unit)", () => {
    const food: UsdaFood = {
      fdcId: 333,
      description: "kJ energy food",
      dataType: "Foundation",
      foodNutrients: [
        { nutrientNumber: "208", unitName: "kJ", value: 600 },
        { nutrientNumber: "203", unitName: "G", value: 5 },
        { nutrientNumber: "205", unitName: "G", value: 20 },
        { nutrientNumber: "204", unitName: "G", value: 1 },
      ],
    };
    const node = mapUsdaFoodToFoodGraphNode(food);
    // kJ ignored → derived 5*4 + 20*4 + 1*9 = 109
    expect(node?.per100g.caloriesKcal).toBe(109);
  });

  it("returns null when there is no usable energy/macro data", () => {
    const food: UsdaFood = {
      fdcId: 444,
      description: "Empty",
      dataType: "Foundation",
      foodNutrients: [],
    };
    expect(mapUsdaFoodToFoodGraphNode(food)).toBeNull();
  });

  it("returns null for an unnamed record", () => {
    const food: UsdaFood = {
      fdcId: 555,
      description: "   ",
      foodNutrients: [{ nutrientNumber: "208", unitName: "KCAL", value: 100 }],
    };
    expect(mapUsdaFoodToFoodGraphNode(food)).toBeNull();
  });
});
