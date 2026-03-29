import { buildNutritionMacroSummaryBarModel } from "../buildNutritionMacroSummaryBarModel";

describe("buildNutritionMacroSummaryBarModel", () => {
  it("marks ready when draft validates", () => {
    const m = buildNutritionMacroSummaryBarModel({
      totalKcal: "2000",
      proteinG: "100",
      carbsG: "200",
      fatG: "60",
      fiberG: "",
    });
    expect(m.isReadyToSave).toBe(true);
    expect(m.headline).toMatch(/2,?000/);
  });

  it("not ready when incomplete", () => {
    const m = buildNutritionMacroSummaryBarModel({
      totalKcal: "100",
      proteinG: "",
      carbsG: "",
      fatG: "",
      fiberG: "",
    });
    expect(m.isReadyToSave).toBe(false);
  });
});
