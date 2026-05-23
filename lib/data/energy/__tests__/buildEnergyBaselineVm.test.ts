import { describe, expect, it, jest } from "@jest/globals";

import {
  buildEnergyBaselineVm,
  computeEnergyBaselineFetchDayKeys,
  ENERGY_BASELINE_UNAVAILABLE_DISPLAY,
} from "@/lib/data/energy/buildEnergyBaselineVm";
import type { WeeklyDailyEnergyCell } from "@/lib/data/dash/useWeeklyDailyEnergyMap";
import {
  addCalendarDaysToDayKey,
  enumerateDaysInclusive,
} from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

function energyCell(
  day: DayKey,
  low: number,
  high: number,
  opts: {
    missingRequiredInputs?: readonly string[];
    confidence?: "low" | "moderate" | "high";
  } = {},
): WeeklyDailyEnergyCell {
  return {
    settled: true,
    energy: {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-20T12:00:00.000Z",
      day,
      estimatedKcal: { low, high, midpoint: (low + high) / 2 },
      variancePct: 0.08,
      confidence: opts.confidence ?? "moderate",
      factors: {},
      missingRequiredInputs: [...(opts.missingRequiredInputs ?? [])],
    },
  };
}

function bmrOnlyCell(day: DayKey, low: number, high: number): WeeklyDailyEnergyCell {
  return energyCell(day, low, high, {
    missingRequiredInputs: ["steps"],
    confidence: "low",
  });
}

function stepsOnlyCell(day: DayKey, low: number, high: number): WeeklyDailyEnergyCell {
  return energyCell(day, low, high, {
    missingRequiredInputs: ["baseline"],
    confidence: "low",
  });
}

function trailingDays(today: DayKey, count: number): DayKey[] {
  const start = addCalendarDaysToDayKey(today, -(count - 1));
  return enumerateDaysInclusive(start, today);
}

function fillCompleteSame(
  days: readonly DayKey[],
  low: number,
  high: number,
): Partial<Record<DayKey, WeeklyDailyEnergyCell>> {
  const out: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
  for (const d of days) {
    out[d] = energyCell(d, low, high);
  }
  return out;
}

const today = "2026-05-20" as DayKey;
/**
 * All Energy Baseline windows anchor at the prior completed day (local yesterday).
 * Tests must NOT include `today` in any baseline window.
 */
const baselineEndDay = addCalendarDaysToDayKey(today, -1);

const days7 = trailingDays(baselineEndDay, 7);
const days30 = trailingDays(baselineEndDay, 30);
const days90 = trailingDays(baselineEndDay, 90);
const daysYtd = enumerateDaysInclusive("2026-01-01" as DayKey, baselineEndDay);
const days365 = trailingDays(baselineEndDay, 365);

const REQUIRED_DAY_COUNT_7 = 7;
const REQUIRED_DAY_COUNT_30 = 30;
const REQUIRED_DAY_COUNT_90 = 90;
const REQUIRED_DAY_COUNT_YTD = daysYtd.length;
const REQUIRED_DAY_COUNT_12_MONTH = 365;

describe("buildEnergyBaselineVm — row structure", () => {
  it("renders the five baseline rows in order: 7 Day, 30 Day, 90 Day, YTD, 12 Month", () => {
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: {} });
    expect(vm.rows.map((r) => r.label)).toEqual([
      "7 Day",
      "30 Day",
      "90 Day",
      "YTD",
      "12 Month",
    ]);
    expect(vm.rows.map((r) => r.key)).toEqual([
      "day7",
      "day30",
      "day90",
      "ytd",
      "month12",
    ]);
  });

  it("renders every row in the unavailable state when there is no data", () => {
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: {} });
    for (const row of vm.rows) {
      expect(row.hasEnoughData).toBe(false);
      expect(row.displayValue).toBe(ENERGY_BASELINE_UNAVAILABLE_DISPLAY);
      expect(row.avgLow).toBeNull();
      expect(row.avgHigh).toBeNull();
      expect(row.progressFill01).toBeNull();
    }
  });
});

