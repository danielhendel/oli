import type { SleepNightViewDto } from "@oli/contracts";

import { buildDailySleepCardViewModel } from "../dailySleepCardViewModel";

const day = "2026-05-26";

function attributedView(): SleepNightViewDto {
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
      sourceDocumentId: "s1",
      isComplete: true,
      totalSleepMinutes: 445,
      mainSleepMinutes: 445,
      updatedAt: `${day}T12:00:00.000Z`,
    },
  };
}

describe("buildDailySleepCardViewModel — ouraDisconnected", () => {
  it("returns oura_disconnected reason + CTA when settled missing and ouraDisconnected", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: { view: undefined, loading: false, settled: true, error: null },
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.message).toBe("Reconnect Oura to sync your sleep.");
    expect(vm.reason).toBe("oura_disconnected");
    expect(vm.cta).toEqual({
      label: "Reconnect Oura \u2192",
      href: "/(app)/settings/devices/oura",
    });
  });

  it("returns no_data reason and classic copy when connected but missing", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: { view: undefined, loading: false, settled: true, error: null },
      ouraDisconnected: false,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.message).toContain("No sleep data logged");
    expect(vm.reason).toBe("no_data");
    expect(vm.cta).toBeUndefined();
  });

  it("returns partial while unsettled even when ouraDisconnected", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: { view: undefined, loading: true, settled: false, error: null },
      ouraDisconnected: true,
    });
    expect(vm).toEqual({ status: "partial", day });
  });

  it("returns ready when sleep is attributed even if ouraDisconnected", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
        view: attributedView(),
        loading: false,
        settled: true,
        error: null,
      },
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("ready");
  });

  it("returns missing without oura_disconnected for latest_completed_prior_night when connected", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
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
            updatedAt: "2026-05-25T12:00:00.000Z",
          },
        },
        loading: false,
        settled: true,
        error: null,
      },
      ouraDisconnected: false,
    });
    expect(vm.status).toBe("missing");
    if (vm.status !== "missing") return;
    expect(vm.reason).toBe("no_data");
    expect(vm.cta).toBeUndefined();
  });

  it("returns error state without reconnect fields when sleepNight has error", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
        view: undefined,
        loading: false,
        settled: true,
        error: "Network error",
      },
      ouraDisconnected: true,
    });
    expect(vm.status).toBe("error");
    if (vm.status === "error") {
      expect(vm.message).toBe("Network error");
    }
  });
});
