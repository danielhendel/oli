import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  ACTIVITY_BASELINE_GENERIC_EXPLAINER,
  buildActivityBaselineExplainerCopy,
  buildActivityHistorySummaryModel,
  computeActivityBaselineSevenDayTrendPct,
  formatActivityStepsPerDayDisplay,
  type ActivityHistorySummaryRow,
} from "@/lib/data/activity/activityHistorySummaryModel";

describe("formatActivityStepsPerDayDisplay", () => {
  it("formats rounded steps with localized separators", () => {
    const s = formatActivityStepsPerDayDisplay(13780.2);
    expect(s).toContain("steps/day");
    expect(s).toMatch(/13[,.]780/);
  });
});

describe("buildActivityHistorySummaryModel — completed-days anchors", () => {
  const today = "2026-04-14";
  const anchor = getActivityOverviewAnchorEndDay(today); // 2026-04-13

  function numericRollupForKeys(
    keys: readonly string[],
    steps: number,
  ): Record<string, { kind: "numeric"; steps: number }> {
    const rollup: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const k of keys) {
      rollup[k] = { kind: "numeric", steps };
    }
    return rollup;
  }

  it("lists 7 / 30 / 90 / YTD / 12 Month rows with steps/day display when every window has full coverage", () => {
    const d7 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const d30 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
    const d90 = activityTrailingNDaysInclusive(anchor, 90);
    const ytd = activityYtdInclusiveThroughEndDay(anchor);
    const d365 = activityTrailingNDaysInclusive(
      anchor,
      ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
    );
    const all = new Set<string>([...d7, ...d30, ...d90, ...ytd, ...d365]);
    const rollup = numericRollupForKeys([...all], 7000);

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.map((r) => r.label)).toEqual([
      "7 Day",
      "30 Day",
      "90 Day",
      "YTD",
      "12 Month",
    ]);
    expect(model.rows.every((r) => r.displayValue.endsWith("steps/day"))).toBe(true);
    expect(model.rows.every((r) => r.hasEnoughData)).toBe(true);
  });

  it("excludes device today from the 7 Day window (anchored at yesterday)", () => {
    const d7Yesterday = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    expect(d7Yesterday).not.toContain(today);
    expect(d7Yesterday[d7Yesterday.length - 1]).toBe(anchor);
    const rollup = numericRollupForKeys(d7Yesterday, 8000);
    rollup[today] = { kind: "numeric", steps: 100 }; // partial in-progress today

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    const day7 = model.rows.find((r) => r.key === "day7");
    expect(day7?.hasEnoughData).toBe(true);
    expect(day7?.averageStepsPerDay).toBe(8000);
  });

  it("excludes device today from the 30 Day window", () => {
    const d30Yesterday = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
    expect(d30Yesterday).not.toContain(today);
    const rollup = numericRollupForKeys(d30Yesterday, 9000);
    rollup[today] = { kind: "numeric", steps: 50 };

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    const day30 = model.rows.find((r) => r.key === "day30");
    expect(day30?.hasEnoughData).toBe(true);
    expect(day30?.averageStepsPerDay).toBe(9000);
  });

  it("excludes device today from the 90 Day window", () => {
    const d90 = activityTrailingNDaysInclusive(anchor, 90);
    expect(d90).not.toContain(today);
    const rollup = numericRollupForKeys(d90, 4500);
    rollup[today] = { kind: "numeric", steps: 1_000_000 };

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.find((r) => r.key === "day90")?.averageStepsPerDay).toBe(4500);
  });

  it("excludes device today from the YTD window (Jan 1 of anchor's year through anchor)", () => {
    const ytd = activityYtdInclusiveThroughEndDay(anchor);
    expect(ytd[0]).toBe("2026-01-01");
    expect(ytd[ytd.length - 1]).toBe(anchor);
    expect(ytd).not.toContain(today);
  });

  it("excludes device today from the 12 Month window (zero-filled denominator stays 365)", () => {
    const d365 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    expect(d365).toHaveLength(365);
    expect(d365).not.toContain(today);
    expect(d365[d365.length - 1]).toBe(anchor);
  });

  it("marks full-coverage windows insufficient when a day in range is missing numeric rollup", () => {
    const d7 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const rollup = numericRollupForKeys(d7, 5000);
    delete rollup[d7[0]!];

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.find((r) => r.key === "day7")?.hasEnoughData).toBe(false);
    expect(model.rows.find((r) => r.key === "day7")?.displayValue).toBe("—");
  });

  it("treats error days in YTD as insufficient (no silent zero average)", () => {
    const ytd = activityYtdInclusiveThroughEndDay(anchor);
    const rollup: Record<string, { kind: "numeric" | "error"; steps?: number; message?: string }> = {};
    for (const k of ytd) {
      rollup[k] = { kind: "numeric", steps: 4000 };
    }
    rollup[ytd[5]!] = { kind: "error", message: "x" };

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.rows.find((r) => r.key === "ytd")?.hasEnoughData).toBe(false);
  });
});

