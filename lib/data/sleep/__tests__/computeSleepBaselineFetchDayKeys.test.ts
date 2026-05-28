import { describe, expect, it } from "@jest/globals";

import {
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

  it("includes today and a year-ago day (covers d365)", () => {
    const keys = computeSleepBaselineFetchDayKeys(today);
    expect(keys).toContain(today);
    expect(keys.some((d) => d.startsWith("2025-"))).toBe(true);
  });
});
