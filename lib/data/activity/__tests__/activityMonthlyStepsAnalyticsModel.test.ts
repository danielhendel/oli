import {
  ACTIVITY_ANALYTICS_CHART_YEAR,
  buildActivityMonthlyStepsAnalyticsModel,
} from "@/lib/data/activity/activityMonthlyStepsAnalyticsModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";

describe("buildActivityMonthlyStepsAnalyticsModel", () => {
  const today: import("@/lib/ui/calendar/types").DayKey = "2026-05-02";
  const anchor: import("@/lib/ui/calendar/types").DayKey = "2026-05-01";

  it("uses average steps only across days with numeric rollup in that month", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-01-10": { kind: "numeric", steps: 1000 },
      "2026-01-12": { kind: "numeric", steps: 3000 },
      "2026-01-14": { kind: "absent" },
    };
    const m = buildActivityMonthlyStepsAnalyticsModel({
      rollupByDay: rollup,
      todayDayKey: today,
      baselineRollupByDay: rollup,
      overviewAnchorEndDay: anchor,
    });
    const jan = m.points.find((p) => p.monthKey === "2026-01");
    expect(jan?.value).toBe(2000);
  });

  it("does not label future months with values (builder still yields 0 height)", () => {
    const rollup: ActivityStepsRollupMap = {};
    const m = buildActivityMonthlyStepsAnalyticsModel({
      rollupByDay: rollup,
      todayDayKey: today,
      baselineRollupByDay: rollup,
      overviewAnchorEndDay: anchor,
    });
    const dec = m.points.find((p) => p.monthKey === `${ACTIVITY_ANALYTICS_CHART_YEAR}-12`);
    expect(dec?.value).toBe(0);
  });

  it("exposes header title with analytics year", () => {
    const m = buildActivityMonthlyStepsAnalyticsModel({
      rollupByDay: {},
      todayDayKey: today,
      baselineRollupByDay: {},
      overviewAnchorEndDay: anchor,
    });
    expect(m.headerTitle).toBe(`${ACTIVITY_ANALYTICS_CHART_YEAR} Steps`);
  });
});
