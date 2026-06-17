import type { RawEventListItem } from "@oli/contracts";
import { buildNutritionDayMealEntries } from "@/lib/data/nutrition/nutritionDayMealEntries";

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
      totalKcal: 220,
      proteinG: 5,
      carbsG: 43,
      fatG: 2.5,
      logScope: "meal",
      ...args.payload,
    },
  };
}

describe("buildNutritionDayMealEntries", () => {
  it("returns timestamped, newest-first entries with parsed payload", () => {
    const entries = buildNutritionDayMealEntries([
      rawNutrition({
        id: "a",
        observedAt: "2026-03-15T10:00:00.000Z",
        payload: { foodLabel: "Eggs", mealSlot: "breakfast" },
      }),
      rawNutrition({
        id: "b",
        observedAt: "2026-03-15T18:00:00.000Z",
        payload: { foodLabel: "Jasmine Rice", mealSlot: "dinner", totalKcal: 200 },
      }),
    ]);
    expect(entries.map((e) => e.id)).toEqual(["b", "a"]);
    expect(entries[0]?.title).toBe("Jasmine Rice");
    expect(entries[0]?.mealLabel).toBe("Meal 3");
    expect(entries[0]?.kcalLabel).toBe("200 kcal");
    expect(entries[0]?.subtitle.toLowerCase()).toContain("meal 3");
    expect(entries[0]?.mealSlot).toBe("dinner");
    expect(entries[0]?.editable).toBe(true);
    expect(entries[0]?.payload.totalKcal).toBe(200);
  });

  it("marks day_aggregate entries non-editable", () => {
    const entries = buildNutritionDayMealEntries([
      rawNutrition({
        id: "agg",
        observedAt: "2026-03-15T12:00:00.000Z",
        payload: { logScope: "day_aggregate", foodLabel: undefined },
      }),
    ]);
    expect(entries[0]?.editable).toBe(false);
    expect(entries[0]?.title).toBe("Quick add");
  });

  it("skips non-nutrition and unparseable rows", () => {
    const entries = buildNutritionDayMealEntries([
      { id: "w", userId: "u1", sourceId: "manual", kind: "workout", observedAt: "2026-03-15T12:00:00.000Z", receivedAt: "2026-03-15T12:00:00.000Z", schemaVersion: 1, payload: {} } as RawEventListItem,
      rawNutrition({ id: "bad", observedAt: "2026-03-15T12:00:00.000Z", payload: { totalKcal: -5 } }),
    ]);
    expect(entries).toHaveLength(0);
  });
});
