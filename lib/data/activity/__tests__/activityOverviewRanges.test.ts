import type { DayKey } from "@/lib/ui/calendar/types";
import {
  ACTIVITY_CALENDAR_MARKER_SPAN_DAYS,
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  computeActivityCalendarFetchDayKeys,
  computeActivityOverviewFetchDayKeys,
  computeShellActivityFetchDayKeys,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { addCalendarDaysToDayKey, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";

describe("activityTrailingNDaysInclusive", () => {
  it("returns N consecutive days ending on endDay (7-day inclusive)", () => {
    const days = activityTrailingNDaysInclusive("2026-04-08", ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-04-02");
    expect(days[6]).toBe("2026-04-08");
  });

  it("returns 30 consecutive days inclusive of end day", () => {
    const days = activityTrailingNDaysInclusive("2026-04-08", ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-03-10");
    expect(days[29]).toBe("2026-04-08");
  });

  it("returns 365 consecutive days inclusive of end day (12 Month)", () => {
    const days = activityTrailingNDaysInclusive("2026-04-08", ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    expect(days).toHaveLength(365);
    expect(days[0]).toBe("2025-04-09");
    expect(days[364]).toBe("2026-04-08");
    expect(days.every((k) => k <= "2026-04-08")).toBe(true);
  });
});

describe("activityYtdInclusiveThroughEndDay", () => {
  it("runs Jan 1 through end day inclusive in the same calendar year", () => {
    const days = activityYtdInclusiveThroughEndDay("2026-04-08" as DayKey);
    expect(days[0]).toBe("2026-01-01");
    expect(days[days.length - 1]).toBe("2026-04-08");
    expect(days).toHaveLength(98);
  });

  it("includes only Jan 1 when end is Jan 1", () => {
    expect(activityYtdInclusiveThroughEndDay("2027-01-01" as DayKey)).toEqual(["2027-01-01"]);
  });
});

describe("computeShellActivityFetchDayKeys", () => {
  it("returns today, yesterday, and elapsed current-week days only (no year-scale history)", () => {
    const today = "2026-07-05" as DayKey; // Sunday
    const keys = computeShellActivityFetchDayKeys(today);
    expect(keys).toEqual(["2026-07-04", "2026-07-05"]);
    expect(keys.length).toBeLessThanOrEqual(8);
  });

  it("includes Sunday through Wednesday on a mid-week day", () => {
    const today = "2026-07-01" as DayKey; // Wednesday when Jul 5 2026 is Sunday
    const keys = computeShellActivityFetchDayKeys(today);
    expect(keys).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
    ]);
    expect(keys.length).toBeLessThanOrEqual(8);
  });
});

describe("computeActivityOverviewFetchDayKeys", () => {
  it("returns sorted union of trailing-365 + YTD through yesterday, today, and strip week around selected", () => {
    const selectedStrip = "2026-04-08" as DayKey;
    const today = "2026-04-14" as DayKey;
    const keys = computeActivityOverviewFetchDayKeys(selectedStrip, today);
    const overviewEnd = getActivityOverviewAnchorEndDay(today);
    expect(overviewEnd).toBe("2026-04-13");
    const trail = activityTrailingNDaysInclusive(overviewEnd, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    const ytd = activityYtdInclusiveThroughEndDay(overviewEnd);
    const strip = getWeekDaysForAnchor(selectedStrip);
    const expected = [...new Set([...trail, ...ytd, today, ...strip])].sort();
    expect(keys).toEqual(expected);
    expect(keys).toContain(today);
    expect(keys).toContain("2026-04-13");
    expect(keys[keys.length - 1]).toBe("2026-04-14");
  });

  it("uses yesterday for overview trail/YTD even when strip selected day is in the future", () => {
    const selected = "2026-04-20" as DayKey;
    const today = "2026-04-14" as DayKey;
    const keys = computeActivityOverviewFetchDayKeys(selected, today);
    const overviewEnd = getActivityOverviewAnchorEndDay(today);
    expect(overviewEnd).toBe("2026-04-13");
    const trail = activityTrailingNDaysInclusive(overviewEnd, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
    const ytd = activityYtdInclusiveThroughEndDay(overviewEnd);
    const strip = getWeekDaysForAnchor(selected);
    const expected = [...new Set([...trail, ...ytd, today, ...strip, selected])].sort();
    expect(keys).toEqual(expected);
    expect(keys.filter((k) => k > today).sort()).toEqual(
      [...new Set([...strip.filter((k) => k > today), selected])].sort(),
    );
  });

  it("for leap-year overview anchor, union includes full YTD through yesterday", () => {
    const selectedStrip = "2024-06-01" as DayKey;
    const today = "2025-01-01" as DayKey;
    const keys = computeActivityOverviewFetchDayKeys(selectedStrip, today);
    const overviewEnd = getActivityOverviewAnchorEndDay(today);
    expect(overviewEnd).toBe("2024-12-31");
    const ytd = activityYtdInclusiveThroughEndDay(overviewEnd);
    expect(ytd).toHaveLength(366);
    expect(keys).toContain("2024-01-01");
    expect(keys).toContain("2024-12-31");
    expect(new Set(keys).size).toBeGreaterThanOrEqual(365);
  });
});

describe("getActivityOverviewAnchorEndDay", () => {
  it("is local calendar yesterday", () => {
    expect(getActivityOverviewAnchorEndDay("2026-04-14")).toBe("2026-04-13");
    expect(getActivityOverviewAnchorEndDay("2026-01-01")).toBe(addCalendarDaysToDayKey("2026-01-01", -1));
  });
});

describe("computeActivityCalendarFetchDayKeys", () => {
  it("returns a fixed trailing span for markers", () => {
    const keys = computeActivityCalendarFetchDayKeys("2026-04-08");
    expect(keys).toHaveLength(ACTIVITY_CALENDAR_MARKER_SPAN_DAYS);
    expect(keys[0]).toBe("2024-10-16");
    expect(keys[keys.length - 1]).toBe("2026-04-08");
  });
});

describe("overview 12M window length constant", () => {
  it("is 365 trailing local days", () => {
    expect(ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT).toBe(365);
  });
});
