import {
  buildDailyNutritionCardModel,
  formatGrams,
  formatKcal,
} from "@/lib/data/dash/buildDailyNutritionCardModel";

describe("buildDailyNutritionCardModel", () => {
  it("renders kcal and macros when data exists", () => {
    const model = buildDailyNutritionCardModel({
      totalKcal: 1850,
      proteinG: 142,
      carbsG: 210,
      fatG: 64,
    });

    expect(model.calorieLabel).toBe("1,850 kcal");
    expect(model.hasAnyNutrition).toBe(true);
    expect(model.rows).toEqual([
      { key: "protein", label: "Protein", valueLabel: "142 g" },
      { key: "carbs", label: "Carbs", valueLabel: "210 g" },
      { key: "fat", label: "Fat", valueLabel: "64 g" },
    ]);
  });

  it("handles missing nutrition data", () => {
    const model = buildDailyNutritionCardModel(undefined);
    expect(model.calorieLabel).toBe("—");
    expect(model.hasAnyNutrition).toBe(false);
    expect(model.rows.every((row) => row.valueLabel === "—")).toBe(true);
  });

  it("handles partial macros", () => {
    const model = buildDailyNutritionCardModel({
      totalKcal: 1200,
      proteinG: 95,
    });

    expect(model.calorieLabel).toBe("1,200 kcal");
    expect(model.rows).toEqual([
      { key: "protein", label: "Protein", valueLabel: "95 g" },
      { key: "carbs", label: "Carbs", valueLabel: "—" },
      { key: "fat", label: "Fat", valueLabel: "—" },
    ]);
    expect(model.hasAnyNutrition).toBe(true);
  });
});

describe("daily nutrition formatting", () => {
  it("formats kcal and grams with rounding and separators", () => {
    expect(formatKcal(1850.4)).toBe("1,850 kcal");
    expect(formatGrams(142.6)).toBe("143 g");
  });

  it("returns em dash for invalid values", () => {
    expect(formatKcal(undefined)).toBe("—");
    expect(formatGrams(-1)).toBe("—");
  });
});
