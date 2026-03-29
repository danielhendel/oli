import { mergeMealTotalsIntoDraftFields } from "../nutritionDayDraftMerge";
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";

describe("mergeMealTotalsIntoDraftFields", () => {
  const base: NutritionLogFormFields = {
    totalKcal: "1000",
    proteinG: "50",
    carbsG: "100",
    fatG: "30",
    fiberG: "5",
  };

  it("adds meal totals to draft", () => {
    const next = mergeMealTotalsIntoDraftFields(base, {
      totalKcal: 200,
      proteinG: 10,
      carbsG: 20,
      fatG: 5,
      fiberG: 3,
    });
    expect(next.totalKcal).toBe("1200");
    expect(next.proteinG).toBe("60");
    expect(next.carbsG).toBe("120");
    expect(next.fatG).toBe("35");
    expect(next.fiberG).toBe("8");
  });

  it("treats empty draft fields as zero", () => {
    const empty: NutritionLogFormFields = {
      totalKcal: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
      fiberG: "",
    };
    const next = mergeMealTotalsIntoDraftFields(empty, {
      totalKcal: 500,
      proteinG: 20,
      carbsG: 40,
      fatG: 10,
      fiberG: 0,
    });
    expect(next.totalKcal).toBe("500");
    expect(next.fiberG).toBe("");
  });
});
