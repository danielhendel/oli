import { describe, it, expect } from "@jest/globals";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { normalizeBrandForGraph, normalizeFoodNameForGraph } from "../foodGraphNormalize";
import { computeOliFoodIdFromItem, encodeSourceMapKey } from "../foodGraphIds";

describe("foodGraphNormalize", () => {
  it("normalizes like client normalizeFoodName", () => {
    expect(normalizeFoodNameForGraph("  Chicken   Breast  Grilled ")).toBe("chicken breast grilled");
  });

  it("normalizes brand", () => {
    expect(normalizeBrandForGraph("  Acme  ")).toBe("acme");
    expect(normalizeBrandForGraph(undefined)).toBe("");
  });
});

describe("foodGraphIds", () => {
  const baseItem = (over: Partial<NutritionFoodSearchItemDto>): NutritionFoodSearchItemDto => ({
    id: "tmp",
    name: "Test Food",
    servingLabel: "1 cup",
    caloriesKcal: 100,
    proteinG: 1,
    carbsG: 2,
    fatG: 3,
    ...over,
  });

  it("uses UPC path when barcode has enough digits", () => {
    const id = computeOliFoodIdFromItem(
      baseItem({ barcode: "012-34567-8905" }),
      "nutritionix:branded:x",
    );
    expect(id).toBe("oli:fg:upc:012345678905");
  });

  it("is deterministic for nutritionix source key", () => {
    const a = computeOliFoodIdFromItem(baseItem({}), "nutritionix:branded:abc123");
    const b = computeOliFoodIdFromItem(baseItem({ name: "Other" }), "nutritionix:branded:abc123");
    expect(a).toBe(b);
    expect(a.startsWith("oli:fg:v1:")).toBe(true);
  });

  it("is deterministic for dev catalog key", () => {
    const id = computeOliFoodIdFromItem(baseItem({ id: "dev_oats_40g" }), "dev_oats_40g");
    expect(id.startsWith("oli:fg:dev:")).toBe(true);
  });

  it("encodeSourceMapKey is stable", () => {
    expect(encodeSourceMapKey("nutritionix:branded:abc")).toBe(encodeSourceMapKey("nutritionix:branded:abc"));
  });
});
