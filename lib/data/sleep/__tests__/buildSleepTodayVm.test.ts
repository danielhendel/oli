import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import { buildSleepTodayVm } from "@/lib/data/sleep/buildSleepTodayVm";
import type { DayKey } from "@/lib/ui/calendar/types";

function makeView(day: DayKey, minutes: number): SleepNightViewDto {
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
      sourceDocumentId: `doc-${day}`,
      totalSleepMinutes: minutes,
      isComplete: true,
    },
  };
}

describe("buildSleepTodayVm", () => {
  const day = "2026-05-18" as DayKey;

  it("renders completed sleep duration and subtitle", () => {
    const vm = buildSleepTodayVm({
      selectedDay: day,
      loading: false,
      cell: { settled: true, view: makeView(day, 545) },
    });
    expect(vm.durationText).toBe("9h 5m");
    expect(vm.statusPill?.label).toBe("Optimal");
    expect(vm.subtitle).toBe("Completed sleep from last night.");
  });

  it("renders friendly empty state when no completed sleep", () => {
    const vm = buildSleepTodayVm({
      selectedDay: day,
      loading: false,
      cell: { settled: true },
    });
    expect(vm.durationText).toBeNull();
    expect(vm.statusPill).toBeNull();
    expect(vm.subtitle).toBe("No completed sleep found for this day.");
  });
});
