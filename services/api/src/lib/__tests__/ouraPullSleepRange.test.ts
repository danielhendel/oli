/**
 * Mirrors sleep-only date window math in {@link ../../routes/integrations/ouraPullNow.ts} — overlap refetch + forward end.
 */
import { describe, it, expect } from "@jest/globals";

const WINDOW_DAYS = 30;
const PULL_SLEEP_START_OVERLAP_DAYS = 2;
const PULL_SLEEP_END_OVERLAP_DAYS = 1;

function computeSleepPullRange(now: Date): {
  sleepStartStr: string;
  sleepEndStr: string;
  coreStartStr: string;
  coreEndStr: string;
} {
  const endDate = new Date(now);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - WINDOW_DAYS);

  const sleepRangeEnd = new Date(endDate);
  sleepRangeEnd.setUTCDate(sleepRangeEnd.getUTCDate() + PULL_SLEEP_END_OVERLAP_DAYS);
  const sleepRangeStart = new Date(endDate);
  sleepRangeStart.setUTCDate(
    sleepRangeStart.getUTCDate() - WINDOW_DAYS - PULL_SLEEP_START_OVERLAP_DAYS,
  );

  const y = (d: Date) => d.toISOString().slice(0, 10);
  return {
    sleepStartStr: y(sleepRangeStart),
    sleepEndStr: y(sleepRangeEnd),
    coreStartStr: y(startDate),
    coreEndStr: y(endDate),
  };
}

describe("Oura pull-now sleep fetch window", () => {
  it("extends end_date one UTC day past core end (wake-day rows indexed on next UTC day)", () => {
    const now = new Date(Date.UTC(2026, 3, 19, 14, 30, 0));
    const w = computeSleepPullRange(now);
    expect(w.coreEndStr).toBe("2026-04-19");
    expect(w.sleepEndStr).toBe("2026-04-20");
  });

  it("starts two UTC days before core window start for idempotent overlap", () => {
    const now = new Date(Date.UTC(2026, 3, 19, 9, 0, 0));
    const w = computeSleepPullRange(now);
    expect(w.coreStartStr).toBe("2026-03-20");
    expect(w.sleepStartStr).toBe("2026-03-18");
  });

  it("America/New_York wall-clock morning still uses UTC anchor for window (Apr 19 2026 10:00 NY == 14:00Z)", () => {
    const now = new Date(Date.UTC(2026, 3, 19, 14, 0, 0));
    const w = computeSleepPullRange(now);
    expect(w.sleepEndStr).toBe("2026-04-20");
  });
});
