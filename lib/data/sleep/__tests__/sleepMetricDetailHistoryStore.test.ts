import { afterEach, describe, expect, it, jest } from "@jest/globals";

import type { SleepNightViewDto } from "@oli/contracts";

import {
  ensureSleepMetricDetailHistory,
  peekSleepMetricDetailHistory,
  resetSleepMetricDetailHistoryCacheForTests,
} from "@/lib/data/sleep/sleepMetricDetailHistoryStore";
import type { DayKey } from "@/lib/ui/calendar/types";

const mockGetSleepNightsRange = jest.fn();

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNightsRange: (...args: unknown[]) => mockGetSleepNightsRange(...args),
}));

const start = "2026-02-18" as DayKey;
const end = "2026-05-18" as DayKey;
const dayKeys = [end];

function nightView(day: DayKey): SleepNightViewDto {
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
      deepMinutes: 50,
      remMinutes: 120,
      isComplete: true,
    },
  };
}

describe("sleepMetricDetailHistoryStore", () => {
  afterEach(() => {
    resetSleepMetricDetailHistoryCacheForTests();
    mockGetSleepNightsRange.mockReset();
  });

  it("fetches once and reuses the cached response for the same user/range", async () => {
    mockGetSleepNightsRange.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: { nights: [nightView(end)], start, end, dayCount: 1, resolvedCount: 1 },
    });
    const getIdToken = async () => "token";

    const first = await ensureSleepMetricDetailHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken,
    });
    expect(first.historyStatus).toBe("ready");
    expect(mockGetSleepNightsRange).toHaveBeenCalledTimes(1);

    const second = await ensureSleepMetricDetailHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken,
    });
    expect(second.historyStatus).toBe("ready");
    expect(mockGetSleepNightsRange).toHaveBeenCalledTimes(1);
    expect(peekSleepMetricDetailHistory("user-a", start, end)?.sleepNightByDay[end]?.view).toBeDefined();
  });

  it("does not leak cache across users", async () => {
    mockGetSleepNightsRange.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: { nights: [nightView(end)], start, end, dayCount: 1, resolvedCount: 1 },
    });
    await ensureSleepMetricDetailHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    expect(peekSleepMetricDetailHistory("user-b", start, end)).toBeNull();
  });

  it("shares a single in-flight request across parallel callers", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    mockGetSleepNightsRange.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = ensureSleepMetricDetailHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    const p2 = ensureSleepMetricDetailHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    // Allow getIdToken + fetch kickoff microtasks to run.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetSleepNightsRange).toHaveBeenCalledTimes(1);
    resolveFetch({
      ok: true,
      status: 200,
      requestId: "r",
      json: { nights: [nightView(end)], start, end, dayCount: 1, resolvedCount: 1 },
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a.historyStatus).toBe("ready");
    expect(b.historyStatus).toBe("ready");
    expect(mockGetSleepNightsRange).toHaveBeenCalledTimes(1);
  });
});
