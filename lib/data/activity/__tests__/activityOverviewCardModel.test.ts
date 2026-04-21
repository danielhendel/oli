import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import { rollupEntryIsFailure } from "@/lib/data/activity/activityRollupErrorSummary";
import {
  ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP,
  buildActivityBaselineCardModel,
  buildActivityDailyDetailsCardModel,
  buildActivityOverviewCardModel,
  buildActivityTodayStepsLiveCardModel,
  formatActivityAverageRowSummary,
  formatActivityDailyDetailsTitle,
  formatActivityTodayRowSummary,
  parseActivityDailyDetailsNumericSteps,
} from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("formatActivityDailyDetailsTitle", () => {
  it('uses "Today" when selected is local today', () => {
    expect(formatActivityDailyDetailsTitle("2026-04-10", "2026-04-10")).toBe("Today");
  });

  it("uses weekday short date for historical selection", () => {
    expect(formatActivityDailyDetailsTitle("2026-04-05", "2026-04-10")).toMatch(/Sun/);
  });
});

describe("parseActivityDailyDetailsNumericSteps", () => {
  it("parses formatted steps summaries", () => {
    expect(parseActivityDailyDetailsNumericSteps("7,524 steps")).toBe(7524);
    expect(parseActivityDailyDetailsNumericSteps("Not enough data")).toBeNull();
    expect(parseActivityDailyDetailsNumericSteps("No daily rollup for this day")).toBeNull();
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

function fillTrailingNumeric(end: string, dayCount: number, steps: number): ActivityStepsRollupMap {
  const days = activityTrailingNDaysInclusive(end, dayCount);
  return numericMap(days.map((d) => [d, steps]));
}

function overviewAnchorFromToday(today: DayKey): DayKey {
  return addCalendarDaysToDayKey(today, -1);
}

function buildOverview(rollup: ActivityStepsRollupMap, today: DayKey) {
  return buildActivityOverviewCardModel({
    overviewAnchorEndDay: overviewAnchorFromToday(today),
    rollupByDay: rollup,
  });
}

describe("buildActivityOverviewCardModel", () => {
  const today: DayKey = "2026-04-08";
  const anchor = overviewAnchorFromToday(today);

  it("orders rows Yesterday, 7 Day, 30 Day, YTD, 12 Month", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT, 1000);
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes.map((r) => r.key)).toEqual(["yesterday", "day7", "day30", "ytd", "month12"]);
    expect(timeframes.map((r) => r.label)).toEqual(["Yesterday", "7 Day", "30 Day", "YTD", "12 Month"]);
  });

  it("anchors overview to yesterday of today, not a future strip day", () => {
    const todayKey: DayKey = "2026-04-14";
    const anchorKey = overviewAnchorFromToday(todayKey);
    const rollup = fillTrailingNumeric(anchorKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT, 2000);
    const { timeframes } = buildActivityOverviewCardModel({
      overviewAnchorEndDay: anchorKey,
      rollupByDay: rollup,
    });
    const d7 = activityTrailingNDaysInclusive(anchorKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const sum7 = d7.length * 2000;
    expect(timeframes[1]?.compactStatsSummary).toBe(`${Math.round(sum7 / 7).toLocaleString()}/day`);
  });

  it("7 Day: full numeric window => mean; missing any day => Not enough data", () => {
    const full = numericMap([
      ["2026-04-01", 1000],
      ["2026-04-02", 1000],
      ["2026-04-03", 1000],
      ["2026-04-04", 1000],
      ["2026-04-05", 1000],
      ["2026-04-06", 1000],
      ["2026-04-07", 7000],
    ]);
    const { timeframes: ok } = buildOverview(full, today);
    expect(ok[1]?.compactStatsSummary).toBe("1,857/day");

    const partial: ActivityStepsRollupMap = {
      ...full,
      "2026-04-05": { kind: "absent" },
    };
    const { timeframes: bad } = buildOverview(partial, today);
    expect(bad[1]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
  });

  it("30 Day: requires all 30 numeric days", () => {
    const rollup = fillTrailingNumeric(anchor, 30, 3000);
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[2]?.compactStatsSummary).toBe("3,000/day");

    const gap = { ...rollup, "2026-03-20": { kind: "error", message: "x", requestId: null } as const };
    const { timeframes: err } = buildOverview(gap, today);
    expect(err[2]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
  });

  it("YTD and 12 Month: any error day in window => Not enough data (no silent zero-fill)", () => {
    const ytdDays = activityYtdInclusiveThroughEndDay(anchor);
    const rollupYtd = numericMap(ytdDays.map((d) => [d, 1000]));
    const failYtd = ytdDays[Math.floor(ytdDays.length / 2)]!;
    rollupYtd[failYtd] = { kind: "error", message: "503", requestId: "r1" };
    const ytdRow = buildOverview(rollupYtd, today);
    expect(ytdRow.timeframes[3]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(ytdRow.timeframes[3]?.markerPosition01).toBe(0);

    const d365 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    const rollup365 = numericMap(d365.map((d) => [d, 500]));
    const fail365 = d365[100]!;
    rollup365[fail365] = { kind: "error", message: "503", requestId: null };
    const m12 = buildOverview(rollup365, today);
    expect(m12.timeframes[4]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(m12.timeframes[4]?.markerPosition01).toBe(0);
  });

  it("YTD: fixed denominator Jan 1..anchor; missing days count as 0 in numerator", () => {
    const ytdDays = activityYtdInclusiveThroughEndDay(anchor);
    const rollup = numericMap(ytdDays.map((d) => [d, 1000]));
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[3]?.compactStatsSummary).toBe("1,000/day");

    const sparse: ActivityStepsRollupMap = { "2026-04-07": { kind: "numeric", steps: 7000 } };
    const { timeframes: partial } = buildOverview(sparse, today);
    const denom = ytdDays.length;
    expect(partial[3]?.compactStatsSummary).toBe(`${Math.round(7000 / denom).toLocaleString()}/day`);
  });

  it("12 Month: rolling average uses fixed 365 denominator; 10 days at 10k and 355 missing => ~274/day", () => {
    const d365 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    const rollup: ActivityStepsRollupMap = {};
    for (const d of d365.slice(-10)) {
      rollup[d] = { kind: "numeric", steps: 10_000 };
    }
    const { timeframes } = buildOverview(rollup, today);
    const expected = (10 * 10_000) / 365;
    expect(Math.round(expected)).toBe(274);
    expect(timeframes[4]?.compactStatsSummary).toBe(`${Math.round(expected).toLocaleString()}/day`);
  });

  it("12 Month: absent map entries count as 0 (not NED)", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT, 500);
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[4]?.compactStatsSummary).toBe("500/day");

    const oneMissing = { ...rollup };
    delete (oneMissing as Record<string, unknown>)["2025-04-09"];
    const { timeframes: withGap } = buildOverview(oneMissing, today);
    const expectedAvg = (364 * 500) / 365;
    expect(withGap[4]?.compactStatsSummary).toBe(`${Math.round(expectedAvg).toLocaleString()}/day`);
  });

  it("excludes error rollup from sufficiency (not treated as numeric)", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-08": { kind: "numeric", steps: 7000 },
      "2026-04-07": { kind: "error", message: "network", requestId: "x" },
    };
    expect(rollupEntryIsFailure(rollup["2026-04-07"])).toBe(true);
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[0]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
  });

  it("sparse rollup: 7 and 30 day NED; YTD and 12 Month still show zero-filled averages", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-04-07": { kind: "numeric", steps: ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP },
    };
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[0]?.compactStatsSummary).toBe(
      `${Math.round(ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP).toLocaleString()} steps`,
    );
    expect(timeframes[0]?.markerPosition01).toBeGreaterThan(0);
    expect(timeframes[1]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(timeframes[2]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(timeframes[1]?.markerPosition01).toBe(0);
    expect(timeframes[2]?.markerPosition01).toBe(0);
    const ytdDays = activityYtdInclusiveThroughEndDay(anchor);
    const ytdAvg = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP / ytdDays.length;
    expect(timeframes[3]?.compactStatsSummary).toBe(`${Math.round(ytdAvg).toLocaleString()}/day`);
    const d365Avg = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP / ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT;
    expect(timeframes[4]?.compactStatsSummary).toBe(`${Math.round(d365Avg).toLocaleString()}/day`);
    expect(timeframes[3]?.markerPosition01).toBeGreaterThan(0);
    expect(timeframes[4]?.markerPosition01).toBeGreaterThan(0);
  });

  it("when fully covered, marker positions stay within 0–1", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT, 1000);
    const { timeframes } = buildOverview(rollup, today);
    for (const tf of timeframes) {
      expect(tf.markerPosition01).toBeGreaterThanOrEqual(0);
      expect(tf.markerPosition01).toBeLessThanOrEqual(1);
    }
  });

  it("7 Day uses completed window through yesterday: absent/partial today does not break sufficiency", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT, 4000);
    rollup["2026-04-08"] = { kind: "absent" };
    const { timeframes } = buildOverview(rollup, today);
    expect(timeframes[1]?.compactStatsSummary).toBe("4,000/day");
  });
});

