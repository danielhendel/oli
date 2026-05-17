import {
  ACTIVITY_THIS_WEEK_CHART_DAY_LABELS,
  buildActivityThisWeekCardModel,
  computeActivityThisWeekChartMaxScale,
} from "@/lib/data/activity/activityThisWeekCardModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";

describe("computeActivityThisWeekChartMaxScale", () => {
  it("never returns zero (all-zero steps and missing baseline)", () => {
    expect(
      computeActivityThisWeekChartMaxScale({
        baselineMeanSteps: null,
        chartPointValues: [0, 0, 0, 0, 0, 0, 0],
      }),
    ).toBe(500);
  });
});

describe("buildActivityThisWeekCardModel", () => {
  const week = [
    "2026-05-03",
    "2026-05-04",
    "2026-05-05",
    "2026-05-06",
    "2026-05-07",
    "2026-05-08",
    "2026-05-09",
  ] as const;

  it("emits Sun→Sat chart points — skips absent rows as zero, omits future days from values", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-05-03": { kind: "numeric", steps: 100 },
      "2026-05-04": { kind: "absent" },
      "2026-05-05": { kind: "numeric", steps: 5000 },
      "2026-05-06": { kind: "numeric", steps: 0 },
      "2026-05-07": { kind: "numeric", steps: 200 },
      "2026-05-08": { kind: "numeric", steps: 300 },
      "2026-05-09": { kind: "numeric", steps: 400 },
    };
    const model = buildActivityThisWeekCardModel({
      todayDayKey: "2026-05-05",
      weekDayKeys: [...week],
      rollupByDay: rollup,
      baselineMeanSteps: 3000,
    });
    expect(model.chartPoints).toHaveLength(7);
    expect(model.chartPoints.map((p) => p.displayLabel)).toEqual([...ACTIVITY_THIS_WEEK_CHART_DAY_LABELS]);
    expect(model.chartPoints.map((p) => p.dayKey)).toEqual([...week]);
    expect(model.chartPoints.map((p) => ({ v: p.value, f: p.isFutureDay }))).toEqual([
      { v: 100, f: false },
      { v: 0, f: false },
      { v: 5000, f: false },
      { v: 0, f: true },
      { v: 0, f: true },
      { v: 0, f: true },
      { v: 0, f: true },
    ]);
    expect(model.chartMaxScale).toBeGreaterThanOrEqual(500);
    expect(model.weeklyAverageMetricValue).toBe("2,550");
  });

  it("marks chart empty only when elapsed week has no numeric rollup", () => {
    const rollup: ActivityStepsRollupMap = {};
    const model = buildActivityThisWeekCardModel({
      todayDayKey: "2026-05-05",
      weekDayKeys: [...week],
      rollupByDay: rollup,
      baselineMeanSteps: null,
    });
    expect(model.isEmpty).toBe(true);
    expect(model.weeklyAverageMetricValue).toBeNull();
    expect(model.chartPoints).toHaveLength(7);
    expect(model.chartPoints.filter((p) => p.isFutureDay)).toHaveLength(4);
  });
});
