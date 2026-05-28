import { describe, expect, it } from "@jest/globals";

import { buildSleepTodayDetailVm } from "@/lib/data/sleep/buildSleepTodayDetailVm";
import type { DayKey } from "@/lib/ui/calendar/types";

const day = "2026-05-26" as DayKey;

describe("buildSleepTodayDetailVm — ouraDisconnected", () => {
  it("returns oura_disconnected reason + CTA when settled missing and ouraDisconnected", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: true },
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.message).toBe("Reconnect Oura to sync your sleep.");
    expect(vm.reason).toBe("oura_disconnected");
    expect(vm.cta?.href).toBe("/(app)/settings/devices/oura");
  });

  it("returns no_data reason and classic copy when connected but missing", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: true },
      ouraDisconnected: false,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.message).toBe("No completed sleep found for this day.");
    expect(vm.reason).toBe("no_data");
    expect(vm.cta).toBeUndefined();
  });

  it("returns partial while loading even when ouraDisconnected", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: true,
      cell: undefined,
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("partial");
  });

  it("returns partial when cell unsettled even when ouraDisconnected", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: { settled: false },
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("partial");
  });

  it("rejects latest_completed_prior_night without oura_disconnected when connected", () => {
    const vm = buildSleepTodayDetailVm({
      day,
      loading: false,
      cell: {
        settled: true,
        view: {
          requestedDay: day,
          anchorDay: "2026-05-25",
          wakeDay: "2026-05-25",
          resolution: "latest_completed_prior_night",
          isFallback: false,
          sleepNight: {
            anchorDay: "2026-05-25",
            wakeDay: "2026-05-25",
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "s1",
            isComplete: true,
            totalSleepMinutes: 420,
          },
        },
      },
      ouraDisconnected: false,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.reason).toBe("no_data");
    expect(vm.cta).toBeUndefined();
  });
});