describe("buildActivityTodayStepsLiveCardModel", () => {
  it("formats Today title and steps from HealthKit total", () => {
    const m = buildActivityTodayStepsLiveCardModel({ todayDayKey: "2026-04-14", steps: 5313 });
    expect(m.title).toBe("Today");
    expect(m.compactStatsSummary).toBe("5,313 steps");
    expect(m.markerPosition01).toBeGreaterThan(0);
  });
});

describe("buildActivityDailyDetailsCardModel", () => {
  it("uses detail day rollup independent of overview rows", () => {
    const rollup = numericMap([
      ["2026-04-05", 100],
      ["2026-04-08", 9999],
    ]);
    const m = buildActivityDailyDetailsCardModel({
      detailDayKey: "2026-04-05",
      todayDayKey: "2026-04-08",
      rollupByDay: rollup,
    });
    expect(m.compactStatsSummary).toBe("100 steps");
    const overview = buildOverview(rollup, "2026-04-08");
    expect(overview.timeframes[0]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(overview.timeframes[1]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(overview.timeframes[2]?.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(overview.timeframes[3]?.compactStatsSummary).not.toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(overview.timeframes[4]?.compactStatsSummary).not.toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
  });
});

describe("buildActivityBaselineCardModel", () => {
  const today: DayKey = "2026-04-14";
  const anchor = overviewAnchorFromToday(today);

  it("anchors the window to local yesterday (overview anchor), not device today", () => {
    const todayLocal: DayKey = "2026-08-20";
    expect(getActivityOverviewAnchorEndDay(todayLocal)).toBe(overviewAnchorFromToday(todayLocal));
    expect(overviewAnchorFromToday(todayLocal)).toBe("2026-08-19");
    const anchorKey = getActivityOverviewAnchorEndDay(todayLocal);
    const days = activityTrailingNDaysInclusive(anchorKey, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
    expect(days).toHaveLength(90);
    expect(days[days.length - 1]).toBe(anchorKey);
    expect(days).toContain(anchorKey);
    expect(days).not.toContain(todayLocal);
    for (const d of days) {
      expect(d <= anchorKey).toBe(true);
      expect(d < todayLocal).toBe(true);
    }
  });

  it("returns mean steps/day over 90 trailing completed days when fully numeric", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT, 4500);
    const m = buildActivityBaselineCardModel({ overviewAnchorEndDay: anchor, rollupByDay: rollup });
    expect(m.compactStatsSummary).toBe("4,500 steps");
    expect(m.title).toBe("Activity Baseline");
    expect(m.markerPosition01).toBeGreaterThan(0);
  });

  it("excludes device today from the mean even if rollup has an extreme today value (fails if today were averaged in)", () => {
    const todayLocal: DayKey = "2026-05-10";
    const anchorKey = overviewAnchorFromToday(todayLocal);
    const rollup = fillTrailingNumeric(anchorKey, ACTIVITY_BASELINE_TRAILING_DAY_COUNT, 4000);
    rollup[todayLocal] = { kind: "numeric", steps: 1_000_000 };
    const m = buildActivityBaselineCardModel({ overviewAnchorEndDay: anchorKey, rollupByDay: rollup });
    expect(m.compactStatsSummary).toBe("4,000 steps");
    const wrong91DayMean = Math.round((ACTIVITY_BASELINE_TRAILING_DAY_COUNT * 4000 + 1_000_000) / 91);
    expect(`${wrong91DayMean.toLocaleString()} steps`).not.toBe(m.compactStatsSummary);
  });

  it("includes anchor (yesterday); changing only that day changes the baseline", () => {
    const todayLocal: DayKey = "2026-03-01";
    const anchorKey = overviewAnchorFromToday(todayLocal);
    const rollup = fillTrailingNumeric(anchorKey, ACTIVITY_BASELINE_TRAILING_DAY_COUNT, 2000);
    expect(buildActivityBaselineCardModel({ overviewAnchorEndDay: anchorKey, rollupByDay: rollup }).compactStatsSummary).toBe(
      "2,000 steps",
    );
    rollup[anchorKey] = { kind: "numeric", steps: 5000 };
    const expectedMean = Math.round((89 * 2000 + 5000) / 90);
    expect(
      buildActivityBaselineCardModel({ overviewAnchorEndDay: anchorKey, rollupByDay: rollup }).compactStatsSummary,
    ).toBe(`${expectedMean.toLocaleString()} steps`);
  });

  it("returns Not enough data when any day in the 90-day window is non-numeric", () => {
    const rollup = fillTrailingNumeric(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT, 3000);
    const days = activityTrailingNDaysInclusive(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
    const first = days[0]!;
    rollup[first] = { kind: "absent" };
    const m = buildActivityBaselineCardModel({ overviewAnchorEndDay: anchor, rollupByDay: rollup });
    expect(m.compactStatsSummary).toBe(ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA);
    expect(m.markerPosition01).toBe(0);
  });
});
