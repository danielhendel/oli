import type { DailyFactsDto, SleepViewDto } from "@oli/contracts";

import { resolveDashSleepAnchorDay, type ResolveDashSleepAnchorDayInput } from "../resolveDashSleepAnchorDay";

const cal = "2026-05-12";
const prev = "2026-05-11";

function base(overrides: Partial<ResolveDashSleepAnchorDayInput> = {}): ResolveDashSleepAnchorDayInput {
  return {
    calendarToday: cal,
    previousDay: prev,
    calendarFactsStatus: "ready",
    calendarSleep: undefined,
    previousFactsStatus: "ready",
    previousSleep: undefined,
    probeLoading: false,
    probeView: undefined,
    ...overrides,
  };
}

function overnightProbe(score = 96, isFallback = false): SleepViewDto {
  return {
    requestedDay: cal,
    resolvedDay: prev,
    isFallback,
    day: prev,
    score,
    contributors: {},
  };
}

describe("resolveDashSleepAnchorDay", () => {
  it("returns loading when probe still loading", () => {
    const r = resolveDashSleepAnchorDay(
      base({
        calendarFactsStatus: "ready",
        previousFactsStatus: "ready",
        probeLoading: true,
      }),
    );
    expect(r.sleepAnchorSettled).toBe(false);
    expect(r.selectedReason).toBe("loading");
    expect(r.sleepAnchorDay).toBe(cal);
  });

  it("overnight probe wins before calendar facts settle", () => {
    const r = resolveDashSleepAnchorDay(
      base({
        calendarFactsStatus: "partial",
        previousFactsStatus: "partial",
        probeView: overnightProbe(),
      }),
    );
    expect(r.sleepAnchorDay).toBe(prev);
    expect(r.sleepAnchorSettled).toBe(true);
    expect(r.selectedReason).toBe("overnight_probe_previous_day");
  });

  it("calendar DailyFacts sleep + probe resolves to previousDay -> previousDay wins", () => {
    const calSleep: DailyFactsDto["sleep"] = { mainSleepMinutes: 300, totalMinutes: 320 };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: calSleep,
        probeView: overnightProbe(96, true),
      }),
    );
    expect(r.sleepAnchorDay).toBe(prev);
    expect(r.selectedReason).toBe("overnight_probe_previous_day");
    expect(r.calendarDayHasSleep).toBe(true);
    expect(r.previousDayHasSleep).toBe(true);
  });

  it("calendar DailyFacts sleep + probe aligned to calendarDay -> calendarDay wins", () => {
    const calSleep: DailyFactsDto["sleep"] = { mainSleepMinutes: 300, totalMinutes: 320 };
    const aligned: SleepViewDto = {
      requestedDay: cal,
      resolvedDay: cal,
      isFallback: false,
      day: cal,
      score: 88,
      contributors: {},
    };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: calSleep,
        probeView: aligned,
      }),
    );
    expect(r.sleepAnchorDay).toBe(cal);
    expect(r.selectedReason).toBe("calendar_exact_sleep");
  });

  it("does not anchor on calendar facts sleep until probe has settled (may become overnight)", () => {
    const calSleep: DailyFactsDto["sleep"] = { mainSleepMinutes: 200, totalMinutes: 210 };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: calSleep,
        probeLoading: true,
        probeView: undefined,
      }),
    );
    expect(r.selectedReason).toBe("loading");
    expect(r.sleepAnchorSettled).toBe(false);
  });

  it("no probe + calendar facts sleep -> calendarDay", () => {
    const calSleep: DailyFactsDto["sleep"] = { mainSleepMinutes: 200, totalMinutes: 210 };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: calSleep,
        probeView: undefined,
      }),
    );
    expect(r.sleepAnchorDay).toBe(cal);
    expect(r.selectedReason).toBe("calendar_exact_sleep");
  });

  it("calendar has no sleep, previous has DailyFacts sleep signal -> previousDay", () => {
    const prevSleep: DailyFactsDto["sleep"] = { mainSleepMinutes: 420, totalMinutes: 450 };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: undefined,
        previousSleep: prevSleep,
        probeView: undefined,
      }),
    );
    expect(r.sleepAnchorDay).toBe(prev);
    expect(r.sleepAnchorSettled).toBe(true);
    expect(r.selectedReason).toBe("previous_exact_sleep");
    expect(r.previousDayHasSleep).toBe(true);
    expect(r.calendarDayHasSleep).toBe(false);
  });

  it("calendar has only zeroed sleep minutes -> does not count as sleep", () => {
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: { mainSleepMinutes: 0, totalMinutes: 0 },
        previousSleep: undefined,
        probeView: undefined,
      }),
    );
    expect(r.calendarDayHasSleep).toBe(false);
    expect(r.sleepAnchorDay).toBe(cal);
    expect(r.selectedReason).toBe("calendar_empty");
  });

  it("Oura probe requested calendar but resolved previous -> overnight_probe_previous_day", () => {
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: undefined,
        previousSleep: undefined,
        probeView: overnightProbe(96, false),
      }),
    );
    expect(r.sleepAnchorDay).toBe(prev);
    expect(r.sleepAnchorSettled).toBe(true);
    expect(r.selectedReason).toBe("overnight_probe_previous_day");
  });

  it("misaligned probe to unrelated day is ignored for overnight (calendar_empty when nothing else)", () => {
    const weird: SleepViewDto = {
      requestedDay: cal,
      resolvedDay: "2026-05-09",
      isFallback: true,
      day: "2026-05-09",
      score: 50,
      contributors: {},
    };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: undefined,
        previousSleep: undefined,
        probeView: weird,
      }),
    );
    expect(r.sleepAnchorDay).toBe(cal);
    expect(r.selectedReason).toBe("calendar_empty");
  });

  it("aligned Oura on calendar with no overnight -> calendarDay without calendar facts sleep", () => {
    const aligned: SleepViewDto = {
      requestedDay: cal,
      resolvedDay: cal,
      isFallback: false,
      day: cal,
      score: 88,
      contributors: {},
    };
    const r = resolveDashSleepAnchorDay(
      base({
        calendarSleep: undefined,
        previousSleep: undefined,
        probeView: aligned,
      }),
    );
    expect(r.sleepAnchorDay).toBe(cal);
    expect(r.selectedReason).toBe("calendar_exact_sleep");
    expect(r.calendarDayHasSleep).toBe(true);
  });

  it("fallback overnight-shaped probe with previous facts still anchors previous via probe", () => {
    const r = resolveDashSleepAnchorDay(
      base({
        previousSleep: { mainSleepMinutes: 400, totalMinutes: 400 },
        probeView: overnightProbe(90, true),
      }),
    );
    expect(r.sleepAnchorDay).toBe(prev);
    expect(r.selectedReason).toBe("overnight_probe_previous_day");
  });
});
