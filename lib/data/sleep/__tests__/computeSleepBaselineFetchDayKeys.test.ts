import { describe, expect, it } from "@jest/globals";

import { SLEEP_NIGHT_RANGE_MAX_DAYS } from "@oli/contracts";

import {
  computeSleepBaselineFetchDayKeys,
  computeSleepOverviewFetchDayKeys,
  sleepNightRangeFetchWindows,
} from "@/lib/data/sleep/sleepOverviewRanges";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("computeSleepBaselineFetchDayKeys", () => {
  const today = "2026-04-06" as DayKey;

  it("returns sorted unique day keys, all ≤ today", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((d) => d <= today)).toBe(true);
  });

  it("never includes future calendar days", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys).not.toContain("2026-04-07");
    expect(keys).not.toContain("2026-04-08");
  });

  it("is a strict subset of the overview union (ignoring future strip days)", () => {
    const baseline = computeSleepBaselineFetchDayKeys(today);
    const overview = new Set(computeSleepOverviewFetchDayKeys(today, today));
    for (const d of baseline) {
      expect(overview.has(d)).toBe(true);
    }
  });

  it("includes today and a year-ago day (covers d365)", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys).toContain(today);
    expect(keys.some((d) => d.startsWith("2025-"))).toBe(true);
  });
});

describe("sleepNightRangeFetchWindows", () => {
  it("returns empty for no keys", () => {
    expect(sleepNightRangeFetchWindows([])).toEqual([]);
  });

  it("returns one window when span is within API max", () => {
    const keys = ["2026-04-01", "2026-04-06"] as DayKey[];
    expect(sleepNightRangeFetchWindows(keys)).toEqual([{ start: "2026-04-01", end: "2026-04-06" }]);
  });

  it("chunks a year span into windows of at most SLEEP_NIGHT_RANGE_MAX_DAYS", () => {
    const yearKeys: DayKey[] = [];
    for (let i = 365; i >= 0; i--) {
      const d = new Date(Date.UTC(2026, 3, 6));
      d.setUTCDate(d.getUTCDate() - i);
      yearKeys.push(d.toISOString().slice(0, 10) as DayKey);
    }
    const windows = sleepNightRangeFetchWindows(yearKeys);
    expect(windows.length).toBeGreaterThan(1);
    expect(windows.length).toBe(Math.ceil(yearKeys.length / SLEEP_NIGHT_RANGE_MAX_DAYS));
    for (const w of windows) {
      const start = new Date(`${w.start}T12:00:00.000Z`);
      const end = new Date(`${w.end}T12:00:00.000Z`);
      const inclusive = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      expect(inclusive).toBeLessThanOrEqual(SLEEP_NIGHT_RANGE_MAX_DAYS);
      expect(w.start <= w.end).toBe(true);
    }
    expect(windows[0]!.start).toBe(yearKeys[0]);
    expect(windows[windows.length - 1]!.end).toBe(yearKeys[yearKeys.length - 1]);
  });
});
