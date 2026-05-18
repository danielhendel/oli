import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import { buildWeeklySleepVm } from "@/lib/data/sleep/buildWeeklySleepVm";
import type { DayKey } from "@/lib/ui/calendar/types";

function makeWakeDayView(day: DayKey, minutes: number, sourceDocumentId: string): SleepNightViewDto {
  return {
    requestedDay: day,
    anchorDay: day,
    wakeDay: day,
    resolution: "wake_day",
    isFallback: false,
    sleepNight: {
      anchorDay: day,
      wakeDay: day,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId,
      totalSleepMinutes: minutes,
      isComplete: true,
    },
  };
}

describe("buildWeeklySleepVm", () => {
  const week: DayKey[] = [
    "2026-05-17",
    "2026-05-18",
    "2026-05-19",
    "2026-05-20",
    "2026-05-21",
    "2026-05-22",
    "2026-05-23",
  ] as DayKey[];
  const today = "2026-05-18" as DayKey;
  const sun = "2026-05-17" as DayKey;

  it("weekly average divides by completed nights only", () => {
    const vm = buildWeeklySleepVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      sleepNightByDay: {
        [sun]: {
          settled: true,
          view: makeWakeDayView(sun, 480, "sat-night"),
        },
        [today]: {
          settled: true,
          view: makeWakeDayView(today, 540, "sun-night"),
        },
      },
    });
    expect(vm.isEmpty).toBe(false);
    expect(vm.weeklyAverageText).toBe("8h 30m");
  });

  it("includes seven chart day slots with empty bars for missing nights", () => {
    const vm = buildWeeklySleepVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      sleepNightByDay: {
        [today]: {
          settled: true,
          view: makeWakeDayView(today, 420, "only-night"),
        },
      },
    });
    expect(vm.chartPoints).toHaveLength(7);
    const mon = vm.chartPoints.find((p) => p.dayKey === today);
    expect(mon?.value).toBe(420);
    const tue = vm.chartPoints.find((p) => p.dayKey === "2026-05-19");
    expect(tue?.value).toBe(0);
  });

  it("missing incomplete nights do not count in average", () => {
    const vm = buildWeeklySleepVm({
      todayDayKey: today,
      weekAnchorDay: today,
      weekDayKeys: week,
      sleepNightByDay: {
        [today]: {
          settled: true,
          view: {
            ...makeWakeDayView(today, 600, "incomplete"),
            sleepNight: {
              ...makeWakeDayView(today, 600, "incomplete").sleepNight,
              isComplete: false,
            },
          },
        },
        [sun]: {
          settled: true,
          view: makeWakeDayView(sun, 480, "complete"),
        },
      },
    });
    expect(vm.weeklyAverageText).toBe("8h");
  });
});
