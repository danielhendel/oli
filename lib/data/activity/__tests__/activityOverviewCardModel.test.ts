import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import { rollupEntryIsFailure } from "@/lib/data/activity/activityRollupErrorSummary";
import {
  ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP,
  buildActivityDailyDetailsCardModel,
  buildActivityOverviewCardModel,
  formatActivityAverageRowSummary,
  formatActivityDailyDetailsTitle,
  formatActivityTodayRowSummary,
} from "@/lib/data/activity/activityOverviewCardModel";

describe("formatActivityDailyDetailsTitle", () => {
  it('uses "Today" when selected is local today', () => {
    expect(formatActivityDailyDetailsTitle("2026-04-10", "2026-04-10")).toBe("Today");
  });

  it("uses weekday short date for historical selection", () => {
    expect(formatActivityDailyDetailsTitle("2026-04-05", "2026-04-10")).toMatch(/Sun/);
  });
});

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
  it("shows average per day with /day suffix", () => {
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
  const overviewAnchorDay = "2026-04-08";

  it("excludes error rollup days from trailing averages (only numeric daily-facts days count)", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-08": { kind: "numeric", steps: 7000 },
      "2026-04-07": { kind: "error", message: "network", requestId: "x" },
    };
    expect(rollupEntryIsFailure(rollup["2026-04-07"])).toBe(true);
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay, rollupByDay: rollup });
    expect(timeframes[0]?.compactStatsSummary).toBe("7,000 steps");
    // 7d window: only 2026-04-08 is numeric; others absent → avg = 7000 / 1
    expect(timeframes[1]?.compactStatsSummary).toBe("7,000/day");
  });

  it("orders rows Today, 7D Avg, 30D Avg, 365D Avg", () => {
    const rollup = numericMap([["2026-04-08", 7000]]);
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay, rollupByDay: rollup });
    expect(timeframes.map((r) => r.key)).toEqual(["today", "avg7d", "avg30d", "avg365d"]);
    expect(timeframes.map((r) => r.label)).toEqual(["Today", "7D Avg", "30D Avg", "365D Avg"]);
  });

  it("uses fixed trailing windows: 7/30/365 days inclusive of overview anchor day", () => {
    const rollup = numericMap([
      ["2026-04-02", 1000],
      ["2026-04-03", 1000],
      ["2026-04-04", 1000],
      ["2026-04-05", 1000],
      ["2026-04-06", 1000],
      ["2026-04-07", 1000],
      ["2026-04-08", 7000],
    ]);
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay, rollupByDay: rollup });
    expect(timeframes[0]?.compactStatsSummary).toBe("7,000 steps");
    // sum 7d = 6×1000 + 7000 = 13_000; all 7 days numeric → / 7
    expect(timeframes[1]?.compactStatsSummary).toBe("1,857/day");
    // 30d window contains the same 7 numeric days; rest absent → 13_000 / 7
    expect(timeframes[2]?.compactStatsSummary).toBe("1,857/day");
    // 365d window: same seven numeric days in range, remainder absent → 13_000 / 7
    expect(timeframes[3]?.compactStatsSummary).toBe("1,857/day");
  });

  it("365D average uses only numeric days in window (not fixed 365 denominator)", () => {
    const pairs: [string, number][] = [];
    for (let i = 0; i < 10; i += 1) {
      const d = `2026-04-${String(i + 1).padStart(2, "0")}` as `${string}-${string}-${string}`;
      pairs.push([d, 3650]);
    }
    const rollup = numericMap(pairs);
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-10", rollupByDay: rollup });
    // 10 days × 3650 = 36_500 / 10
    expect(timeframes[3]?.compactStatsSummary).toBe("3,650/day");
  });

  it("returns 0/day when the trailing window has no numeric rollups", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "absent" },
      "2026-04-08": { kind: "error", message: "x", requestId: null },
    };
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-08", rollupByDay: rollup });
    expect(timeframes[1]?.compactStatsSummary).toBe("0/day");
    expect(timeframes[2]?.compactStatsSummary).toBe("0/day");
    expect(timeframes[3]?.compactStatsSummary).toBe("0/day");
  });

  it("trailing averages ignore absent days: only valid numeric rollups in the denominator", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-08": { kind: "numeric", steps: 3000 },
      "2026-04-06": { kind: "numeric", steps: 1000 },
      "2026-04-04": { kind: "numeric", steps: 0 },
    };
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-08", rollupByDay: rollup });
    // 7d window Apr 2–8: numeric Apr 4 (0), Apr 6 (1000), Apr 8 (3000); Apr 2,3,5,7 absent → 4000/3
    expect(timeframes[1]?.compactStatsSummary).toBe("1,333/day");
  });

  it("treats days missing from the rollup map like 404/absent (undefined cell, not 0 in denominator)", () => {
    // Only today is present; other 6 days in the 7D window were never fetched into the map
    const rollup = numericMap([["2026-04-08", 7000]]);
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-08", rollupByDay: rollup });
    expect(timeframes[1]?.compactStatsSummary).toBe("7,000/day");
  });

  it("mixes explicit absent entries (404-shaped) with numeric days in a partial 7D window", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-06": { kind: "absent" },
      "2026-04-07": { kind: "absent" },
      "2026-04-08": { kind: "numeric", steps: 9000 },
    };
    const { timeframes } = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-08", rollupByDay: rollup });
    expect(timeframes[1]?.compactStatsSummary).toBe("9,000/day");
  });

  it("exposes marker positions within 0–1 for bars", () => {
    const { timeframes } = buildActivityOverviewCardModel({
      overviewAnchorDay,
      rollupByDay: numericMap([[overviewAnchorDay, ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP]]),
    });
    for (const tf of timeframes) {
      expect(tf.markerPosition01).toBeGreaterThanOrEqual(0);
      expect(tf.markerPosition01).toBeLessThanOrEqual(1);
    }
    expect(timeframes[0]?.markerPosition01).toBe(1);
  });
});

describe("buildActivityDailyDetailsCardModel", () => {
  it("uses selected day rollup independent of overview anchor row", () => {
    const rollup = numericMap([
      ["2026-04-05", 100],
      ["2026-04-08", 9999],
    ]);
    const m = buildActivityDailyDetailsCardModel({
      selectedDay: "2026-04-05",
      todayDayKey: "2026-04-08",
      rollupByDay: rollup,
    });
    expect(m.compactStatsSummary).toBe("100 steps");
    const overview = buildActivityOverviewCardModel({ overviewAnchorDay: "2026-04-08", rollupByDay: rollup });
    expect(overview.timeframes[0]?.compactStatsSummary).toBe("9,999 steps");
  });
});