describe("computeActivityBaselineSevenDayTrendPct", () => {
  it("returns positive rounded percent when 7 day exceeds baseline", () => {
    expect(computeActivityBaselineSevenDayTrendPct(12_890, 12_600)).toBe(2);
  });
  it("returns negative rounded percent when 7 day is below baseline", () => {
    expect(computeActivityBaselineSevenDayTrendPct(8_000, 10_000)).toBe(-20);
  });
  it("returns 0 when 7 day and baseline match", () => {
    expect(computeActivityBaselineSevenDayTrendPct(10_000, 10_000)).toBe(0);
  });
  it("returns null when baseline is zero or non-finite", () => {
    expect(computeActivityBaselineSevenDayTrendPct(8_000, 0)).toBeNull();
    expect(computeActivityBaselineSevenDayTrendPct(8_000, Number.NaN)).toBeNull();
  });
});

describe("buildActivityBaselineExplainerCopy", () => {
  function row(
    key: ActivityHistorySummaryRow["key"],
    label: ActivityHistorySummaryRow["label"],
    avg: number | null,
  ): ActivityHistorySummaryRow {
    return {
      key,
      label,
      hasEnoughData: avg != null,
      averageStepsPerDay: avg,
      displayValue: avg != null ? `${Math.round(avg).toLocaleString()} steps/day` : "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
    };
  }

  it("returns the generic fallback when 90 Day baseline is missing", () => {
    expect(
      buildActivityBaselineExplainerCopy({
        day90Row: row("day90", "90 Day", null),
        day7Row: row("day7", "7 Day", 12_890),
      }),
    ).toBe(ACTIVITY_BASELINE_GENERIC_EXPLAINER);
    expect(
      buildActivityBaselineExplainerCopy({ day90Row: null, day7Row: null }),
    ).toBe(ACTIVITY_BASELINE_GENERIC_EXPLAINER);
  });

  it("uses the 90 Day average + category and compares to 7 Day when both are available", () => {
    const copy = buildActivityBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 12_600),
      day7Row: row("day7", "7 Day", 12_890),
    });
    expect(copy).toContain("12,600 steps/day");
    expect(copy).toContain("Very Active");
    expect(copy).toContain("7 completed days");
    expect(copy).toContain("12,890 steps/day");
    expect(copy).toContain("2% above your baseline");
  });

  it("uses 'below your baseline' phrasing when 7 Day is under the 90 Day baseline", () => {
    const copy = buildActivityBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 10_000),
      day7Row: row("day7", "7 Day", 8_000),
    });
    expect(copy).toContain("10,000 steps/day");
    expect(copy).toContain("Active");
    expect(copy).toContain("20% below your baseline");
  });

  it("uses 'about the same as' phrasing when rounded delta is zero", () => {
    const copy = buildActivityBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 7_500),
      day7Row: row("day7", "7 Day", 7_520),
    });
    expect(copy).toContain("about the same as your baseline");
  });

  it("returns baseline-only copy when 7 Day is missing", () => {
    const copy = buildActivityBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 6_400),
      day7Row: row("day7", "7 Day", null),
    });
    expect(copy).toContain("6,400 steps/day");
    expect(copy).toContain("Lightly Active");
    expect(copy).not.toContain("7 completed days");
  });
});

describe("buildActivityHistorySummaryModel — personalizedExplainer", () => {
  const today = "2026-04-14";
  const anchor = getActivityOverviewAnchorEndDay(today);

  function seedRollup(input: {
    day7AvgSteps: number;
    day90AvgSteps: number;
  }): Record<string, { kind: "numeric"; steps: number }> {
    const d7 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const d90 = activityTrailingNDaysInclusive(anchor, 90);
    const rollup: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const k of d90) rollup[k] = { kind: "numeric", steps: input.day90AvgSteps };
    for (const k of d7) rollup[k] = { kind: "numeric", steps: input.day7AvgSteps };
    return rollup;
  }

  it("renders a personalized explainer using the 90 Day baseline and the 7 Day trend", () => {
    const model = buildActivityHistorySummaryModel({
      todayDayKey: today,
      rollupByDay: seedRollup({ day7AvgSteps: 12_890, day90AvgSteps: 12_600 }),
    });
    expect(model.personalizedExplainer).toContain("Very Active");
    expect(model.personalizedExplainer).toContain("12,890 steps/day");
    expect(model.personalizedExplainer).toContain("above your baseline");
  });

  it("falls back to the generic explainer when 90 Day coverage is incomplete", () => {
    const d90 = activityTrailingNDaysInclusive(anchor, 90);
    const rollup: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const k of d90) rollup[k] = { kind: "numeric", steps: 9000 };
    // Drop one day at the older end of the 90-day window (outside the 7-day window) so the
    // 90 Day row falls under "not enough data" without disturbing the 7-day window coverage.
    delete rollup[d90[0]!];

    const model = buildActivityHistorySummaryModel({ todayDayKey: today, rollupByDay: rollup });
    expect(model.personalizedExplainer).toBe(ACTIVITY_BASELINE_GENERIC_EXPLAINER);
  });

  /**
   * Note: the 7-day window is a subset of the 90-day window (they share the same anchor), so a
   * model-level "90 Day OK but 7 Day insufficient" state is unreachable. That scenario is covered
   * directly against the pure {@link buildActivityBaselineExplainerCopy} helper above.
   */
});
