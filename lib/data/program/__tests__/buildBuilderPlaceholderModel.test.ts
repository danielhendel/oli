import { buildBuilderPlaceholderModel } from "@/lib/data/program/buildBuilderPlaceholderModel";

describe("buildBuilderPlaceholderModel", () => {
  it("builds the cardio placeholder with expected capability preview", () => {
    const model = buildBuilderPlaceholderModel("cardio");
    expect(model.type).toBe("cardio");
    expect(model.title).toBe("Cardio Builder");
    expect(model.comingSoonLabel).toBe("Coming soon");
    const text = model.capabilities.join(" ");
    expect(text).toMatch(/Zone 2/);
    expect(text).toMatch(/VO₂ Max/);
    expect(text).toMatch(/steps/i);
    expect(text).toMatch(/Heart-rate zones/i);
    expect(text).toMatch(/drift/i);
    expect(text).toMatch(/efficiency/i);
  });

  it("builds the nutrition placeholder with expected capability preview", () => {
    const model = buildBuilderPlaceholderModel("nutrition");
    expect(model.type).toBe("nutrition");
    const text = model.capabilities.join(" ");
    expect(text).toMatch(/Calorie/i);
    expect(text).toMatch(/Macros/i);
    expect(text).toMatch(/Meal timing/i);
    expect(text).toMatch(/Hydration/i);
    expect(text).toMatch(/Supplements/i);
    expect(text).toMatch(/adjustment/i);
  });

  it("builds the recovery placeholder with expected capability preview", () => {
    const model = buildBuilderPlaceholderModel("recovery");
    expect(model.type).toBe("recovery");
    const text = model.capabilities.join(" ");
    expect(text).toMatch(/Sleep/i);
    expect(text).toMatch(/HRV/);
    expect(text).toMatch(/Soreness/i);
    expect(text).toMatch(/mobility/i);
    expect(text).toMatch(/Deload/i);
    expect(text).toMatch(/Recovery score/i);
  });
});
