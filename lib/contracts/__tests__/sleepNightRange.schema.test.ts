import {
  SLEEP_NIGHT_RANGE_MAX_DAYS,
  sleepNightRangeQuerySchema,
  sleepNightRangeResponseDtoSchema,
} from "../sleepNight";
import { countInclusiveCalendarDays } from "../workoutSummaryRebuildLimits";

describe("sleepNight range contracts", () => {
  it("exports a 90-day inclusive policy max", () => {
    expect(SLEEP_NIGHT_RANGE_MAX_DAYS).toBe(90);
  });

  it("parses start/end query", () => {
    const parsed = sleepNightRangeQuerySchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-07",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts empty nights response within dayCount", () => {
    const parsed = sleepNightRangeResponseDtoSchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-07",
      dayCount: 7,
      resolvedCount: 0,
      nights: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("dayCount matches inclusive calendar span helper", () => {
    expect(countInclusiveCalendarDays("2026-05-01", "2026-05-01")).toBe(1);
    expect(countInclusiveCalendarDays("2026-05-01", "2026-05-30")).toBe(30);
    expect(countInclusiveCalendarDays("2026-01-01", "2026-03-31")).toBeLessThanOrEqual(
      SLEEP_NIGHT_RANGE_MAX_DAYS,
    );
  });
});
