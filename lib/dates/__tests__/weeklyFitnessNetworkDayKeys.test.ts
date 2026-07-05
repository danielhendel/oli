import { networkDayKeysThroughToday } from "@/lib/dates/boundDayKeys";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("weekly fitness network day keys", () => {
  it("Sunday current week requests only Sunday (plus prior-day shell context is separate)", () => {
    const today = "2026-07-05" as DayKey; // Sunday
    const week = getWeekDaysForAnchor(today);
    expect(networkDayKeysThroughToday(week, today)).toEqual(["2026-07-05"]);
  });

  it("Wednesday requests Sunday through Wednesday", () => {
    const today = "2026-07-01" as DayKey; // Wednesday (Jul 5 2026 is Sunday)
    const week = getWeekDaysForAnchor(today);
    expect(networkDayKeysThroughToday(week, today)).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
    ]);
  });

  it("excludes future days from network rollup", () => {
    const today = "2026-07-01" as DayKey;
    const week = getWeekDaysForAnchor(today);
    const network = networkDayKeysThroughToday(week, today);
    expect(network.every((d) => d <= today)).toBe(true);
    expect(week.length).toBe(7);
    expect(network.length).toBe(4);
  });
});
