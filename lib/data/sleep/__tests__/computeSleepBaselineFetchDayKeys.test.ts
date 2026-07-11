import { describe, expect, it } from "@jest/globals";

import {
  SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS,
  boundSleepNightFetchDayKeys,
  computeSleepBaselineFetchDayKeys,
  computeSleepOverviewFetchDayKeys,
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

  it("stays within the interactive per-day fetch bound (no 30/90/365 fan-out)", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys.length).toBeLessThanOrEqual(SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS);
    expect(keys.length).toBeLessThanOrEqual(7);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("does not include a year-ago day (range API required for long baselines)", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys.some((d) => d.startsWith("2025-"))).toBe(false);
  });
});

describe("computeSleepOverviewFetchDayKeys", () => {
  const today = "2026-04-06" as DayKey;

  it("stays within the interactive per-day fetch bound", () => {
    const keys = computeSleepOverviewFetchDayKeys(today, today);
    const elapsed = keys.filter((d) => d <= today);
    expect(elapsed.length).toBeLessThanOrEqual(SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS);
  });
});

describe("boundSleepNightFetchDayKeys", () => {
  it("keeps the most recent maxDays when given a year of keys", () => {
    const today = "2026-07-10" as DayKey;
    const yearKeys: DayKey[] = [];
    for (let i = 365; i >= 0; i--) {
      const d = new Date(Date.UTC(2026, 6, 10));
      d.setUTCDate(d.getUTCDate() - i);
      yearKeys.push(d.toISOString().slice(0, 10) as DayKey);
    }
    expect(yearKeys.length).toBeGreaterThan(SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS);
    const bounded = boundSleepNightFetchDayKeys(yearKeys, today);
    expect(bounded.filter((d) => d <= today).length).toBe(SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS);
    expect(bounded[bounded.length - 1] === today || bounded.includes(today)).toBe(true);
    expect(bounded.filter((d) => d <= today).every((d) => d <= today)).toBe(true);
  });
});