describe("buildEnergyBaselineVm — averaging math (full coverage)", () => {
  it("averages low and high independently (no midpoint) across a fully covered window", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
    days7.forEach((d, i) => {
      const isEven = i % 2 === 0;
      const low = isEven ? 2400 : 2000;
      const high = isEven ? 2900 : 2500;
      energyByDay[d] = energyCell(d, low, high);
    });
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    const expectedAvgLow = (4 * 2400 + 3 * 2000) / 7;
    const expectedAvgHigh = (4 * 2900 + 3 * 2500) / 7;
    expect(row7?.avgLow).toBeCloseTo(expectedAvgLow, 6);
    expect(row7?.avgHigh).toBeCloseTo(expectedAvgHigh, 6);
    // Low and high are independent means, not derived from per-day midpoints.
    expect(row7?.avgLow).not.toBe(row7?.avgHigh);
    const perDayMidpointMean =
      (4 * ((2400 + 2900) / 2) + 3 * ((2000 + 2500) / 2)) / 7;
    expect(row7?.avgLow).not.toBe(perDayMidpointMean);
    expect(row7?.avgHigh).not.toBe(perDayMidpointMean);
  });

  it("formats the display value with commas, en dash, and kcal/day suffix", () => {
    const energyByDay = fillCompleteSame(days7, 2230, 2714);
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.displayValue).toBe("2,230\u20132,714 kcal/day");
    expect(row7?.displayValue).toContain(",");
    expect(row7?.displayValue).toContain("\u2013");
    expect(row7?.displayValue).toContain("kcal/day");
  });

  it("progressFill01 = avgHigh / globalMaxHigh (no midpoint), clamped to [0, 1]", () => {
    // Fill 30 days at one range, then override the 7 most recent with a lower range so 7 Day and
    // 30 Day each have full coverage but materially different `avgHigh`s.
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days30, 2400, 3000),
      ...fillCompleteSame(days7, 2000, 2500),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    const row30 = vm.rows.find((r) => r.key === "day30");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row30?.hasEnoughData).toBe(true);
    const expectedAvgHigh7 = 2500;
    const expectedAvgHigh30 = (23 * 3000 + 7 * 2500) / 30;
    expect(row7?.avgHigh).toBeCloseTo(expectedAvgHigh7, 6);
    expect(row30?.avgHigh).toBeCloseTo(expectedAvgHigh30, 6);
    const globalMaxHigh = expectedAvgHigh30;
    expect(row7?.progressFill01).toBeCloseTo(expectedAvgHigh7 / globalMaxHigh, 6);
    expect(row30?.progressFill01).toBeCloseTo(1, 6);
    for (const row of vm.rows) {
      if (row.progressFill01 != null) {
        expect(row.progressFill01).toBeGreaterThanOrEqual(0);
        expect(row.progressFill01).toBeLessThanOrEqual(1);
      }
    }
  });

  it("every baseline window ends at baselineEndDay (today is never in any window)", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      [today]: energyCell(today, 9999, 9999),
      ...fillCompleteSame(days365, 2400, 2800),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    for (const row of vm.rows) {
      expect(row.hasEnoughData).toBe(true);
      expect(row.avgLow).toBeCloseTo(2400, 6);
      expect(row.avgHigh).toBeCloseTo(2800, 6);
    }
  });

  it("current-day low/high does not affect baseline averages (today excluded from every window)", () => {
    const baseline = fillCompleteSame(days365, 2400, 2800);
    const withoutToday = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: baseline });
    const withInflatedToday = buildEnergyBaselineVm({
      todayDayKey: today,
      energyByDay: { ...baseline, [today]: energyCell(today, 50, 75) },
    });
    for (const key of ["day7", "day30", "day90", "ytd", "month12"] as const) {
      const a = withoutToday.rows.find((r) => r.key === key);
      const b = withInflatedToday.rows.find((r) => r.key === key);
      expect(a?.hasEnoughData).toBe(true);
      expect(b?.hasEnoughData).toBe(true);
      expect(a?.avgLow).toBe(b?.avgLow);
      expect(a?.avgHigh).toBe(b?.avgHigh);
    }
  });
});

describe("buildEnergyBaselineVm — completeness filter (incomplete energy days)", () => {
  it("excludes BMR-only days (missingRequiredInputs includes \"steps\") from coverage and the average", () => {
    const bmrDay = days7[0]!;
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
      [bmrDay]: bmrOnlyCell(bmrDay, 1500, 1900),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
    expect(row7?.displayValue).toBe(ENERGY_BASELINE_UNAVAILABLE_DISPLAY);
    expect(row7?.avgLow).toBeNull();
    expect(row7?.avgHigh).toBeNull();
  });

  it("excludes steps-only days (missingRequiredInputs includes \"baseline\") from coverage", () => {
    const stepsDay = days7[1]!;
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
      [stepsDay]: stepsOnlyCell(stepsDay, 200, 400),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
  });

  it("includes only days whose missingRequiredInputs is empty when computing averages", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.avgLow).toBeCloseTo(2400, 6);
    expect(row7?.avgHigh).toBeCloseTo(2900, 6);
  });

  it("renders unavailable when only incomplete days are present in a window", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
    for (const d of days7) {
      energyByDay[d] = bmrOnlyCell(d, 1500, 1900);
    }
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
    expect(row7?.displayValue).toBe(ENERGY_BASELINE_UNAVAILABLE_DISPLAY);
  });

  it("treats cells with a non-array missingRequiredInputs as incomplete (defensive)", () => {
    const malformedDay = days7[0]!;
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
      [malformedDay]: {
        settled: true,
        energy: {
          modelVersion: "v",
          computedAt: "t",
          day: malformedDay,
          estimatedKcal: { low: 2400, high: 2900, midpoint: 2650 },
          variancePct: 0.05,
          confidence: "moderate",
          factors: {},
        } as unknown as WeeklyDailyEnergyCell["energy"],
      },
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
  });

  it("drops cells with non-finite low/high or non-positive high from coverage", () => {
    const badDay = days7[2]!;
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
      [badDay]: {
        settled: true,
        energy: {
          modelVersion: "v",
          computedAt: "t",
          day: badDay,
          estimatedKcal: { low: Number.NaN, high: 2500, midpoint: 2500 },
          variancePct: 0.1,
          confidence: "low",
          factors: {},
          missingRequiredInputs: [],
        },
      },
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
  });

  it("future days are excluded from coverage", () => {
    const futureDay = addCalendarDaysToDayKey(today, 5);
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7, 2400, 2900),
      [futureDay]: energyCell(futureDay, 9999, 9999),
    };
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.avgLow).toBeCloseTo(2400, 6);
    expect(row7?.avgHigh).toBeCloseTo(2900, 6);
  });
});

