import { foodToAddPantryRequest, pantryItemToFood } from "@/lib/nutrition/pantryFood";
import { addPantryItemRequestSchema, type PantryItem } from "@oli/contracts/nutritionPantry";
import { nutritionFoodSearchItemDtoSchema, type NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

const chicken: NutritionFoodSearchItemDto = {
  id: "oli:fg:chicken",
  name: "Chicken breast",
  servingLabel: "120 g",
  caloriesKcal: 198,
  proteinG: 37.2,
  carbsG: 0,
  fatG: 4.32,
  productType: "food",
  source: "usda",
};

const devItem: NutritionFoodSearchItemDto = {
  id: "dev:greek-yogurt",
  name: "Greek yogurt",
  servingLabel: "1 cup",
  caloriesKcal: 100,
  proteinG: 17,
  carbsG: 6,
  fatG: 0.7,
};

describe("foodToAddPantryRequest", () => {
  it("stores the canonical oliFoodId and scaled macros for the chosen serving", () => {
    const req = foodToAddPantryRequest(chicken, 2);
    const parsed = addPantryItemRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
    expect(req.oliFoodId).toBe("oli:fg:chicken");
    expect(req.productType).toBe("food");
    expect(req.servingLabel).toBe("120 g");
    expect(req.defaultServings).toBe(2);
    expect(req.macrosPerServing.caloriesKcal).toBeCloseTo(396, 1);
    expect(req.macrosPerServing.proteinG).toBeCloseTo(74.4, 1);
  });

  it("omits oliFoodId for non Food-Graph ids and defaults multiplier to 1", () => {
    const req = foodToAddPantryRequest(devItem, 0);
    expect(req.oliFoodId).toBeUndefined();
    expect(req.defaultServings).toBe(1);
    expect(req.macrosPerServing.caloriesKcal).toBe(100);
  });
});

describe("pantryItemToFood", () => {
  it("reconstructs a loggable food at one saved serving", () => {
    const item: PantryItem = {
      id: "p1",
      label: "Chicken breast",
      oliFoodId: "oli:fg:chicken",
      productType: "food",
      servingLabel: "120 g",
      defaultServings: 2,
      macrosPerServing: { caloriesKcal: 396, proteinG: 74.4, carbsG: 0, fatG: 8.64 },
      addedAt: "2026-03-15T00:00:00.000Z",
      schemaVersion: 1,
    };
    const f = pantryItemToFood(item);
    expect(nutritionFoodSearchItemDtoSchema.safeParse(f).success).toBe(true);
    expect(f.id).toBe("oli:fg:chicken");
    expect(f.name).toBe("Chicken breast");
    expect(f.caloriesKcal).toBe(396);
    expect(f.servingLabel).toBe("120 g");
  });

  it("falls back to the item id and a default serving label", () => {
    const item: PantryItem = {
      id: "p2",
      label: "House protein bar",
      macrosPerServing: { caloriesKcal: 210, proteinG: 20, carbsG: 22, fatG: 7 },
      addedAt: "2026-03-15T00:00:00.000Z",
      schemaVersion: 1,
    };
    const f = pantryItemToFood(item);
    expect(f.id).toBe("p2");
    expect(f.servingLabel).toBe("1 serving");
  });
});
