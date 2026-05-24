import {
  ACTIVITY_YEARLY_MONTH_LETTERS,
  buildActivityYearlyCardModel,
  computeActivityYearlyCardFetchDayKeys,
} from "@/lib/data/activity/activityYearlyCardModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";

const TODAY = "2026-05-24" as import("@/lib/ui/calendar/types").DayKey;

describe("buildActivityYearlyCardModel", () => {
  it("excludes today from the current-year hero average and monthly bars", () => {
    const rollup: ActivityStepsRollupMap = {
      // Anchor is 2026-05-23 — these are included.
      "2026-05-21": { kind: "numeric", steps: 1000 },
      "2026-05-22": { kind: "numeric", steps: 3000 },
      "2026-05-23": { kind: "numeric", steps: 5000 },
      // Today — must be excluded.
      "2026-05-24": { kind: "numeric", steps: 99999 },
    };
    const m = buildActivityYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      rollupByDay: rollup,
    });
    expect(m.hasData).toBe(true);
    expect(m.averageStepsPerDay).toBe(3000);
    expect(m.averageDisplay).toBe("3,000");
    const may = m.months.find((mm) => mm.monthKey === "2026-05");
    expect(may?.averageSteps).toBe(3000);
    expect(may?.numericDayCount).toBe(3);
    expect(may?.isCurrentMonth).toBe(true);
  });

  it("uses numeric-day denominator for monthly averages (no implicit zeros)", () => {
    const rollup: ActivityStepsRollupMap = {
      "2026-01-10": { kind: "numeric", steps: 1000 },
      "2026-01-12": { kind: "numeric", steps: 3000 },
      "2026-01-14": { kind: "absent" },
    };
    const m = buildActivityYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      rollupByDay: rollup,
    });
    const jan = m.months.find((mm) => mm.monthKey === "2026-01");
    expect(jan?.averageSteps).toBe(2000);
    expect(jan?.numericDayCount).toBe(2);
  });

  it("returns null averageSteps for current-year months after the anchor", () => {
    const m = buildActivityYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      rollupByDay: {},
    });
    const jun = m.months.find((mm) => mm.monthKey === "2026-06");
    expect(jun?.isFutureMonth).toBe(true);
    expect(jun?.averageSteps).toBeNull();
    const dec = m.months.find((mm) => mm.monthKey === "2026-12");
    expect(dec?.isFutureMonth).toBe(true);
    expect(dec?.averageSteps).toBeNull();
  });

  it("includes all 12 months for prior years and aggregates over the whole year", () => {
    const rollup: ActivityStepsRollupMap = {
      "2024-01-01": { kind: "numeric", steps: 1000 },
      "2024-06-15": { kind: "numeric", steps: 5000 },
      "2024-12-31": { kind: "numeric", steps: 9000 },
    };
    const m = buildActivityYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      rollupByDay: rollup,
    });
    expect(m.hasData).toBe(true);
    expect(m.months).toHaveLength(12);
    expect(m.months.every((mm) => !mm.isFutureMonth)).toBe(true);
    expect(m.averageStepsPerDay).toBe(5000);
    const jan = m.months.find((mm) => mm.monthKey === "2024-01");
    const jun = m.months.find((mm) => mm.monthKey === "2024-06");
    const dec = m.months.find((mm) => mm.monthKey === "2024-12");
    expect(jan?.averageSteps).toBe(1000);
    expect(jun?.averageSteps).toBe(5000);
    expect(dec?.averageSteps).toBe(9000);
  });

  it("reports hasData=false / isEmpty=true and empty hero when no numeric data exists", () => {
    const m = buildActivityYearlyCardModel({
      selectedYear: 2023,
      todayDayKey: TODAY,
      rollupByDay: {},
    });
    expect(m.hasData).toBe(false);
    expect(m.isEmpty).toBe(true);
    expect(m.averageStepsPerDay).toBe(0);
    expect(m.averageDisplay).toBe("");
  });

  it("emits the exact J F M A M J J A S O N D label sequence", () => {
    const m = buildActivityYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      rollupByDay: {},
    });
    expect(m.months.map((mm) => mm.label)).toEqual([...ACTIVITY_YEARLY_MONTH_LETTERS]);
  });

  it("exposes title and rangeLabel based on the selected year", () => {
    const m = buildActivityYearlyCardModel({
      selectedYear: 2025,
      todayDayKey: TODAY,
      rollupByDay: { "2025-03-01": { kind: "numeric", steps: 7000 } },
    });
    expect(m.title).toBe("2025 Activity");
    expect(m.rangeLabel).toBe("2025");
    expect(m.isCurrentYear).toBe(false);
  });

  it("computes chartMaxScale by rounding peak monthly average up to the nearest 500", () => {
    const rollup: ActivityStepsRollupMap = {
      "2024-01-01": { kind: "numeric", steps: 4200 },
      "2024-02-01": { kind: "numeric", steps: 7800 },
    };
    const m = buildActivityYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      rollupByDay: rollup,
    });
    expect(m.chartMaxScale).toBe(8000);
  });
});

describe("computeActivityYearlyCardFetchDayKeys", () => {
  it("returns Jan 1 through Dec 31 for prior years", () => {
    const keys = computeActivityYearlyCardFetchDayKeys(2024, TODAY);
    expect(keys[0]).toBe("2024-01-01");
    expect(keys[keys.length - 1]).toBe("2024-12-31");
    expect(keys.length).toBe(366); // 2024 was a leap year
  });

  it("returns Jan 1 through the anchor day (yesterday) for the current year", () => {
    const keys = computeActivityYearlyCardFetchDayKeys(2026, TODAY);
    expect(keys[0]).toBe("2026-01-01");
    expect(keys[keys.length - 1]).toBe("2026-05-23");
  });

  it("returns an empty list when the requested year is beyond the anchor year", () => {
    const keys = computeActivityYearlyCardFetchDayKeys(2099, TODAY);
    expect(keys).toEqual([]);
  });
});
