import type { CanonicalEventListItem } from "@oli/contracts";
import { buildNutritionTodayCardModel } from "../nutritionTodayCardModel";
import { buildNutritionRecentCardModel } from "../nutritionRecentCardModel";
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
});

describe("buildNutritionRecentCardModel", () => {
  it("sorts newest first and caps limit", () => {
    const items = [
      ev({ id: "a", kind: "nutrition", day: "2026-03-01", start: "2026-03-01T10:00:00.000Z" }),
      ev({ id: "b", kind: "nutrition", day: "2026-03-02", start: "2026-03-02T10:00:00.000Z" }),
      ev({ id: "c", kind: "strength_workout", day: "2026-03-02", start: "2026-03-02T12:00:00.000Z" }),
    ];
    const m = buildNutritionRecentCardModel(items, 1);
    expect(m.entries).toHaveLength(1);
    expect(m.entries[0]?.id).toBe("b");
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
