import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

import { logWeeklyFitnessSleepAverageDev } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("logWeeklyFitnessSleepAverageDev privacy", () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

  beforeEach(() => {
    logSpy.mockClear();
  });

  afterEach(() => {
    logSpy.mockReset();
  });

  it("logs counts only — never minutes, day keys, or per-night health samples", () => {
    logWeeklyFitnessSleepAverageDev({
      todayDayKey: "2026-07-10" as DayKey,
      weekStartDay: "2026-07-05" as DayKey,
      weekEndDay: "2026-07-11" as DayKey,
      lastCountableWakeDay: "2026-07-10" as DayKey,
      completedNights: [
        {
          calendarDay: "2026-07-09" as DayKey,
          wakeDay: "2026-07-09" as DayKey,
          minutes: 412,
          resolution: "exact_anchor",
          sourceDocumentId: "s:1",
        },
      ],
      skipped: [],
      averageMinutes: 412,
    });

    if (!__DEV__) {
      expect(logSpy).not.toHaveBeenCalled();
      return;
    }

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [label, payload] = logSpy.mock.calls[0]!;
    expect(label).toBe("[WEEKLY_FITNESS_SLEEP]");
    expect(payload).toEqual({
      operation: "weekly_fitness_sleep_average",
      denominatorNights: 1,
      skippedCount: 0,
      hasAverageMinutes: true,
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/412/);
    expect(serialized).not.toMatch(/2026-07/);
    expect(serialized).not.toMatch(/"minutes"\s*:/);
  });
});
