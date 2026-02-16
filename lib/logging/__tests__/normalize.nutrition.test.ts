import { normalizeNutrition } from "../normalize";

describe("normalizeNutrition", () => {
  it("prefers totals but can sum entries", () => {
    const out = normalizeNutrition({
      entries: [
        { inlineItem: { name: "Egg", nutrients: { kcal: 70, proteinG: 6 } }, servings: 2 },
        { inlineItem: { name: "Toast", nutrients: { kcal: 100 } }, servings: 1 },
      ],
    });
    expect(out.entries?.length).toBe(2);
  });

  it("keeps provided totals", () => {
    const out = normalizeNutrition({ totals: { kcal: 500, proteinG: 40 } });
    expect(out.totals?.kcal).toBe(500);
    expect(out.totals?.proteinG).toBe(40);
  });
});
