import { buildNutritionThisWeekCardModel } from "@/lib/data/nutrition/nutritionThisWeekCardModel";

describe("buildNutritionThisWeekCardModel", () => {
  it("returns empty state message when week has no logs", () => {
    const model = buildNutritionThisWeekCardModel({
      weekStart: "2026-03-09",
      weekEnd: "2026-03-15",
      byDay: {},
      nutritionEvents: [],
    });
    expect(model.hasData).toBe(false);
    expect(model.emptyMessage).toContain("Log Nutrition");
    expect(model.rows).toHaveLength(7);
  });
});
