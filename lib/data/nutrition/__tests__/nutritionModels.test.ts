import type { CanonicalEventListItem, RawEventListItem } from "@oli/contracts";
import { buildNutritionTodayCardModel } from "../nutritionTodayCardModel";
import { buildNutritionRecentMealRowsFromRaw } from "../nutritionRecentCardModel";
import { buildNutritionWeeklyStripMeta } from "../nutritionWeeklyStripMeta";
import {
  buildNutritionWeeklyInsightsModel,
  previousWeekBoundsFromWeekStart,
} from "../nutritionWeeklyInsightsModel";
import { buildNutritionAnalyticsSummaryModel } from "../nutritionAnalyticsSummaryModel";

function ev(
  partial: Pick<CanonicalEventListItem, "id" | "day" | "start" | "kind"> &
    Partial<CanonicalEventListItem>,
): CanonicalEventListItem {
  return {
    userId: "u1",
    sourceId: "manual",
    timezone: "UTC",
    end: partial.start,
    createdAt: partial.start,
    updatedAt: partial.start,
    schemaVersion: 1,
    ...partial,
  } as CanonicalEventListItem;
}

describe("buildNutritionTodayCardModel", () => {
  it("formats macro rows from DailyFacts nutrition slice", () => {
    const m = buildNutritionTodayCardModel({
      nutrition: { totalKcal: 2000, proteinG: 100, carbsG: 200, fatG: 60 },
    });
    expect(m.rows[0]?.valueLabel).toContain("2,000");
    expect(m.rows[1]?.valueLabel).toContain("100");
    expect(m.rows[0]?.available).toBe(true);
  });

  it("handles missing slice", () => {
    const m = buildNutritionTodayCardModel({ nutrition: undefined });
    expect(m.rows.every((r) => r.valueLabel === "—")).toBe(true);
    expect(m.rows.every((r) => r.progress === 0)).toBe(true);
  });

  it("exposes calorie hero labels and per-macro amount/percent", () => {
    const m = buildNutritionTodayCardModel({
      nutrition: { totalKcal: 220, proteinG: 4, carbsG: 43, fatG: 2.5 },
    });
    expect(m.calorieValueLabel).toBe("220 kcal");
    expect(m.calorieGoalLabel).toBe("Goal 2,000 kcal");
    const protein = m.rows.find((r) => r.key === "protein");
    expect(protein?.amountLabel).toBe("4 / 150 g");
    expect(protein?.percentLabel).toBe("3%");
    const carbs = m.rows.find((r) => r.key === "carbs");
    expect(carbs?.amountLabel).toBe("43 / 250 g");
  });

  it("hero label is em dash when no calories", () => {
    const m = buildNutritionTodayCardModel({ nutrition: undefined });
    expect(m.calorieValueLabel).toBe("—");
    expect(m.rows.find((r) => r.key === "protein")?.percentLabel).toBe("—");
  });
});

function rawNutrition(args: {
  id: string;
  observedAt: string;
  payload?: Record<string, unknown>;
}): RawEventListItem {
  const { id, observedAt } = args;
  const payload = {
    start: observedAt,
    end: observedAt,
    timezone: "UTC",
    totalKcal: 100,
    proteinG: 10,
    carbsG: 10,
    fatG: 5,
    ...args.payload,
  };
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "nutrition",
    observedAt,
    receivedAt: observedAt,
    schemaVersion: 1,
    payload,
  };
}

describe("buildNutritionRecentMealRowsFromRaw", () => {
  it("sorts newest first and caps limit", () => {
    const items: RawEventListItem[] = [
      rawNutrition({
        id: "a",
        observedAt: "2026-03-01T10:00:00.000Z",
        payload: { foodLabel: "Apple" },
      }),
      rawNutrition({
        id: "b",
        observedAt: "2026-03-02T10:00:00.000Z",
        payload: {
          totalKcal: 200,
          proteinG: 20,
          carbsG: 20,
          fatG: 10,
          foodLabel: "Chicken breast grilled",
        },
      }),
    ];
    const rows = buildNutritionRecentMealRowsFromRaw(items, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("b");
    expect(rows[0]?.title).toContain("Chicken");
  });

  it("uses food label when present", () => {
    const rows = buildNutritionRecentMealRowsFromRaw(
      [
        rawNutrition({
          id: "x",
          observedAt: "2026-03-02T12:00:00.000Z",
          payload: {
            totalKcal: 250,
            proteinG: 30,
            carbsG: 0,
            fatG: 5,
            foodLabel: "Chicken breast grilled",
            mealSlot: "lunch",
          },
        }),
      ],
      3,
    );
    expect(rows[0]?.title).toBe("Chicken breast grilled");
    expect(rows[0]?.kcalLabel).toBe("250 kcal");
    expect(rows[0]?.subtitle.toLowerCase()).toContain("lunch");
  });
});

describe("buildNutritionWeeklyStripMeta", () => {
  it("marks days with nutrition events", () => {
    const week = ["2026-03-09", "2026-03-10"] as const;
    const items = [ev({ id: "1", kind: "nutrition", day: "2026-03-10", start: "2026-03-10T12:00:00.000Z" })];
    const strip = buildNutritionWeeklyStripMeta(week, items);
    expect(strip[0]?.meta?.hasNutrition).toBe(false);
    expect(strip[1]?.meta?.hasNutrition).toBe(true);
  });
});

describe("buildNutritionWeeklyInsightsModel", () => {
  it("returns focus when current week empty but prior had logs", () => {
    const m = buildNutritionWeeklyInsightsModel({
      currentWeekStart: "2026-03-09",
      currentWeekEnd: "2026-03-15",
      previousWeekStart: "2026-03-02",
      previousWeekEnd: "2026-03-08",
      nutritionEvents: [
        ev({ id: "1", kind: "nutrition", day: "2026-03-05", start: "2026-03-05T12:00:00.000Z" }),
      ],
    });
    expect(m.insights.some((i) => i.kind === "focus")).toBe(true);
  });

  it("computes previous week bounds", () => {
    const b = previousWeekBoundsFromWeekStart("2026-03-09");
    expect(b.previousWeekStart).toBe("2026-03-02");
    expect(b.previousWeekEnd).toBe("2026-03-08");
  });
});

describe("buildNutritionAnalyticsSummaryModel", () => {
  it("counts active days inside range only", () => {
    const items = [
      ev({ id: "1", kind: "nutrition", day: "2026-01-10", start: "2026-01-10T12:00:00.000Z" }),
      ev({ id: "2", kind: "nutrition", day: "2026-01-10", start: "2026-01-10T18:00:00.000Z" }),
      ev({ id: "3", kind: "nutrition", day: "2025-01-01", start: "2025-01-01T12:00:00.000Z" }),
    ];
    const s = buildNutritionAnalyticsSummaryModel(items, "2026-01-01", "2026-01-31");
    expect(s.totalEvents).toBe(2);
    expect(s.activeDays).toBe(1);
    expect(s.avgEventsPerActiveDay).toBe(2);
  });
});
