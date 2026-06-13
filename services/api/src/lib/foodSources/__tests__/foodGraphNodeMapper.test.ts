import { describe, it, expect } from "@jest/globals";
import type { FoodGraphNodeInput } from "@oli/contracts/nutritionProduct";
import { nutritionFoodSearchItemDtoSchema } from "@oli/contracts/nutritionFoodSearch";
import { foodGraphNodeInputToSearchDto } from "../foodGraphNodeMapper";

const rice: FoodGraphNodeInput = {
  sourceKey: "usda:seed:white_rice_cooked",
  source: "usda",
  name: "White rice, cooked",
  productType: "food",
  basis: "mass",
  per100g: { caloriesKcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4 },
  servings: [
    { id: "cup", label: "1 cup cooked", grams: 158, unit: "cup", isDefault: true },
    { id: "g", label: "grams", grams: 1, unit: "g" },
  ],
  defaultServingLabel: "1 cup cooked",
  confidence: 0.9,
  attributionRequired: false,
  sourceVersion: "usda-2026-04",
};

const offBarcoded: FoodGraphNodeInput = {
  sourceKey: "open:upc:3017620422003",
  source: "open",
  name: "Nutella",
  brand: "Ferrero",
  productType: "food",
  basis: "mass",
  per100g: { caloriesKcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9 },
  servings: [{ id: "off_serving", label: "15 g", grams: 15, isDefault: true }],
  barcode: "3017620422003",
  confidence: 0.6,
  attributionRequired: true,
};

describe("foodGraphNodeInputToSearchDto", () => {
  it("scales top-level macros to the default serving and carries per100g/servings", () => {
    const dto = foodGraphNodeInputToSearchDto(rice);
    const parsed = nutritionFoodSearchItemDtoSchema.parse(dto);
    // 158 g of 130 kcal/100 g → 205.4 kcal
    expect(parsed.caloriesKcal).toBe(205.4);
    expect(parsed.fiberG).toBe(0.63);
    expect(parsed.servingLabel).toBe("1 cup cooked");
    expect(parsed.per100g?.caloriesKcal).toBe(130);
    expect((parsed.servings ?? []).length).toBe(2);
    expect(parsed.source).toBe("usda");
    expect(parsed.confidence).toBe(0.9);
    expect(parsed.attributionRequired).toBe(false);
    expect(parsed.id.startsWith("oli:fg:")).toBe(true);
  });

  it("uses canonical UPC id for barcoded nodes and carries attribution", () => {
    const dto = foodGraphNodeInputToSearchDto(offBarcoded);
    expect(dto.id).toBe("oli:fg:upc:3017620422003");
    expect(dto.attributionRequired).toBe(true);
    expect(dto.barcode).toBe("3017620422003");
    expect(dto.brand).toBe("Ferrero");
  });

  it("is deterministic", () => {
    expect(foodGraphNodeInputToSearchDto(rice)).toEqual(foodGraphNodeInputToSearchDto(rice));
  });
});
