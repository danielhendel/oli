import type { RawEventListItem } from "@oli/contracts";
import { resolveNutritionDisplayNutrition } from "@/lib/data/nutrition/nutritionDisplayNutrition";
import {
  formatNutritionTotalsDebugReport,
  rollupNutritionTotalsFromRawEvents,
} from "@/lib/data/nutrition/nutritionRawDayRollup";

function rawMeal(id: string, macros: { totalKcal: number; proteinG: number; carbsG: number; fatG: number }) {
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "nutrition" as const,
    observedAt: "2026-03-15T12:00:00.000Z",
    receivedAt: "2026-03-15T12:00:00.000Z",
    schemaVersion: 1,
    payload: {
      start: "2026-03-15T12:00:00.000Z",
      end: "2026-03-15T12:00:01.000Z",
      timezone: "UTC",
      day: "2026-03-15",
      logScope: "meal",
      foodLabel: `Food ${id}`,
      ...macros,
    },
  } satisfies RawEventListItem;
}

describe("rollupNutritionTotalsFromRawEvents", () => {
  it("sums calories and macros across meal raw events", () => {
    const rollup = rollupNutritionTotalsFromRawEvents([
      rawMeal("a", { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 }),
      rawMeal("b", { totalKcal: 180, proteinG: 12, carbsG: 10, fatG: 8 }),
    ]);
    expect(rollup).toEqual({
      totalKcal: 400,
      proteinG: 17,
      carbsG: 53,
      fatG: 10.5,
      eventCount: 2,
    });
  });

  it("returns zero event count when no nutrition rows", () => {
    expect(rollupNutritionTotalsFromRawEvents([]).eventCount).toBe(0);
  });
});

describe("resolveNutritionDisplayNutrition", () => {
  it("prefers raw rollup when raw events are ready", () => {
    const rawRollup = rollupNutritionTotalsFromRawEvents([
      rawMeal("a", { totalKcal: 100, proteinG: 10, carbsG: 5, fatG: 2 }),
    ]);
    const resolved = resolveNutritionDisplayNutrition({
      factsNutrition: { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 },
      rawRollup,
      rawEventsReady: true,
    });
    expect(resolved.nutrition?.totalKcal).toBe(100);
    expect(resolved.totalsSyncing).toBe(true);
  });

  it("drops to empty totals when raw rollup has no events after delete", () => {
    const resolved = resolveNutritionDisplayNutrition({
      factsNutrition: { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 },
      rawRollup: { totalKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, eventCount: 0 },
      rawEventsReady: true,
    });
    expect(resolved.nutrition).toBeUndefined();
    expect(resolved.totalsSyncing).toBe(true);
  });

  it("falls back to DailyFacts when raw events are not ready", () => {
    const resolved = resolveNutritionDisplayNutrition({
      factsNutrition: { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 },
      rawRollup: null,
      rawEventsReady: false,
    });
    expect(resolved.nutrition?.totalKcal).toBe(220);
    expect(resolved.totalsSyncing).toBe(false);
  });
});

describe("formatNutritionTotalsDebugReport", () => {
  it("includes raw and facts totals for diagnostics", () => {
    const report = formatNutritionTotalsDebugReport({
      dayKey: "2026-03-15",
      rawRollup: { totalKcal: 100, proteinG: 10, carbsG: 5, fatG: 2, eventCount: 1 },
      factsNutrition: { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 },
      factsComputedAt: "2026-03-15T20:00:00.000Z",
    });
    expect(report).toContain("rawKcal=100");
    expect(report).toContain("factsKcal=220");
    expect(report).toContain("factsComputedAt=2026-03-15T20:00:00.000Z");
  });
});
