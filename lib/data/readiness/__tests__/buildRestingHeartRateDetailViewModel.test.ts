import { describe, expect, it } from "@jest/globals";

import type { SleepNightDocumentDto, SleepNightViewDto } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { buildRestingHeartRateDetailViewModel } from "@/lib/data/readiness/buildRestingHeartRateDetailViewModel";
import { RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY } from "@/lib/data/readiness/restingHeartRateExplainerCopy";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const selected = "2026-05-18" as DayKey;
const today = selected;

function makeNight(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: selected,
    wakeDay: selected,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "ep-current",
    mainSleepMinutes: 450,
    totalSleepMinutes: 450,
    lowestHeartRateBpm: 49,
    isComplete: true,
    ...over,
  };
}

function makeView(
  day: DayKey,
  over: Partial<SleepNightViewDto["sleepNight"]> = {},
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
      lowestHeartRateBpm: over.lowestHeartRateBpm ?? 50,
      isComplete: true,
      ...over,
    },
  };
}

function cell(view: SleepNightViewDto): WeeklyFitnessSleepNightCell {
  return { settled: true, view };
}

function fill(
  end: DayKey,
  count: number,
  bpm: number,
): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> {
  const map: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(end, -(count - 1 - i));
    map[day] = cell(makeView(day, { lowestHeartRateBpm: bpm }));
  }
  return map;
}

describe("buildRestingHeartRateDetailViewModel", () => {
  it("builds ready state with personal range and pattern classifications", () => {
    const map = fill(selected, 40, 50);
    map[selected] = cell(makeView(selected, { lowestHeartRateBpm: 49 }));

    const vm = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ lowestHeartRateBpm: 49 }),
      resolution: "exact_anchor",
      sleepNightByDay: map,
      historyStatus: "ready",
    });

    expect(vm.title).toBe("Resting Heart Rate");
    expect(vm.currentFormatted).toBe("49 bpm");
    expect(vm.currentPresence).toBe("present");
    expect(vm.isBuildingBaseline).toBe(false);
    expect(vm.personalRange).not.toBeNull();
    expect(vm.statusSentence).toMatch(/usual range/i);
    expect(vm.pattern?.sevenDay.value).toMatch(/bpm/);
    expect(vm.pattern?.sevenDay.statusLabel).toMatch(/usual range/);
    expect(vm.accessibilitySummary).toContain("Resting Heart Rate.");
    expect(vm.accessibilitySummary).toContain("beats per minute");
    expect(vm.accessibilitySummary).not.toMatch(/Optimal|Healthy|bradycardia|Good/);
    expect(vm.explainers[0]?.body).toBe(
      RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY.whatItMeasures.body,
    );
    expect(vm.dataAccuracyContextLine).toBeNull();
    expect(vm.sourceLine).toBeNull();
  });

  it("shows Building your usual range when history is insufficient", () => {
    const map = fill(selected, 10, 50);
    const vm = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ lowestHeartRateBpm: 49 }),
      resolution: "exact_anchor",
      sleepNightByDay: map,
      historyStatus: "ready",
    });
    expect(vm.isBuildingBaseline).toBe(true);
    expect(vm.statusSentence).toBe("Building your usual range");
    expect(vm.personalRange).toBeNull();
    expect(vm.pattern?.sevenDay.statusLabel).toBeNull();
    expect(vm.accessibilitySummary).toContain("building your usual range");
  });

  it("rejects prior-night fallback and incomplete nights", () => {
    const prior = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight(),
      resolution: "latest_completed_prior_night",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(prior.currentPresence).toBe("absent");
    expect(prior.currentFormatted).toBe("Not available");

    const incomplete = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ isComplete: false }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "ready",
    });
    expect(incomplete.currentPresence).toBe("absent");
  });

  it("keeps hero while history loads or errors", () => {
    const loading = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ lowestHeartRateBpm: 49 }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "loading",
    });
    expect(loading.currentFormatted).toBe("49 bpm");
    expect(loading.isHistoryLoading).toBe(true);
    expect(loading.pattern).toBeNull();

    const errored = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ lowestHeartRateBpm: 49 }),
      resolution: "exact_anchor",
      sleepNightByDay: {},
      historyStatus: "error",
      historyErrorMessage: "Could not load recent heart-rate averages.",
    });
    expect(errored.canRetryHistory).toBe(true);
    expect(errored.historyErrorMessage).toContain("Could not load");
  });

  it("never opens a zero bpm hero for missing physiology", () => {
    const vm = buildRestingHeartRateDetailViewModel({
      selectedDay: selected,
      todayDayKey: today,
      sleepNight: makeNight({ lowestHeartRateBpm: undefined }),
      resolution: "exact_anchor",
      sleepNightByDay: fill(selected, 40, 50),
      historyStatus: "ready",
    });
    expect(vm.currentFormatted).toBe("Not available");
    expect(vm.currentFormatted).not.toBe("0 bpm");
    expect(vm.personalRange).toBeNull();
  });
});
