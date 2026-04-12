import {
  ACTIVITY_CALENDAR_MARKER_SPAN_DAYS,
  ACTIVITY_OVERVIEW_AVG_12M_DAYS,
  activityTrailingNDaysInclusive,
  computeActivityCalendarFetchDayKeys,
  computeActivityOverviewFetchDayKeys,
} from "@/lib/data/activity/activityOverviewRanges";

describe("activityTrailingNDaysInclusive", () => {
  it("returns N consecutive days ending on endDay", () => {
    const days = activityTrailingNDaysInclusive("2026-04-08", 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-04-02");
    expect(days[6]).toBe("2026-04-08");
  });
});

describe("computeActivityOverviewFetchDayKeys", () => {
  it("includes trailing 365d through today and week around selectedDay", () => {
    const keys = computeActivityOverviewFetchDayKeys("2026-04-08", "2026-04-08");
    expect(keys[0]).toBe("2025-04-09");
    expect(keys[keys.length - 1]).toBe("2026-04-11");
    const set = new Set(keys);
    expect(set.size).toBe(keys.length);
    expect(keys).toContain("2026-04-08");
  });

  it("includes an off-window selected day in its week strip", () => {
    const keys = computeActivityOverviewFetchDayKeys("2026-03-15", "2026-04-08");
    expect(keys).toContain("2026-03-15");
    expect(keys[keys.length - 1]).toBe("2026-04-08");
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

describe("overview 12M window length", () => {
  it("matches Apple-aligned 365-day rolling year", () => {
    expect(ACTIVITY_OVERVIEW_AVG_12M_DAYS).toBe(365);
  });
});
