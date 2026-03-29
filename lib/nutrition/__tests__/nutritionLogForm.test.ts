import { validateNutritionLogForm } from "../nutritionLogForm";

describe("validateNutritionLogForm", () => {
  it("accepts valid required macros and optional empty fiber", () => {
    const r = validateNutritionLogForm({
      totalKcal: "2000",
      proteinG: "120",
      carbsG: "200",
      fatG: "60",
      fiberG: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.fiberG).toBeNull();
  });

  it("parses optional fiber", () => {
    const r = validateNutritionLogForm({
      totalKcal: "0",
      proteinG: "0",
      carbsG: "0",
      fatG: "0",
      fiberG: "15",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.fiberG).toBe(15);
  });

  it("rejects empty required fields", () => {
    const r = validateNutritionLogForm({
      totalKcal: "",
      proteinG: "1",
      carbsG: "1",
      fatG: "1",
      fiberG: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.totalKcal).toBeDefined();
  });

  it("rejects negative numbers", () => {
    const r = validateNutritionLogForm({
      totalKcal: "-1",
      proteinG: "0",
      carbsG: "0",
      fatG: "0",
      fiberG: "",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects calories above max", () => {
    const r = validateNutritionLogForm({
      totalKcal: "999999",
      proteinG: "0",
      carbsG: "0",
      fatG: "0",
      fiberG: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.totalKcal).toBeDefined();
  });
});