describe("buildEnergyBaselineVm — per-range coverage thresholds", () => {
  it("7 Day is unavailable with 6/7 complete days (windows end at baselineEndDay)", () => {
    expect(days7[days7.length - 1]).toBe(baselineEndDay);
    expect(days7).not.toContain(today);
    const partial = days7.slice(0, 6);
    const energyByDay = fillCompleteSame(partial, 2400, 2900);
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
    expect(row7?.displayValue).toBe(ENERGY_BASELINE_UNAVAILABLE_DISPLAY);
    expect(row7?.avgLow).toBeNull();
    expect(row7?.avgHigh).toBeNull();
    expect(row7?.progressFill01).toBeNull();
  });

  it("7 Day displays with 7/7 complete days ending at baselineEndDay", () => {
    expect(days7).toHaveLength(REQUIRED_DAY_COUNT_7);
    expect(days7[days7.length - 1]).toBe(baselineEndDay);
    expect(days7).not.toContain(today);
    const energyByDay = fillCompleteSame(days7, 2230, 2714);
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.displayValue).toBe("2,230\u20132,714 kcal/day");
    expect(row7?.avgLow).toBeCloseTo(2230, 6);
    expect(row7?.avgHigh).toBeCloseTo(2714, 6);
  });

  it("30 Day requires 30/30 complete days ending at baselineEndDay", () => {
    expect(days30[days30.length - 1]).toBe(baselineEndDay);
    expect(days30).not.toContain(today);
    expect(days30).toHaveLength(REQUIRED_DAY_COUNT_30);
    const partial = fillCompleteSame(days30.slice(0, 29), 2400, 2900);
    const vmPartial = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: partial });
    expect(vmPartial.rows.find((r) => r.key === "day30")?.hasEnoughData).toBe(false);

    const full = fillCompleteSame(days30, 2400, 2900);
    const vmFull = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: full });
    const row30 = vmFull.rows.find((r) => r.key === "day30");
    expect(row30?.hasEnoughData).toBe(true);
    expect(row30?.avgLow).toBeCloseTo(2400, 6);
    expect(row30?.avgHigh).toBeCloseTo(2900, 6);
  });

  it("90 Day requires 90/90 complete days ending at baselineEndDay (yesterday)", () => {
    expect(days90).toHaveLength(REQUIRED_DAY_COUNT_90);
    expect(days90[days90.length - 1]).toBe(baselineEndDay);
    expect(days90).not.toContain(today);
    const partial = fillCompleteSame(days90.slice(0, 89), 2400, 2800);
    const vmPartial = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: partial });
    expect(vmPartial.rows.find((r) => r.key === "day90")?.hasEnoughData).toBe(false);

    const full = fillCompleteSame(days90, 2400, 2800);
    const vmFull = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: full });
    const row90 = vmFull.rows.find((r) => r.key === "day90");
    expect(row90?.hasEnoughData).toBe(true);
    expect(row90?.avgLow).toBeCloseTo(2400, 6);
    expect(row90?.avgHigh).toBeCloseTo(2800, 6);
  });

  it("YTD requires every elapsed day from Jan 1 through baselineEndDay (today excluded)", () => {
    expect(daysYtd.length).toBe(REQUIRED_DAY_COUNT_YTD);
    expect(daysYtd[daysYtd.length - 1]).toBe(baselineEndDay);
    expect(daysYtd).not.toContain(today);
    const partial = fillCompleteSame(daysYtd.slice(0, daysYtd.length - 1), 2300, 2700);
    const vmPartial = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: partial });
    expect(vmPartial.rows.find((r) => r.key === "ytd")?.hasEnoughData).toBe(false);

    const full = fillCompleteSame(daysYtd, 2300, 2700);
    const vmFull = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: full });
    const rowYtd = vmFull.rows.find((r) => r.key === "ytd");
    expect(rowYtd?.hasEnoughData).toBe(true);
    expect(rowYtd?.avgLow).toBeCloseTo(2300, 6);
    expect(rowYtd?.avgHigh).toBeCloseTo(2700, 6);
  });

  it("12 Month requires 365/365 complete days ending at baselineEndDay", () => {
    expect(days365).toHaveLength(REQUIRED_DAY_COUNT_12_MONTH);
    expect(days365[days365.length - 1]).toBe(baselineEndDay);
    expect(days365).not.toContain(today);
    const partial = fillCompleteSame(days365.slice(0, 364), 2200, 2600);
    const vmPartial = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: partial });
    expect(vmPartial.rows.find((r) => r.key === "month12")?.hasEnoughData).toBe(false);

    const full = fillCompleteSame(days365, 2200, 2600);
    const vmFull = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: full });
    const row12 = vmFull.rows.find((r) => r.key === "month12");
    expect(row12?.hasEnoughData).toBe(true);
    expect(row12?.avgLow).toBeCloseTo(2200, 6);
    expect(row12?.avgHigh).toBeCloseTo(2600, 6);
  });

  it("incomplete days do not count toward the required coverage even if the cell is present", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {
      ...fillCompleteSame(days7.slice(0, 5), 2400, 2900),
    };
    for (const d of days7.slice(5)) {
      energyByDay[d] = bmrOnlyCell(d, 1500, 1900);
    }
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(false);
    expect(row7?.displayValue).toBe(ENERGY_BASELINE_UNAVAILABLE_DISPLAY);
  });

  it("full-coverage averages compute low and high independently with no midpoint", () => {
    const energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
    days7.forEach((d, i) => {
      const low = 2000 + i * 50;
      const high = 2500 + i * 80;
      energyByDay[d] = energyCell(d, low, high);
    });
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    const expectedAvgLow = (2000 + 2050 + 2100 + 2150 + 2200 + 2250 + 2300) / 7;
    const expectedAvgHigh = (2500 + 2580 + 2660 + 2740 + 2820 + 2900 + 2980) / 7;
    expect(row7?.avgLow).toBeCloseTo(expectedAvgLow, 6);
    expect(row7?.avgHigh).toBeCloseTo(expectedAvgHigh, 6);
  });

  it("defensive future-day filter keeps post-today cells out even though no window includes them", () => {
    const energyByDay = fillCompleteSame(days7, 2300, 2700);
    const futureDay = addCalendarDaysToDayKey(today, 1);
    (energyByDay as Record<string, WeeklyDailyEnergyCell>)[futureDay] = energyCell(
      futureDay,
      9999,
      9999,
    );
    const vm = buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.avgLow).toBeCloseTo(2300, 6);
    expect(row7?.avgHigh).toBeCloseTo(2700, 6);
  });
});

