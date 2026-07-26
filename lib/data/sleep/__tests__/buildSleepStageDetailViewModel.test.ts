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
  it("ready with minutes hero, percent secondary, and adult context for ages 18–64", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      dateOfBirth: "1990-01-01",
      sleepNightByDay: fill(90, 52),
      historyStatus: "ready",
    });
    expect(vm.title).toBe("Deep Sleep");
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.currentPresence).toBe("present");
    expect(vm.percentOfTotalSleepSentence).toBe("11% of total sleep");
    expect(vm.adultContext?.statusLabel).toBe("Below typical range");
    expect(vm.adultContext?.belowLabel).toBe("Below Typical");
    expect(vm.adultContext?.typicalLabel).toBe("Typical");
    expect(vm.adultContext?.aboveLabel).toBe("Above Typical");
    expect(vm.adultContext?.typicalPercentRangeText).toBe("16–20% of total sleep");
    expect(vm.adultContext?.equivalentMinutesSentence).toContain("for this sleep duration");
    expect(vm.adultContext?.zoneFractions.typical).toBeGreaterThanOrEqual(0.18);
    expect(vm.adultContext?.ninetyDayMarkerPosition01).not.toBeNull();
    expect(vm.adultContext?.ninetyDayPercentDisplay).not.toBeNull();
    expect(vm.adultContextResult?.modelVersion).toBe("sleep-stage-adult-context-v1");
    expect(vm.pattern?.sevenDay.value).toMatch(/· \d+%$/);
    expect(vm.pattern?.sevenDay.secondaryValue).toBeNull();
    expect(vm.pattern?.sevenDay.statusLabel).toBe("Below range");
    expect(vm.pattern?.thirtyDay.statusLabel).toBe("Below range");
    expect(vm.pattern?.ninetyDay.statusLabel).toBe("Below range");
    expect(vm.pattern?.sevenDay.accessibilitySummary).toContain("Below range");
    expect(vm.personalComparison).not.toBeNull();
    expect(vm.explainers[1]?.body).toContain("16–20%");
    expect(vm.accessibilitySummary).toContain("Deep Sleep");
    expect(vm.accessibilitySummary).toContain("50m");
    expect(vm.accessibilitySummary).toContain("11% of total sleep");
    expect(vm.accessibilitySummary).toContain("Below typical range");
    expect(vm.accessibilitySummary).toContain("Today is 11 percent");
    expect(vm.accessibilitySummary).toMatch(/90-day average is \d+ percent/);
    expect(vm.accessibilitySummary).not.toContain("below your recent average");
    expect(vm.sourceLine).toBeNull();
    expect(vm.dataAccuracyContextLine).toBeNull();
    expect(vm.accessibilitySummary).not.toMatch(
      /\bOptimal\b|\bGood\b|\bFair\b|\bLow\b|Recommended|sourceDocumentId|evidenceIds|dateOfBirth/i,
    );
  });

  it("withholds adult context for unknown age while keeping personal pattern", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      dateOfBirth: null,
      sleepNightByDay: fill(90, 52),
      historyStatus: "ready",
    });
    expect(vm.percentOfTotalSleepSentence).toBe("11% of total sleep");
    expect(vm.adultContext).toBeNull();
    expect(vm.adultContextWithheldReason).toBe("unknown_age");
    expect(vm.personalComparison).not.toBeNull();
    expect(vm.explainers[1]?.body).toContain("without a general adult-context classification");
  });

  it("withholds adult context for age 65+ and minors", () => {
    const older = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      dateOfBirth: "1950-01-01",
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(older.adultContext).toBeNull();
    expect(older.adultContextWithheldReason).toBe("older_adult");

    const minor = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      dateOfBirth: "2012-01-01",
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(minor.adultContext).toBeNull();
    expect(minor.adultContextWithheldReason).toBe("minor");
  });

  it("ready without percentage when denominator missing", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "deep_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ totalSleepMinutes: undefined, deepPercent: undefined }),
      dateOfBirth: "1990-01-01",
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.currentFormatted).toBe("50m");
    expect(vm.percentOfTotalSleepSentence).toBeNull();
    expect(vm.adultContext).toBeNull();
  });

  it("insufficient history shows Not enough data without zero or fabricated status", () => {
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
    expect(vm.pattern?.sevenDay.statusLabel).toBeNull();
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
  it("ready with rem minutes, percent, and within typical adult context", () => {
    const vm = buildSleepStageDetailViewModel({
      metricId: "rem_sleep",
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ remMinutes: 135, remPercent: 30 }),
      resolution: "exact_anchor",
      dateOfBirth: "1990-01-01",
      sleepNightByDay: fill(90, 52),
      historyStatus: "ready",
    });
    expect(vm.title).toBe("REM Sleep");
    expect(vm.currentFormatted).toBe("2h 15m");
    expect(vm.percentOfTotalSleepSentence).toBe("30% of total sleep");
    expect(vm.adultContext?.statusLabel).toBe("In typical range");
    expect(vm.adultContext?.typicalLabel).toBe("Typical");
    expect(vm.adultContext?.typicalPercentRangeText).toBe("21–30% of total sleep");
    expect(vm.adultContext?.zoneFractions.typical).toBeGreaterThanOrEqual(0.22);
    expect(vm.pattern?.sevenDay.statusLabel).toBe("In range");
    expect(vm.explainers[0]?.body).toContain("dreaming");
    expect(vm.explainers[1]?.body).toContain("21–30%");
    expect(vm.accessibilitySummary).toContain("In typical range");
    expect(vm.accessibilitySummary).not.toMatch(/\bOptimal\b|\bquality\b|Recommended/i);
  });
});
