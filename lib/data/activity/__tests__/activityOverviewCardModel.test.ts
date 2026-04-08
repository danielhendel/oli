import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP,
  buildActivityOverviewCardModel,
  formatActivityAverageRowSummary,
  formatActivityTodayRowSummary,
} from "@/lib/data/activity/activityOverviewCardModel";

describe("formatActivityTodayRowSummary", () => {
  it("shows total steps only when numeric", () => {
    expect(formatActivityTodayRowSummary({ kind: "numeric", steps: 8432 })).toBe("8,432 steps");
  });

  it("shows honest absent copy when no rollup", () => {
    expect(formatActivityTodayRowSummary(undefined)).toBe("No daily rollup for this day");
    expect(formatActivityTodayRowSummary({ kind: "absent" })).toBe("No daily rollup for this day");
  });
});

describe("formatActivityAverageRowSummary", () => {
  it("shows average per day only", () => {
    expect(formatActivityAverageRowSummary(6026.8)).toBe("6,027/day");
  });
});

function numericMap(pairs: [string, number][]): ActivityStepsRollupMap {
  const out: ActivityStepsRollupMap = {};
  for (const [d, n] of pairs) {
    out[d] = { kind: "numeric", steps: n };
  }
  return out;
}

describe("buildActivityOverviewCardModel", () => {
  const selectedDay = "2026-04-09";
  const todayDayKey = "2026-04-09";

  it("orders rows Today, This Week, MTD, YTD", () => {
    const rollup = numericMap([
      ["2026-04-05", 1000],
      ["2026-04-06", 1000],
      ["2026-04-07", 1000],
      ["2026-04-08", 1000],
      ["2026-04-09", 1000],
      ["2026-04-01", 1000],
      ["2026-04-02", 1000],
      ["2026-01-01", 1000],
    ]);
    const { timeframes } = buildActivityOverviewCardModel({
      selectedDay,
      todayDayKey,
      rollupByDay: rollup,
    });
    expect(timeframes.map((r) => r.key)).toEqual(["today", "thisWeek", "mtd", "ytd"]);
    expect(timeframes.map((r) => r.label)).toEqual(["Today", "This Week", "MTD", "YTD"]);
  });

  it("Today shows total only; multi-day rows show average only (no totals in copy)", () => {
    const rollup = numericMap([
      ["2026-04-05", 4000],
      ["2026-04-06", 4000],
      ["2026-04-07", 4000],
      ["2026-04-08", 4000],
      ["2026-04-09", 8000],
    ]);
    const { timeframes } = buildActivityOverviewCardModel({
      selectedDay,
      todayDayKey,
      rollupByDay: rollup,
    });
    expect(timeframes[0]?.compactStatsSummary).toBe("8,000 steps");
    expect(timeframes[1]?.compactStatsSummary).toBe("4,800/day");
    expect(timeframes[1]?.compactStatsSummary).not.toContain("steps");
    expect(timeframes[2]?.compactStatsSummary).toMatch(/\/day$/);
    expect(timeframes[3]?.compactStatsSummary).toMatch(/\/day$/);
  });

  it("when Today is absent but week has numeric rollups, Today is honest and averages still compute", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-09": { kind: "absent" },
      "2026-04-05": { kind: "numeric", steps: 6000 },
      "2026-04-06": { kind: "numeric", steps: 6000 },
      "2026-04-07": { kind: "numeric", steps: 6000 },
      "2026-04-08": { kind: "numeric", steps: 6000 },
    };
    const { timeframes } = buildActivityOverviewCardModel({
      selectedDay: "2026-04-09",
      todayDayKey: "2026-04-09",
      rollupByDay: rollup,
    });
    expect(timeframes[0]?.compactStatsSummary).toBe("No daily rollup for this day");
    expect(timeframes[0]?.markerPosition01).toBe(0);
    expect(timeframes[1]?.compactStatsSummary).toBe("4,800/day");
  });

  it("uses weekday label when selected day is not local today", () => {
    const { timeframes } = buildActivityOverviewCardModel({
      selectedDay: "2026-04-07",
      todayDayKey: "2026-04-09",
      rollupByDay: numericMap([["2026-04-07", 500]]),
    });
    expect(timeframes[0]?.label).toMatch(/Tue/);
    expect(timeframes[0]?.compactStatsSummary).toBe("500 steps");
  });

  it("exposes marker positions within 0–1 for bars", () => {
    const { timeframes } = buildActivityOverviewCardModel({
      selectedDay,
      todayDayKey,
      rollupByDay: numericMap([[selectedDay, ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP]]),
    });
    for (const tf of timeframes) {
      expect(tf.markerPosition01).toBeGreaterThanOrEqual(0);
      expect(tf.markerPosition01).toBeLessThanOrEqual(1);
    }
    expect(timeframes[0]?.markerPosition01).toBe(1);
  });
});
