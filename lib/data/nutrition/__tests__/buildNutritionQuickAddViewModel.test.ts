import { buildNutritionQuickAddViewModel } from "../buildNutritionQuickAddViewModel";

describe("buildNutritionQuickAddViewModel", () => {
  it("maps errors onto macro rows", () => {
    const vm = buildNutritionQuickAddViewModel({
      fields: {
        totalKcal: "",
        proteinG: "1",
        carbsG: "1",
        fatG: "1",
        fiberG: "",
      },
      displayedFieldErrors: { totalKcal: "Calories is required" },
    });
    expect(vm.macroRows[0]!.error).toBe("Calories is required");
    expect(vm.fiber.error).toBeUndefined();
  });
});
