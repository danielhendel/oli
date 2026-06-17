import type { RawEventListItem } from "@oli/contracts";
import {
  buildNutritionMacroDetailModel,
  isNutritionMacroKey,
} from "@/lib/data/nutrition/nutritionMacroDetailModel";

function rawNutrition(args: {
  id: string;
  observedAt: string;
  payload?: Record<string, unknown>;
}): RawEventListItem {
  const { id, observedAt } = args;
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "nutrition",
    observedAt,
    receivedAt: observedAt,
    schemaVersion: 1,
    payload: {
      start: observedAt,
      end: observedAt,
      timezone: "UTC",
      totalKcal: 100,
      proteinG: 10,
      carbsG: 10,
      fatG: 5,
      ...args.payload,
    },
  };
}

describe("isNutritionMacroKey", () => {
  it("accepts macro keys only", () => {
    expect(isNutritionMacroKey("protein")).toBe(true);
    expect(isNutritionMacroKey("carbs")).toBe(true);
    expect(isNutritionMacroKey("fat")).toBe(true);
    expect(isNutritionMacroKey("kcal")).toBe(false);
    expect(isNutritionMacroKey("")).toBe(false);
  });
});

describe("buildNutritionMacroDetailModel", () => {
  it("uses DailyFacts rollup for amount/percent/progress", () => {
    const m = buildNutritionMacroDetailModel({
      macro: "protein",
      nutrition: { proteinG: 75 },
      rawItems: [],
    });
    expect(m.title).toBe("Protein");
    expect(m.currentValue).toBe(75);
    expect(m.targetValue).toBe(150);
    expect(m.amountLabel).toBe("75 / 150 g");
    expect(m.percentLabel).toBe("50%");
    expect(m.progress).toBeCloseTo(0.5, 5);
  });

  it("ranks contributing foods by macro grams desc and omits zero contributions", () => {
    const items: RawEventListItem[] = [
      rawNutrition({
        id: "a",
        observedAt: "2026-03-15T10:00:00.000Z",
        payload: { foodLabel: "Eggs", proteinG: 12, carbsG: 1, fatG: 10, mealSlot: "breakfast" },
      }),
      rawNutrition({
        id: "b",
        observedAt: "2026-03-15T13:00:00.000Z",
        payload: { foodLabel: "Chicken", proteinG: 40, carbsG: 0, fatG: 4, mealSlot: "lunch" },
      }),
      rawNutrition({
        id: "c",
        observedAt: "2026-03-15T18:00:00.000Z",
        payload: { foodLabel: "Olive Oil", proteinG: 0, carbsG: 0, fatG: 14 },
      }),
    ];
    const m = buildNutritionMacroDetailModel({
      macro: "protein",
      nutrition: { proteinG: 52 },
      rawItems: items,
    });
    expect(m.foods.map((f) => f.title)).toEqual(["Chicken", "Eggs"]);
    expect(m.foods[0]?.valueLabel).toBe("40 g");
    expect(m.foods[0]?.subtitle.toLowerCase()).toContain("lunch");
  });

  it("handles missing nutrition slice", () => {
    const m = buildNutritionMacroDetailModel({ macro: "fat", nutrition: undefined, rawItems: [] });
    expect(m.currentValue).toBeNull();
    expect(m.amountLabel).toBe("— / 65 g");
    expect(m.percentLabel).toBe("—");
    expect(m.progress).toBe(0);
    expect(m.foods).toHaveLength(0);
  });
});
