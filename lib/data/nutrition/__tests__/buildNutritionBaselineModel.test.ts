import { buildNutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";

describe("buildNutritionBaselineModel", () => {
  it("returns baseline rows with placeholders when no data", () => {
    const model = buildNutritionBaselineModel({
      todayDayKey: "2026-03-12",
      byDay: {},
      nutritionEvents: [],
    });
    expect(model.rows).toHaveLength(5);
    expect(model.rows[0]?.label).toBe("7 Day");
    expect(model.personalizedExplainer.length).toBeGreaterThan(0);
  });
});
