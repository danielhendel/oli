import { buildComposedMealNutritionPayload } from "@/lib/nutrition/composedMealNutritionPayload";

describe("buildComposedMealNutritionPayload", () => {
  const base = {
    dayKey: "2026-03-15",
    timeZone: "America/New_York",
    observedAtIso: "2026-03-15T18:00:00.000Z",
    name: "Eggs & Rice",
    totals: { caloriesKcal: 340, proteinG: 16, carbsG: 45, fatG: 10.4, fiberG: 1.2 },
    itemCount: 2,
  };

  it("builds a meal-scoped manual payload from totals", () => {
    const p = buildComposedMealNutritionPayload(base);
    expect(p.logScope).toBe("meal");
    expect(p.nutritionIngestSource).toBe("manual");
    expect(p.day).toBe("2026-03-15");
    expect(p.foodLabel).toBe("Eggs & Rice");
    expect(p.totalKcal).toBe(340);
    expect(p.proteinG).toBe(16);
    expect(p.fiberG).toBe(1.2);
    expect(p.start).toBe("2026-03-15T18:00:00.000Z");
    expect(p.end).toBe("2026-03-15T18:00:01.000Z");
    expect(p.providerResponse).toEqual({ provider: "meal_builder", itemCount: 2 });
    expect(typeof p.foodHash).toBe("string");
  });

  it("falls back to a default label and omits zero fiber", () => {
    const p = buildComposedMealNutritionPayload({
      ...base,
      name: "   ",
      totals: { ...base.totals, fiberG: 0 },
    });
    expect(p.foodLabel).toBe("Meal");
    expect(p.fiberG).toBeUndefined();
  });
});
