import { describe, expect, it } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import {
  buildSleepTodayDetailVm,
  formatSleepTodayHeadlineWithUnit,
} from "@/lib/data/sleep/buildSleepTodayDetailVm";
import type { DayKey } from "@/lib/ui/calendar/types";

function makeAttributedView(day: DayKey, minutes: number): SleepNightViewDto {
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
      deepMinutes: 95,
      remMinutes: 100,
      efficiency: 0.91,
      lowestHeartRateBpm: 52,
      averageHrvMs: 48,
      isComplete: true,
    },
  };
}

function makePriorNightFallbackView(
  day: DayKey,
  anchorDay: DayKey,
  minutes: number,
): SleepNightViewDto {
  return {
    requestedDay: day,
    anchorDay,
    wakeDay: anchorDay,
    resolution: "latest_completed_prior_night",
    isFallback: true,
    sleepNight: {
      anchorDay,
      wakeDay: anchorDay,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: `doc-${anchorDay}`,
      totalSleepMinutes: minutes,
      isComplete: true,
    },
  };
}

describe("formatSleepTodayHeadlineWithUnit", () => {
  it("appends ` Sleep` to the duration string", () => {
    expect(formatSleepTodayHeadlineWithUnit("7h 32m")).toBe("7h 32m Sleep");
  });
});

describe("buildSleepTodayDetailVm", () => {
  const day = "2026-05-18" as DayKey;

  it("returns partial while loading", () => {
    const vm = buildSleepTodayDetailVm({ day, loading: true, cell: undefined });
    expect(vm.status).toBe("partial");
  });

  it("returns partial when cell missing or unsettled", () => {
    expect(
      buildSleepTodayDetailVm({ day, loading: false, cell: undefined }).status,
    ).toBe("partial");
    expect(
      buildSleepTodayDetailVm({ day, loading: false, cell: { settled: false } }).status,
    ).toBe("partial");
  });

  it("returns missing when settled but no view", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: true },
    });
    expect(vm.status).toBe("missing");
  });

  it("rejects `latest_completed_prior_night` attribution", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: {
        settled: true,
        view: makePriorNightFallbackView(day, "2026-05-17" as DayKey, 420),
      },
    });
    expect(vm.status).toBe("missing");
  });

  it("builds the hero headline + metric rows from an attributed night", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: true, view: makeAttributedView(day, 452) },
    });
    if (vm.status !== "ready") {
      throw new Error(`expected ready, got ${vm.status}`);
    }
    expect(vm.headlineWithUnit).toBe("7h 32m Sleep");
    expect(vm.model.metricRows.map((r) => r.id)).toEqual([
      "deep_sleep",
      "rem_sleep",
      "sleep_efficiency",
      "lowest_heart_rate",
      "average_hrv",
    ]);
    const byId = Object.fromEntries(vm.model.metricRows.map((r) => [r.id, r.value]));
    expect(byId.deep_sleep).toBe("1h 35m");
    expect(byId.rem_sleep).toBe("1h 40m");
    expect(byId.sleep_efficiency).toBe("91%");
    expect(byId.lowest_heart_rate).toBe("52 bpm");
    expect(byId.average_hrv).toBe("48 ms");
  });

  it("falls back to missing when totalSleepMinutes is absent", () => {
    const view = makeAttributedView(day, 0);
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: true, view },
    });
    expect(vm.status).toBe("missing");
  });
});