describe("buildEnergyBaselineVm — diagnostic logging", () => {
  it("logs todayDayKey, baselineEndDay, requiredDayCount, validDayCount, earliest/latestIncludedDay per row", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    try {
      const energyByDay = fillCompleteSame(days7, 2230, 2714);
      buildEnergyBaselineVm({ todayDayKey: today, energyByDay });
      const day7Calls = spy.mock.calls.filter((args) => {
        const second = args[1] as Record<string, unknown> | undefined;
        return second != null && second.key === "day7";
      });
      expect(day7Calls.length).toBeGreaterThan(0);
      const payload = day7Calls[0]![1] as Record<string, unknown>;
      expect(payload.todayDayKey).toBe(today);
      expect(payload.baselineEndDay).toBe(baselineEndDay);
      expect(payload.requiredDayCount).toBe(REQUIRED_DAY_COUNT_7);
      expect(payload.validDayCount).toBe(REQUIRED_DAY_COUNT_7);
      expect(payload.hasFullCoverage).toBe(true);
      expect(payload.earliestIncludedDay).toBe(days7[0]);
      expect(payload.latestIncludedDay).toBe(baselineEndDay);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("computeEnergyBaselineFetchDayKeys", () => {
  it("returns a sorted, de-duped union ending at baselineEndDay and excludes today/future", () => {
    const keys = computeEnergyBaselineFetchDayKeys(today);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(k <= today).toBe(true);
    }
    expect(keys).not.toContain(today);
    expect(keys[keys.length - 1]).toBe(baselineEndDay);
    expect(keys).toContain("2026-05-13" as DayKey);
    expect(keys).toContain("2026-01-01" as DayKey);
    expect(keys[0]! <= ("2025-05-20" as DayKey)).toBe(true);
  });
});
