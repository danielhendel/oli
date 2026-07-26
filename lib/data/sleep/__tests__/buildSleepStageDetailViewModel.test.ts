import { describe, expect, it } from "@jest/globals";

import type { SleepNightDocumentDto, SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { buildSleepStageDetailViewModel } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function night(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: selected,
    wakeDay: selected,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "current",
    isComplete: true,
    updatedAt: "2026-05-18T12:00:00.000Z",
    totalSleepMinutes: 450,
    mainSleepMinutes: 450,
    deepMinutes: 50,
    remMinutes: 132,
    deepPercent: 11,
    remPercent: 29,
    ...over,
  };
}

function makeView(
  day: DayKey,
  deepMinutes: number,
  remMinutes = 120,
): SleepNightViewDto {
  return {
    requestedDay: day,
    anchorDay: day,
    wakeDay: day,
    resolution: "exact_anchor",
    isFallback: false,
    sleepNight: {
      anchorDay: day,
      wakeDay: day,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: `ep-${day}`,
      mainSleepMinutes: 450,
      totalSleepMinutes: 450,
      deepMinutes,
      remMinutes,
      deepPercent: Math.round((deepMinutes / 450) * 100),
      remPercent: Math.round((remMinutes / 450) * 100),
      isComplete: true,
    },
  };
}

function fill(count: number, deepMinutes: number): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(selected, -(count - 1 - i));
    map[day] = { settled: true, view: makeView(day, deepMinutes) };
  }
  return map;
}

describe("buildSleepStageDetailViewModel — Deep", () => {
  it("ready with minutes hero and percent secondary", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: fill(90, 52),
      historyStatus: "ready",
    });
    expect(vm.title).toBe("Deep Sleep");
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.currentPresence).toBe("present");
    expect(vm.percentOfTotalSleepSentence).toBe("11% of total sleep");
    expect(vm.pattern?.sevenDay.value).not.toBe("Not enough data");
    expect(vm.personalComparison).not.toBeNull();
    expect(vm.accessibilitySummary).toContain("Deep Sleep");
    expect(vm.accessibilitySummary).toContain("50m");
    expect(vm.accessibilitySummary).toContain("11% of total sleep");
    expect(vm.sourceLine).toBeNull();
    expect(vm.dataAccuracyContextLine).toBeNull();
    expect(vm.accessibilitySummary).not.toMatch(
      /\bIn range\b|\bOptimal\b|\bGood\b|\bFair\b|\bLow\b|sourceDocumentId/i,
    );
  });

  it("ready without percentage when denominator missing", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ totalSleepMinutes: undefined, deepPercent: undefined }),
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.percentOfTotalSleepSentence).toBeNull();
  });

  it("insufficient history shows Not enough data without zero", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: fill(2, 50),
      historyStatus: "ready",
    });
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.pattern?.sevenDay.value).toBe("Not enough data");
    expect(vm.personalComparison).toBeNull();
  });

  it("history loading keeps hero and marks loading", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: {},
      historyStatus: "loading",
    });
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.isHistoryLoading).toBe(true);
    expect(vm.pattern).toBeNull();
    expect(vm.accessibilitySummary).toContain("Loading recent sleep averages");
  });

  it("history error retains hero and allows retry", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: {},
      historyStatus: "error",
      historyErrorMessage: "Could not load recent sleep averages.",
    });
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.canRetryHistory).toBe(true);
    expect(vm.historyErrorMessage).toBe("Could not load recent sleep averages.");
    expect(vm.pattern).toBeNull();
  });

  it("no current value yields Not available (not 0m)", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ deepMinutes: undefined }),
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(vm.currentPresence).toBe("absent");
    expect(vm.currentFormatted).toBe("Not available");
    expect(vm.percentOfTotalSleepSentence).toBeNull();
  });

  it("uses card formatted override when present", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      currentFormattedOverride: "50m",
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(vm.currentFormatted).toBe("50m");
  });

  it("includes wearable accuracy copy and deep education", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(vm.explainers[0]?.heading).toBe("What it measures");
    expect(vm.explainers[0]?.body).toContain("physical restoration");
    expect(vm.dataAccuracyBody).toContain("clinical sleep study");
  });
});

describe("buildSleepStageDetailViewModel — REM", () => {
  it("ready with rem minutes and percent", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "rem_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      sleepNightByDay: fill(90, 52),
      historyStatus: "ready",
    });
    expect(vm.title).toBe("REM Sleep");
    expect(vm.currentFormatted).toBe("2h 12m");
    expect(vm.percentOfTotalSleepSentence).toBe("29% of total sleep");
    expect(vm.explainers[0]?.body).toContain("dreaming");
    expect(vm.accessibilitySummary).not.toMatch(/\bIn range\b|\bOptimal\b|\bquality\b/i);
  });
});
