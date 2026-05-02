import { describe, it, expect } from "@jest/globals";
import {
  mapInstantSearchBody,
  mapNutritionixFoodDocToItem,
  OLI_NUTRITIONIX_BRANDED_PREFIX,
  OLI_NUTRITIONIX_COMMON_PREFIX,
  parseOliNutritionixFoodId,
} from "../mapNutritionixFood";

describe("parseOliNutritionixFoodId", () => {
  it("parses branded and common ids", () => {
    expect(parseOliNutritionixFoodId(`${OLI_NUTRITIONIX_BRANDED_PREFIX}nix123`)).toEqual({
      kind: "branded",
      nixItemId: "nix123",
    });
    expect(parseOliNutritionixFoodId(`${OLI_NUTRITIONIX_COMMON_PREFIX}tag42`)).toEqual({
      kind: "common",
      tagId: "tag42",
    });
    expect(parseOliNutritionixFoodId("dev_oats_40g")).toBeNull();
  });
});

describe("mapInstantSearchBody", () => {
  it("maps branded and common rows with stable ids", () => {
    const body = {
      branded: [
        {
          food_name: "Test Brand Food",
          brand_name: "BrandCo",
          nix_item_id: "nix_item_1",
          nf_calories: 120,
          serving_qty: 1,
          serving_unit: "cup",
        },
      ],
      common: [
        {
          food_name: "apple",
          tag_id: "tag_apple",
          nf_calories: 95,
          serving_qty: 1,
          serving_unit: "medium",
        },
      ],
    };
    const items = mapInstantSearchBody(body, 40);
    expect(items.some((i) => i.id === `${OLI_NUTRITIONIX_BRANDED_PREFIX}nix_item_1`)).toBe(true);
    expect(items.some((i) => i.id === `${OLI_NUTRITIONIX_COMMON_PREFIX}tag_apple`)).toBe(true);
    expect(items.find((i) => i.id.endsWith("nix_item_1"))?.brand).toBe("BrandCo");
    expect(items.find((i) => i.id.endsWith("tag_apple"))?.brand).toBeUndefined();
  });
});

describe("mapNutritionixFoodDocToItem", () => {
  it("maps nf_* fields and barcode when present", () => {
    const doc = {
      food_name: "BarFood",
      brand_name: "BrandCo",
      nix_item_id: "abc",
      nf_calories: 200,
      nf_protein: 10,
      nf_total_carbohydrate: 20,
      nf_total_fat: 5,
      nf_dietary_fiber: 3,
      nf_sugars: 8,
      nf_sodium: 150,
      nf_upc: "012345678905",
      serving_qty: 2,
      serving_unit: "oz",
    };
    const item = mapNutritionixFoodDocToItem(doc, `${OLI_NUTRITIONIX_BRANDED_PREFIX}abc`);
    expect(item.caloriesKcal).toBe(200);
    expect(item.proteinG).toBe(10);
    expect(item.carbsG).toBe(20);
    expect(item.fatG).toBe(5);
    expect(item.fiberG).toBe(3);
    expect(item.sugarG).toBe(8);
    expect(item.sodiumMg).toBe(150);
    expect(item.barcode).toBe("012345678905");
    expect(item.servingLabel).toContain("oz");
  });
});
