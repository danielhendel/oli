import {
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  buildActivityHistorySummaryModel,
  formatActivityStepsPerDayDisplay,
} from "@/lib/data/activity/activityHistorySummaryModel";

describe("formatActivityStepsPerDayDisplay", () => {
  it("formats rounded steps with localized separators", () => {
    const s = formatActivityStepsPerDayDisplay(13780.2);
    expect(s).toContain("steps/day");
    expect(s).toMatch(/13[,.]780/);
  });
});

describe("buildActivityHistorySummaryModel", () => {
  const today = "2026-04-14";

  function numericRollupForTrailingDays(end: string, n: number, steps: number) {
    const keys = activityTrailingNDaysInclusive(end, n);
    const rollup: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const k of keys) {
      rollup[k] = { kind: "numeric", steps };
    }
    return rollup;
  }

  it("lists 7 / 30 / 90 / YTD / 12 Month rows with steps/day display", () => {
    const anchor = getActivityOverviewAnchorEndDay(today);
    const d7 = activityTrailingNDaysInclusive(today, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const d30 = activityTrailingNDaysInclusive(today, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
    const d90 = activityTrailingNDaysInclusive(anchor, 90);
    const rollup: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const k of new Set([...d7, ...d30, ...d90, ...activityYtdInclusiveThroughEndDay(today)])) {
      rollup[k] = { kind: "numeric", steps: 7000 };
    }
    const monthKeys = activityTrailingNDaysInclusive(today, 365);
    for (const k of monthKeys) {
      rollup[k] = { kind: "numeric", steps: 7000 };
    }

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.map((r) => r.label)).toEqual(["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]);
    expect(model.rows.every((r) => r.displayValue.endsWith("steps/day"))).toBe(true);
    expect(model.rows.every((r) => r.hasEnoughData)).toBe(true);
  });

  it("marks full-coverage windows insufficient when a day in range is missing numeric rollup", () => {
    const d7 = activityTrailingNDaysInclusive(today, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const rollup = numericRollupForTrailingDays(today, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT, 5000);
    delete rollup[d7[0]!];

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.find((r) => r.key === "day7")?.hasEnoughData).toBe(false);
    expect(model.rows.find((r) => r.key === "day7")?.displayValue).toBe("—");
  });

  it("treats error days in YTD as insufficient (no silent zero average)", () => {
    const ytd = activityYtdInclusiveThroughEndDay(today);
    const rollup: Record<string, { kind: "numeric" | "error"; steps?: number; message?: string }> = {};
    for (const k of ytd) {
      rollup[k] = { kind: "numeric", steps: 4000 };
    }
    rollup[ytd[5]!] = { kind: "error", message: "x" };

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.find((r) => r.key === "ytd")?.hasEnoughData).toBe(false);
  });
});
