import { nutritionTotals } from "../facts/nutrition";

describe("nutritionTotals", () => {
  it("sums entry nutrients if totals absent", () => {
    const out = nutritionTotals({
      entries: [
        { inlineItem: { name: "A", nutrients: { kcal: 100, proteinG: 10 } }, servings: 1 },
        { inlineItem: { name: "B", nutrients: { kcal: 50 } }, servings: 2 },
      ],
    });
    expect(out.kcal).toBe(200);
    expect(out.proteinG).toBe(10);
  });
});
