import type { SleepNightViewDto } from "@oli/contracts";

import {
  attributedSleepNightViewForCalendarDay,
  buildDailySleepCardViewModel,
  sleepNightIsAttributedToCalendarDay,
} from "../dailySleepCardViewModel";

const day = "2026-05-17";

function view(over: Partial<SleepNightViewDto>): SleepNightViewDto {
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
      updatedAt: "2026-05-17T12:00:00.000Z",
    },
    ...over,
  };
}

describe("sleepNightIsAttributedToCalendarDay", () => {
  it("accepts exact_anchor on the requested day", () => {
    expect(sleepNightIsAttributedToCalendarDay(day, view({}))).toBe(true);
  });

  it("accepts wake_day when wakeDay matches requested calendar day", () => {
    expect(
      sleepNightIsAttributedToCalendarDay(
        day,
        view({
          anchorDay: "2026-05-16",
          wakeDay: day,
          resolution: "wake_day",
          sleepNight: {
            anchorDay: "2026-05-16",
            wakeDay: day,
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "s1",
            isComplete: true,
            totalSleepMinutes: 445,
            updatedAt: "2026-05-17T08:00:00.000Z",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects latest_completed_prior_night (bounded fallback)", () => {
    expect(
      sleepNightIsAttributedToCalendarDay(
        day,
        view({
          anchorDay: "2026-05-16",
          wakeDay: "2026-05-16",
          resolution: "latest_completed_prior_night",
          sleepNight: {
            anchorDay: "2026-05-16",
            wakeDay: "2026-05-16",
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "s1",
            isComplete: true,
            totalSleepMinutes: 445,
            updatedAt: "2026-05-16T12:00:00.000Z",
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects when API requestedDay differs from hook day", () => {
    expect(
      sleepNightIsAttributedToCalendarDay(day, view({ requestedDay: "2026-05-16" })),
    ).toBe(false);
  });
});

describe("attributedSleepNightViewForCalendarDay", () => {
  it("returns view when settled and attributed", () => {
    const v = view({ sleepNight: { ...view({}).sleepNight, score: 84 } });
    expect(
      attributedSleepNightViewForCalendarDay(day, { view: v, settled: true }),
    ).toBe(v);
  });

  it("returns null when unsettled", () => {
    expect(
      attributedSleepNightViewForCalendarDay(day, { view: view({}), settled: false }),
    ).toBeNull();
  });

  it("returns null for bounded prior-night fallback", () => {
    expect(
      attributedSleepNightViewForCalendarDay(day, {
        view: view({
          anchorDay: "2026-05-16",
          wakeDay: "2026-05-16",
          resolution: "latest_completed_prior_night",
          sleepNight: {
            anchorDay: "2026-05-16",
            wakeDay: "2026-05-16",
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "s1",
            isComplete: true,
            totalSleepMinutes: 445,
            updatedAt: "2026-05-16T12:00:00.000Z",
            score: 84,
          },
        }),
        settled: true,
      }),
    ).toBeNull();
  });
});

describe("buildDailySleepCardViewModel", () => {
  it("returns partial while sleep night is unsettled", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: { view: undefined, loading: true, settled: false, error: null },
    });
    expect(vm).toEqual({ status: "partial", day });
  });

  it("returns missing when settled without attributed sleep (404 / blocked fallback)", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: { view: undefined, loading: false, settled: true, error: null },
    });
    expect(vm.status).toBe("missing");
    if (vm.status === "missing") {
      expect(vm.message).toContain("No sleep data logged");
    }
  });

  it("returns missing instead of ready for latest_completed_prior_night", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
        view: view({
          anchorDay: "2026-05-16",
          wakeDay: "2026-05-16",
          resolution: "latest_completed_prior_night",
          sleepNight: {
            anchorDay: "2026-05-16",
            wakeDay: "2026-05-16",
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "s1",
            isComplete: true,
            totalSleepMinutes: 445,
            mainSleepMinutes: 445,
            updatedAt: "2026-05-16T12:00:00.000Z",
          },
        }),
        loading: false,
        settled: true,
        error: null,
      },
    });
    expect(vm.status).toBe("missing");
  });

  it("returns ready with headline when sleep is attributed to the calendar day", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
        view: view({}),
        loading: false,
        settled: true,
        error: null,
      },
    });
    expect(vm.status).toBe("ready");
    if (vm.status === "ready") {
      expect(vm.model.day).toBe(day);
      expect(vm.model.headlineValueText).toBe("7h 25m");
    }
  });

  it("returns partial (not prior ready metrics) while refetching blocked fallback", () => {
    const vm = buildDailySleepCardViewModel({
      day,
      sleepNight: {
        view: view({
          anchorDay: "2026-05-16",
          wakeDay: "2026-05-16",
          resolution: "latest_completed_prior_night",
        }),
        loading: true,
        settled: true,
        error: null,
      },
    });
    expect(vm).toEqual({ status: "partial", day });
  });
});
