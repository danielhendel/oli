import { describe, it, expect } from "@jest/globals";
import { foodGraphNodeInputSchema } from "@oli/contracts/nutritionProduct";
import { SEED_FOOD_NODES, getSeedFoodGraphNodes } from "../seedFoodCatalog";

describe("SEED_FOOD_NODES", () => {
  it("every node is a valid food Food Graph input", () => {
    for (const node of SEED_FOOD_NODES) {
      const parsed = foodGraphNodeInputSchema.parse(node);
      expect(parsed.productType).toBe("food");
      expect(parsed.basis).toBe("mass");
      expect(parsed.per100g.caloriesKcal).toBeGreaterThanOrEqual(0);
      expect(parsed.servings.some((s) => s.isDefault)).toBe(true);
      expect(parsed.servings.some((s) => s.id === "g" && s.unit === "g")).toBe(true);
    }
  });

  it("uses unique source keys", () => {
    const keys = SEED_FOOD_NODES.map((n) => n.sourceKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers the P0 minimum food list", () => {
    const names = SEED_FOOD_NODES.map((n) => n.name.toLowerCase());
    const required = [
      "egg",
      "egg white",
      "chicken breast",
      "rotisserie",
      "turkey",
      "ground beef",
      "salmon",
      "tuna",
      "shrimp",
      "greek yogurt",
      "white rice",
      "brown rice",
      "quinoa",
      "oats",
      "sweet potato",
      "potato",
      "pasta",
      "bread",
      "banana",
      "apple",
      "blueberries",
      "olive oil",
      "avocado",
      "almonds",
      "peanut butter",
      "broccoli",
      "spinach",
      "pepper",
      "onion",
    ];
    for (const needle of required) {
      expect(names.some((n) => n.includes(needle))).toBe(true);
    }
  });

  it("getSeedFoodGraphNodes includes supplements", () => {
    const all = getSeedFoodGraphNodes();
    expect(all.some((n) => n.productType === "supplement")).toBe(true);
    expect(all.length).toBe(SEED_FOOD_NODES.length + 6);
  });

  it("exposes a default gram-weighted serving for deterministic scaling", () => {
    const chicken = SEED_FOOD_NODES.find((n) => n.sourceKey === "usda:seed:chicken_breast");
    expect(chicken).toBeDefined();
    if (!chicken) return;
    const defaultServing = chicken.servings.find((s) => s.isDefault);
    expect(defaultServing?.grams).toBe(113);
    // 113 g of 31 g/100 g protein → 35.03 g (validated end-to-end in the
    // serving conversion engine test).
    expect(Math.round((chicken.per100g.proteinG * 113) / 100 * 100) / 100).toBe(35.03);
  });
});
