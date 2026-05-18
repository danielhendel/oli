import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import {
  averageMinutesFromCompletedSleepNights,
  collectCompletedSleepNightsForWeek,
  weeklyFitnessWeekWakeWindow,
} from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
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

describe("weeklyFitnessWeekWakeWindow", () => {
  const week: DayKey[] = [
    "2026-05-17" as DayKey,
    "2026-05-18" as DayKey,
    "2026-05-19" as DayKey,
    "2026-05-20" as DayKey,
    "2026-05-21" as DayKey,
    "2026-05-22" as DayKey,
    "2026-05-23" as DayKey,
  ];

  it("on Monday caps last countable wake at today while week spans Sun–Sat", () => {
    expect(weeklyFitnessWeekWakeWindow(week, "2026-05-18" as DayKey)).toEqual({
      weekStartDay: "2026-05-17",
      weekEndDay: "2026-05-23",
      lastCountableWakeDay: "2026-05-18",
    });
  });
});

describe("collectCompletedSleepNightsForWeek", () => {
  const week: DayKey[] = [
    "2026-05-17" as DayKey,
    "2026-05-18" as DayKey,
    "2026-05-19" as DayKey,
    "2026-05-20" as DayKey,
    "2026-05-21" as DayKey,
    "2026-05-22" as DayKey,
    "2026-05-23" as DayKey,
  ];

  it("Monday includes wake-Sunday (8h) and wake-Monday (9h): avg 8h 30m, denominator 2", () => {
    const today = "2026-05-18" as DayKey;
    const sun = "2026-05-17" as DayKey;
    const { completedNights, totalMinutes } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [sun]: {
          settled: true,
          view: makeWakeDayView(sun, 480, "sat-night-doc"),
        },
        [today]: {
          settled: true,
          view: makeWakeDayView(today, 540, "sun-night-doc"),
        },
      },
    });
    expect(completedNights).toHaveLength(2);
    expect(completedNights.map((n) => n.wakeDay).sort()).toEqual([sun, today]);
    expect(totalMinutes).toBe(1020);
    expect(averageMinutesFromCompletedSleepNights(completedNights)).toBe(510);
  });

  it("ignores future calendar days (not in sleepNightByDay fetch set)", () => {
    const today = "2026-05-18" as DayKey;
    const { completedNights } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [today]: { settled: true, view: makeWakeDayView(today, 480, "doc-1") },
      },
    });
    expect(completedNights.some((n) => n.calendarDay > today)).toBe(false);
  });

  it("averages multiple completed nights with unique episodes", () => {
    const today = "2026-05-19" as DayKey;
    const mon = "2026-05-18" as DayKey;
    const tue = "2026-05-19" as DayKey;
    const { completedNights } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [mon]: { settled: true, view: makeWakeDayView(mon, 480, "doc-mon") },
        [tue]: { settled: true, view: makeWakeDayView(tue, 510, "doc-tue") },
      },
    });
    expect(completedNights).toHaveLength(2);
    expect(averageMinutesFromCompletedSleepNights(completedNights)).toBe(495);
  });

  it("dedupes the same episode requested on two calendar days", () => {
    const today = "2026-05-18" as DayKey;
    const sun = "2026-05-17" as DayKey;
    const shared = makeWakeDayView(today, 492, "same-doc");
    const { completedNights } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [sun]: { settled: true, view: { ...shared, requestedDay: sun } },
        [today]: { settled: true, view: shared },
      },
    });
    expect(completedNights).toHaveLength(1);
  });

  it("excludes wake days before week start or after today", () => {
    const today = "2026-05-18" as DayKey;
    const satBeforeWeek = "2026-05-16" as DayKey;
    const view = makeWakeDayView(satBeforeWeek, 420, "prior-week");
    const { completedNights } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [today]: { settled: true, view },
      },
    });
    expect(completedNights).toHaveLength(0);
  });

  it("excludes unsettled and incomplete nights", () => {
    const today = "2026-05-18" as DayKey;
    const { completedNights } = collectCompletedSleepNightsForWeek({
      weekDayKeys: week,
      todayDayKey: today,
      sleepNightByDay: {
        [today]: { settled: false, view: makeWakeDayView(today, 480, "a") },
      },
    });
    expect(completedNights).toHaveLength(0);
  });
});
