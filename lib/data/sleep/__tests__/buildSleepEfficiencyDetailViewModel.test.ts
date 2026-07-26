import { describe, expect, it } from "@jest/globals";

import type { SleepNightDocumentDto, SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { buildSleepEfficiencyDetailViewModel } from "@/lib/data/sleep/buildSleepEfficiencyDetailViewModel";
import { SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY } from "@/lib/data/sleep/sleepEfficiencyExplainerCopy";
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
    efficiency: 93,
    ...over,
  };
}

function makeView(day: DayKey, efficiency: number): SleepNightViewDto {
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
      efficiency,
      isComplete: true,
    },
  };
}

function fill(count: number, efficiency: number): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(selected, -(count - 1 - i));
    map[day] = { settled: true, view: makeView(day, efficiency) };
  }
  return map;
}

describe("buildSleepEfficiencyDetailViewModel", () => {
  it("ready with hero %, guideline status, two-zone bar, and 7/30/90 pattern", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 93 }),
      resolution: "exact_anchor",
      sleepNightByDay: fill(90, 91),
      historyStatus: "ready",
    });
    expect(vm.title).toBe("Sleep Efficiency");
    expect(vm.currentFormatted).toBe("93%");
    expect(vm.currentPresence).toBe("present");
    expect(vm.statusSentence).toBe("Meets typical guideline");
    expect(vm.guidelineResult?.status).toBe("meets_guideline");
    expect(vm.guidelineResult?.modelVersion).toBe("sleep-efficiency-guideline-v1");
    expect(vm.guideline?.belowLabel).toBe("Below Guideline");
    expect(vm.guideline?.meetsLabel).toBe("Meets Guideline");
    expect(vm.guideline?.belowRangeText).toBe("<85%");
    expect(vm.guideline?.meetsRangeText).toBe("≥85%");
    expect(vm.guideline?.zoneFractions.below).toBeGreaterThan(0);
    expect(vm.guideline?.zoneFractions.meets).toBeGreaterThan(0);
    expect(Object.keys(vm.guideline!.zoneFractions).sort()).toEqual(["below", "meets"]);
    expect(vm.pattern?.sevenDay.value).toBe("91%");
    expect(vm.pattern?.sevenDay.statusLabel).toBe("Meets guideline");
    expect(vm.pattern?.thirtyDay.statusLabel).toBe("Meets guideline");
    expect(vm.pattern?.ninetyDay.statusLabel).toBe("Meets guideline");
    expect(vm.explainers[0]?.body).toBe(
      SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY.whatItMeasures.body,
    );
    expect(vm.dataAccuracyBody).toContain("wearable");
    expect(vm.sourceLine).toBeNull();
    expect(vm.dataAccuracyContextLine).toBeNull();
    expect(vm.accessibilitySummary).toContain("Sleep Efficiency");
    expect(vm.accessibilitySummary).toContain("93 percent");
    expect(vm.accessibilitySummary).toContain("Meets typical guideline");
    expect(vm.accessibilitySummary).toContain("85 percent or higher");
    expect(vm.accessibilitySummary).toContain("meets the guideline");
    expect(vm.accessibilitySummary).not.toMatch(
      /\bOptimal\b|\bGood\b|\bFair\b|\bElite\b|Insomnia|Healthy|sourceDocumentId|evidenceIds|timeInBed|SleepNight/i,
    );
  });

  it("classifies below guideline at 84.99 before display rounding", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 84.99 }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.currentDisplayPercent).toBe(85);
    expect(vm.statusSentence).toBe("Below typical guideline");
    expect(vm.guidelineResult?.status).toBe("below_guideline");
  });

  it("loading history keeps hero ready with pattern skeletons via loading flag", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "loading",
    });
    expect(vm.currentFormatted).toBe("93%");
    expect(vm.statusSentence).toBe("Meets typical guideline");
    expect(vm.guideline).not.toBeNull();
    expect(vm.pattern).toBeNull();
    expect(vm.isHistoryLoading).toBe(true);
    expect(vm.accessibilitySummary).toContain("Loading recent sleep averages");
  });

  it("history error keeps hero and exposes retry", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night(),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "error",
      historyErrorMessage: "Could not load recent sleep averages.",
    });
    expect(vm.currentPresence).toBe("present");
    expect(vm.canRetryHistory).toBe(true);
    expect(vm.pattern).toBeNull();
    expect(vm.historyErrorMessage).toContain("Could not load");
  });

  it("insufficient history shows Not enough data without status", () => {
    const sparse: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {
      [selected]: { settled: true, view: makeView(selected, 90) },
    };
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 90 }),
      resolution: "exact_anchor",
      sleepNightByDay: sparse,
      historyStatus: "ready",
    });
    expect(vm.pattern?.sevenDay.value).toBe("Not enough data");
    expect(vm.pattern?.sevenDay.statusLabel).toBeNull();
    expect(vm.pattern?.thirtyDay.statusLabel).toBeNull();
    expect(vm.accessibilitySummary).not.toMatch(/\d+ of \d+ nights/);
  });

  it("no current efficiency → Not available without classification or zero", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: undefined }),
      resolution: "exact_anchor",
      sleepNightByDay: fill(90, 90),
      historyStatus: "ready",
    });
    expect(vm.currentFormatted).toBe("Not available");
    expect(vm.currentPresence).toBe("absent");
    expect(vm.statusSentence).toBeNull();
    expect(vm.guideline).toBeNull();
    expect(vm.currentFormatted).not.toBe("0%");
  });

  it("rejects prior-night fallback and incomplete nights", () => {
    const prior = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 95 }),
      resolution: "latest_completed_prior_night",
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(prior.currentPresence).toBe("absent");
    expect(prior.guideline).toBeNull();

    const incomplete = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 95, isComplete: false }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "idle",
    });
    expect(incomplete.currentPresence).toBe("absent");
  });

  it("rejects invalid efficiency without clamping", () => {
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 140 }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(vm.currentPresence).toBe("absent");
    expect(vm.statusSentence).toBeNull();
  });

  it("pattern below-threshold average uses Below guideline", () => {
    const map = fill(90, 80);
    const vm = buildSleepEfficiencyDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: night({ efficiency: 80 }),
      resolution: "exact_anchor",
      sleepNightByDay: map,
      historyStatus: "ready",
    });
    expect(vm.statusSentence).toBe("Below typical guideline");
    expect(vm.pattern?.sevenDay.statusLabel).toBe("Below guideline");
    expect(vm.pattern?.ninetyDay.statusLabel).toBe("Below guideline");
  });
});
