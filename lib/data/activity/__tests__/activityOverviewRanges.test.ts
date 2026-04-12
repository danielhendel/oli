import type { DayKey } from "@/lib/ui/calendar/types";
import {
  ACTIVITY_CALENDAR_MARKER_SPAN_DAYS,
  ACTIVITY_OVERVIEW_AVG_12M_DAYS,
  ACTIVITY_OVERVIEW_AVG_30D_DAYS,
  ACTIVITY_OVERVIEW_AVG_7D_DAYS,
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

/** Spec: distinct GET keys equal union(Today row, 7D, 30D, 365D) — nested windows collapse to the 365 trail. */
function expectedDedupedOverviewFetchUnionSize(anchor: DayKey): number {
  return new Set<DayKey>([
    anchor,
    ...activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_AVG_7D_DAYS),
    ...activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_AVG_30D_DAYS),
    ...activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_AVG_12M_DAYS),
  ]).size;
}

describe("computeActivityOverviewFetchDayKeys", () => {
  it("returns exactly the 365-day inclusive trail ending on the anchor (no device-today bleed, no week future days)", () => {
    const anchor = "2026-04-08" as DayKey;
    const keys = computeActivityOverviewFetchDayKeys(anchor);
    const trail = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_AVG_12M_DAYS);
    expect(keys).toEqual([...trail].sort());
    expect(keys).toHaveLength(ACTIVITY_OVERVIEW_AVG_12M_DAYS);
    expect(keys[0]).toBe("2025-04-09");
    expect(keys[keys.length - 1]).toBe("2026-04-08");
    expect(expectedDedupedOverviewFetchUnionSize(anchor)).toBe(keys.length);
  });

  it("for anchor 2026-04-12: bounded to trailing windows ending that day, no keys after anchor, earliest is 365D start only", () => {
    const anchor = "2026-04-12" as DayKey;
    const keys = computeActivityOverviewFetchDayKeys(anchor);
    const trail365 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_AVG_12M_DAYS);

    expect(keys).toEqual([...trail365].sort());
    expect(keys).toHaveLength(365);
    expect(keys[keys.length - 1]).toBe("2026-04-12");
    expect(keys.every((k) => k <= anchor)).toBe(true);
    expect(keys[0]).toBe(trail365[0]);
    expect(keys[0]).toBe("2025-04-13");
    expect(expectedDedupedOverviewFetchUnionSize(anchor)).toBe(365);
  });

  it("does not extend fetch range when calendar today is after the selected anchor", () => {
    const keysHistorical = computeActivityOverviewFetchDayKeys("2026-03-15");
    expect(keysHistorical[keysHistorical.length - 1]).toBe("2026-03-15");
    expect(keysHistorical.every((k) => k <= "2026-03-15")).toBe(true);
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
