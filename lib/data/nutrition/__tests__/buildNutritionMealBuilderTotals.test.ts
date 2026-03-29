import { buildNutritionMealBuilderTotals, createEmptyMealFoodRow } from "../buildNutritionMealBuilderTotals";

describe("buildNutritionMealBuilderTotals", () => {
  it("sums rows", () => {
    const r = buildNutritionMealBuilderTotals([
      { ...createEmptyMealFoodRow("a"), calories: "200", proteinG: "20", carbsG: "10", fatG: "5", fiberG: "2" },
      { ...createEmptyMealFoodRow("b"), calories: "100", proteinG: "5", carbsG: "0", fatG: "0", fiberG: "" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isEmpty).toBe(false);
    expect(r.totals.totalKcal).toBe(300);
    expect(r.totals.proteinG).toBe(25);
    expect(r.totals.carbsG).toBe(10);
    expect(r.totals.fatG).toBe(5);
    expect(r.totals.fiberG).toBe(2);
  });

  it("detects empty meal", () => {
    const r = buildNutritionMealBuilderTotals([createEmptyMealFoodRow("x")]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isEmpty).toBe(true);
  });

  it("rejects invalid numbers", () => {
    const r = buildNutritionMealBuilderTotals([
      { ...createEmptyMealFoodRow("x"), calories: "x", proteinG: "", carbsG: "", fatG: "", fiberG: "" },
    ]);
    expect(r.ok).toBe(false);
  });
});
