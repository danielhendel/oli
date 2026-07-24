import { describe, expect, it } from "@jest/globals";

import type { SleepNightDocumentDto } from "@oli/contracts";

import { buildSleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const day = "2026-05-18" as DayKey;

function night(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: day,
    wakeDay: day,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "n1",
    isComplete: true,
    mainSleepMinutes: 391,
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...over,
  };
}

function attributedCell(
  calendarDay: DayKey,
  minutes: number,
  id: string,
): WeeklyFitnessSleepNightCell {
  return {
    settled: true,
    view: {
      requestedDay: calendarDay,
      anchorDay: calendarDay,
      wakeDay: calendarDay,
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: calendarDay,
        wakeDay: calendarDay,
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: id,
        isComplete: true,
        mainSleepMinutes: minutes,
      },
    },
  };
}

describe("buildSleepDurationDetailViewModel", () => {
  it("builds ready model with age and history", () => {
    const sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
    for (let i = 0; i < 10; i += 1) {
      const d = addCalendarDaysToDayKey(day, -i);
      sleepNightByDay[d] = attributedCell(d, 420, `e${i}`);
    }
    const vm = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: night(),
      dateOfBirth: "1990-01-01",
      sleepNightByDay,
      historyStatus: "ready",
    });
    expect(vm.title).toBe("Duration");
    expect(vm.currentFormatted).toMatch(/6h/);
    expect(vm.rangeResult?.status).toBe("below_recommended");
    expect(vm.statusSentence).toMatch(/below the recommended range/);
    expect(vm.sevenDay?.hasEnoughData).toBe(true);
    expect(vm.thirtyDay?.hasEnoughData).toBe(true);
    expect(vm.explainers.length).toBe(2);
    expect(vm.accessibilitySummary).not.toMatch(/Optimal|insomnia/i);
  });

  it("withholds range when age unknown", () => {
    const vm = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: night(),
      dateOfBirth: null,
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.rangeResult).toBeNull();
    expect(vm.statusSentence).toBeNull();
    expect(vm.rangeWithheldReason).toBe("unknown_age");
    expect(vm.dataAccuracyBody).toMatch(/age/i);
  });

  it("keeps hero while history loading or error", () => {
    const loading = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: night(),
      dateOfBirth: "1990-01-01",
      sleepNightByDay: {},
      historyStatus: "loading",
    });
    expect(loading.currentPresence).toBe("present");
    expect(loading.isHistoryLoading).toBe(true);
    expect(loading.sevenDay).toBeNull();

    const err = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: night(),
      dateOfBirth: "1990-01-01",
      sleepNightByDay: {},
      historyStatus: "error",
      historyErrorMessage: "Could not load recent sleep averages.",
    });
    expect(err.currentPresence).toBe("present");
    expect(err.canRetryHistory).toBe(true);
    expect(err.rangeResult?.status).toBe("below_recommended");
  });

  it("handles no current value without zero", () => {
    const vm = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: null,
      dateOfBirth: "1990-01-01",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.currentPresence).toBe("absent");
    expect(vm.currentFormatted).toBe("Not available");
    expect(vm.currentValueMinutes).toBeNull();
    expect(vm.rangeResult).toBeNull();
  });

  it("marks minor age as withheld", () => {
    const vm = buildSleepDurationDetailViewModel({
      selectedDay: day,
      todayDayKey: day,
      sleepNight: night(),
      dateOfBirth: "2015-05-18",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.rangeWithheldReason).toBe("minor");
    expect(vm.rangeResult).toBeNull();
  });
});
