/**
 * Body Fat All must be a strict superset of 6M when older stored history exists.
 */
import { selectWeightSeriesForRange } from "@/lib/body/presentation/selectWeightSeriesForRange";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

function pt(dayKey: string, value: number): WeightPoint {
  return {
    observedAt: `${dayKey}T12:00:00.000Z`,
    dayKey,
    weightKg: value,
    sourceId: "apple_health",
  };
}

describe("selectWeightSeriesForRange — All vs 6M Body Fat history", () => {
  const anchorDayKey = "2026-09-21";

  const stored: WeightPoint[] = [
    pt("2023-06-15", 22.1),
    pt("2024-03-10", 20.4),
    pt("2025-01-05", 19.0),
    pt("2025-08-12", 18.5),
    pt("2026-07-28", 17.8),
    pt("2026-08-10", 17.2),
    pt("2026-09-01", 16.9),
    pt("2026-09-21", 16.5),
  ];

  it("6M returns only the latest six-month subset; All returns all valid points", () => {
    const sixM = selectWeightSeriesForRange(stored, "6M", { anchorDayKey });
    const all = selectWeightSeriesForRange(stored, "All", { anchorDayKey });

    expect(sixM.plottedPoints.length).toBeLessThan(all.plottedPoints.length);
    expect(all.plottedPoints.map((p) => p.dayKey)).toEqual(
      stored.map((p) => p.dayKey),
    );

    const sixIds = new Set(sixM.plottedPoints.map((p) => p.observedAt));
    for (const p of sixM.plottedPoints) {
      expect(all.plottedPoints.some((a) => a.observedAt === p.observedAt)).toBe(true);
    }
    // Older history present in All but not 6M.
    expect(sixIds.has("2023-06-15T12:00:00.000Z")).toBe(false);
    expect(all.plottedPoints.some((p) => p.dayKey === "2023-06-15")).toBe(true);
    expect(all.plottedPoints.some((p) => p.dayKey === "2024-03-10")).toBe(true);

    // Coverage dates differ.
    expect(sixM.plottedPoints[0]!.dayKey).not.toBe(all.plottedPoints[0]!.dayKey);
    expect(sixM.plottedPoints[sixM.plottedPoints.length - 1]!.dayKey).toBe(
      all.plottedPoints[all.plottedPoints.length - 1]!.dayKey,
    );
  });

  it("All plotted set is a strict superset of 6M when older history exists", () => {
    const sixM = selectWeightSeriesForRange(stored, "6M", { anchorDayKey });
    const all = selectWeightSeriesForRange(stored, "All", { anchorDayKey });
    const allIds = new Set(all.plottedPoints.map((p) => p.observedAt));
    for (const p of sixM.plottedPoints) {
      expect(allIds.has(p.observedAt)).toBe(true);
    }
    expect(all.plottedPoints.length).toBeGreaterThan(sixM.plottedPoints.length);
  });
});
