import { describe, expect, it } from "@jest/globals";
import {
  WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS,
  WORKOUT_MONTH_SUMMARY_REBUILD_RANGE_MAX_MONTHS,
  countInclusiveCalendarDays,
  enumerateMonthKeysInclusive,
  workoutDaySummariesQuerySchema,
  workoutMonthSummariesRebuildRangeRequestDtoSchema,
} from "@oli/contracts";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("workoutSummaryRebuildLimits", () => {
  it("countInclusiveCalendarDays matches enumerateDayKeysInclusive length", () => {
    const start = "2025-03-01" as DayKey;
    const end = "2025-03-31" as DayKey;
    const n = countInclusiveCalendarDays(start, end);
    let k = 0;
    let d = start;
    while (d <= end) {
      k += 1;
      d = addCalendarDaysToDayKey(d, 1);
    }
    expect(n).toBe(k);
  });

  it("enumerateMonthKeysInclusive respects max-month policy boundary", () => {
    const keys = enumerateMonthKeysInclusive("2026-01", "2026-12");
    expect(keys.length).toBe(12);
    expect(keys.length).toBeLessThanOrEqual(WORKOUT_MONTH_SUMMARY_REBUILD_RANGE_MAX_MONTHS);
  });

  it("rejects workout day query range over max days", () => {
    const start = "2025-01-01" as DayKey;
    let end: DayKey = start;
    for (let i = 0; i < WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS; i += 1) {
      end = addCalendarDaysToDayKey(end, 1);
    }
    expect(countInclusiveCalendarDays(start, end)).toBe(WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS + 1);
    const parsed = workoutDaySummariesQuerySchema.safeParse({ start, end });
    expect(parsed.success).toBe(false);
  });

  it("rejects month rebuild-range over max months", () => {
    const parsed = workoutMonthSummariesRebuildRangeRequestDtoSchema.safeParse({
      startMonthKey: "2025-01",
      endMonthKey: "2027-02",
    });
    expect(parsed.success).toBe(false);
  });
});
