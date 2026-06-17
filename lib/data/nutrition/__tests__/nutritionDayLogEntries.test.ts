import {
  buildNutritionDayLogEntries,
  buildNutritionDayLogRowVm,
} from "@/lib/data/nutrition/nutritionDayLogEntries";
import type { RawEventListItem } from "@oli/contracts";

describe("nutritionDayLogEntries", () => {
  const meal = (overrides: Partial<RawEventListItem> = {}): RawEventListItem => ({
    id: overrides.id ?? "meal1",
    userId: "u1",
    sourceId: "manual",
    kind: "nutrition",
    observedAt: overrides.observedAt ?? "2026-06-17T18:00:00.000Z",
    receivedAt: "2026-06-17T18:00:01.000Z",
    schemaVersion: 1,
    payload: {
      start: "2026-06-17T18:00:00.000Z",
      end: "2026-06-17T18:00:01.000Z",
      timezone: "America/New_York",
      day: "2026-06-17",
      totalKcal: 500,
      proteinG: 40,
      carbsG: 50,
      fatG: 10,
      logScope: "meal",
      foodLabel: "Lunch",
      mealSlot: "lunch",
    },
    ...overrides,
  });

  it("groups multiple meals on the same day into one recap row", () => {
    const entries = buildNutritionDayLogEntries(
      [
        meal({ id: "m1", payload: { ...meal().payload!, totalKcal: 500, proteinG: 40, carbsG: 50, fatG: 10 } }),
        meal({
          id: "m2",
          observedAt: "2026-06-17T20:00:00.000Z",
          payload: {
            ...meal().payload!,
            totalKcal: 1571,
            proteinG: 139,
            carbsG: 176,
            fatG: 37,
            foodLabel: "Dinner",
            mealSlot: "dinner",
          },
        }),
      ],
      "America/New_York",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.totalKcal).toBe(2071);
    expect(entries[0]?.proteinG).toBe(179);
    const row = buildNutritionDayLogRowVm(entries[0]!);
    expect(row.primaryMetric).toBe("Calories 2,071 kcal");
    expect(row.secondaryMetric).toBe("Protein 179 g · Carbs 226 g · Fat 47 g");
  });
});
