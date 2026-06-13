import { describe, it, expect } from "@jest/globals";
import { foodGraphNodeInputSchema } from "@oli/contracts/nutritionProduct";
import {
  mapOpenFoodFactsProductToFoodGraphNode,
  type OpenFoodFactsProduct,
} from "../openFoodFactsAdapter";

const nutella: OpenFoodFactsProduct = {
  code: "3017620422003",
  product_name: "Nutella",
  brands: "Ferrero, Nutella",
  nova_group: 4,
  rev: 312,
  serving_quantity: 15,
  serving_size: "15 g",
  nutriments: {
    "energy-kcal_100g": 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    sugars_100g: 56.3,
    fiber_100g: 0,
    salt_100g: 0.107,
  },
};

describe("mapOpenFoodFactsProductToFoodGraphNode", () => {
  it("maps an OFF product into a canonical node with ODbL attribution", () => {
    const node = mapOpenFoodFactsProductToFoodGraphNode(nutella);
    expect(node).not.toBeNull();
    const parsed = foodGraphNodeInputSchema.parse(node);
    expect(parsed.source).toBe("open");
    expect(parsed.attributionRequired).toBe(true);
    expect(parsed.sourceKey).toBe("open:upc:3017620422003");
    expect(parsed.barcode).toBe("3017620422003");
    expect(parsed.per100g.caloriesKcal).toBe(539);
    expect(parsed.per100g.proteinG).toBe(6.3);
    expect(parsed.brand).toBe("Ferrero");
    expect(parsed.processingClass).toBe("nova4");
    expect(parsed.sourceVersion).toBe("off:rev:312");
    // Community-sourced → capped confidence.
    expect(parsed.confidence).toBeLessThanOrEqual(0.7);
    // serving_quantity → grams serving present.
    expect(parsed.servings.some((s) => s.id === "off_serving" && s.grams === 15)).toBe(true);
  });

  it("derives sodium (mg) from salt (g)", () => {
    const node = mapOpenFoodFactsProductToFoodGraphNode(nutella);
    // 0.107 g salt / 2.5 * 1000 = 42.8 mg
    expect(node?.per100g.sodiumMg).toBe(42.8);
  });

  it("prefers sodium_100g over salt when present (g → mg)", () => {
    const node = mapOpenFoodFactsProductToFoodGraphNode({
      ...nutella,
      nutriments: { ...nutella.nutriments, sodium_100g: 0.2 },
    });
    expect(node?.per100g.sodiumMg).toBe(200);
  });

  it("falls back to a 100 g serving when serving_quantity is absent", () => {
    const node = mapOpenFoodFactsProductToFoodGraphNode({ ...nutella, serving_quantity: undefined });
    expect(node?.servings.some((s) => s.id === "off_100g" && s.grams === 100)).toBe(true);
  });

  it("returns null when product has no usable name", () => {
    expect(mapOpenFoodFactsProductToFoodGraphNode({ ...nutella, product_name: "" })).toBeNull();
  });

  it("returns null when product has no usable nutrition", () => {
    expect(
      mapOpenFoodFactsProductToFoodGraphNode({ code: "12345678", product_name: "Empty", nutriments: {} }),
    ).toBeNull();
  });

  it("yields canonical UPC identity for de-duplication (same barcode → same sourceKey)", () => {
    const a = mapOpenFoodFactsProductToFoodGraphNode(nutella);
    const b = mapOpenFoodFactsProductToFoodGraphNode({ ...nutella, product_name: "Nutella Hazelnut Spread", rev: 999 });
    expect(a?.sourceKey).toBe(b?.sourceKey);
    expect(a?.barcode).toBe(b?.barcode);
  });
});
