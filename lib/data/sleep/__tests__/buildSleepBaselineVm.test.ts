import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import { buildSleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import type { DayKey } from "@/lib/ui/calendar/types";

function makeView(day: DayKey, minutes: number, id: string): SleepNightViewDto {
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
      sourceDocumentId: id,
      totalSleepMinutes: minutes,
      isComplete: true,
    },
  };
}

describe("buildSleepBaselineVm", () => {
  const today = "2026-05-18" as DayKey;

  it("computes 7-day average from completed nights only", () => {
    const sleepNightByDay = {
      "2026-05-12": { settled: true, view: makeView("2026-05-12", 420, "a") },
      "2026-05-18": { settled: true, view: makeView("2026-05-18", 540, "b") },
    } as const;

    const vm = buildSleepBaselineVm({ todayDayKey: today, sleepNightByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.hasEnoughData).toBe(true);
    expect(row7?.displayValue).toBe("8h/night");
    expect(row7?.statusLabel).toBe("Optimal");
  });

  it("exposes 7, 30, 90, YTD, and 12 month rows", () => {
    const vm = buildSleepBaselineVm({ todayDayKey: today, sleepNightByDay: {} });
    expect(vm.rows.map((r) => r.label)).toEqual(["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]);
  });

  it("applies status pill thresholds from average duration", () => {
    const sleepNightByDay = {
      [today]: { settled: true, view: makeView(today, 6 * 60 + 30, "fair-night") },
    };
    const vm = buildSleepBaselineVm({ todayDayKey: today, sleepNightByDay });
    const row7 = vm.rows.find((r) => r.key === "day7");
    expect(row7?.statusLabel).toBe("Fair");
  });
});
