import { buildNutritionYearlyCardModel } from "@/lib/data/nutrition/nutritionYearlyCardModel";

describe("buildNutritionYearlyCardModel", () => {
  it("returns empty yearly card when no logs in year", () => {
    const model = buildNutritionYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: "2026-03-12",
      monthlyDayCounts: {},
      byDay: {},
    });
    expect(model.isEmpty).toBe(true);
    expect(model.months).toHaveLength(12);
    expect(model.title).toBe("2026 Nutrition");
  });
});
