import { afterEach, describe, expect, it, jest } from "@jest/globals";

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import {
  ensureReadinessContributorHistory,
  peekReadinessContributorHistory,
  resetReadinessContributorHistoryCacheForTests,
} from "@/lib/data/readiness/readinessContributorHistoryStore";
import type { DayKey } from "@/lib/ui/calendar/types";

const mockGetOuraReadinessRange = jest.fn();

jest.mock("@/lib/api/ouraReadinessRange", () => ({
  getOuraReadinessRange: (...args: unknown[]) => mockGetOuraReadinessRange(...args),
}));

const start = "2026-02-18" as DayKey;
const end = "2026-05-18" as DayKey;
const dayKeys = [end];

function rangeDay(day: DayKey, over: Partial<OuraReadinessRangeDayDto> = {}): OuraReadinessRangeDayDto {
  return {
    day,
    score: 80,
    source: "oura",
    contributors: {
      hrv_balance: 70,
      body_temperature: 80,
      recovery_index: 75,
      sleep_balance: 65,
    },
    ...over,
  };
}

describe("readinessContributorHistoryStore", () => {
  afterEach(() => {
    resetReadinessContributorHistoryCacheForTests();
    mockGetOuraReadinessRange.mockReset();
  });

  it("fetches once for all four contributors and reuses warm cache", async () => {
    mockGetOuraReadinessRange.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        start,
        end,
        dayCount: 90,
        resolvedCount: 1,
        days: [rangeDay(end)],
      },
    });
    const getIdToken = async () => "token";

    const first = await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken,
    });
    expect(first.historyStatus).toBe("ready");
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(1);
    expect(first.dayByDay[end]?.day?.contributors).toEqual({
      hrv_balance: 70,
      body_temperature: 80,
      recovery_index: 75,
      sleep_balance: 65,
    });

    const second = await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken,
    });
    expect(second.historyStatus).toBe("ready");
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(1);
  });

  it("does not leak cache across users", async () => {
    mockGetOuraReadinessRange.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r",
      json: { start, end, dayCount: 90, resolvedCount: 1, days: [rangeDay(end)] },
    });
    await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    expect(peekReadinessContributorHistory("user-b", start, end)).toBeNull();
  });

  it("shares a single in-flight request across parallel callers", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    mockGetOuraReadinessRange.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    const p2 = ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(1);
    resolveFetch({
      ok: true,
      status: 200,
      requestId: "r",
      json: { start, end, dayCount: 90, resolvedCount: 1, days: [rangeDay(end)] },
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a.historyStatus).toBe("ready");
    expect(b.historyStatus).toBe("ready");
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(1);
  });

  it("cacheBust forces a refetch and preserves prior ready data on failure", async () => {
    mockGetOuraReadinessRange.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { start, end, dayCount: 90, resolvedCount: 1, days: [rangeDay(end)] },
    });
    await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(1);

    mockGetOuraReadinessRange.mockResolvedValueOnce({
      ok: false,
      status: 0,
      kind: "network",
      error: "offline",
      requestId: null,
    });
    const failed = await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
      cacheBust: "retry-1",
    });
    expect(failed.historyStatus).toBe("error");
    expect(failed.dayByDay[end]?.day?.contributors?.hrv_balance).toBe(70);
    expect(mockGetOuraReadinessRange).toHaveBeenCalledTimes(2);
  });

  it("rejects stale responses when a newer generation is in flight", async () => {
    let resolveSlow: (value: unknown) => void = () => undefined;
    mockGetOuraReadinessRange.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSlow = resolve;
        }),
    );

    const slow = ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
      cacheBust: "gen-1",
    });
    await Promise.resolve();
    await Promise.resolve();

    mockGetOuraReadinessRange.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: "fast",
      json: {
        start,
        end,
        dayCount: 90,
        resolvedCount: 1,
        days: [rangeDay(end, { contributors: { hrv_balance: 99 } })],
      },
    });
    const fast = await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
      cacheBust: "gen-2",
    });
    expect(fast.historyStatus).toBe("ready");
    expect(fast.dayByDay[end]?.day?.contributors?.hrv_balance).toBe(99);

    resolveSlow({
      ok: true,
      status: 200,
      requestId: "slow",
      json: {
        start,
        end,
        dayCount: 90,
        resolvedCount: 1,
        days: [rangeDay(end, { contributors: { hrv_balance: 11 } })],
      },
    });
    await slow;
    expect(peekReadinessContributorHistory("user-a", start, end)?.dayByDay[end]?.day?.contributors?.hrv_balance).toBe(
      99,
    );
  });

  it("does not fabricate data when the first request fails", async () => {
    mockGetOuraReadinessRange.mockResolvedValue({
      ok: false,
      status: 500,
      kind: "http",
      error: "boom",
      requestId: "e",
    });
    const snap = await ensureReadinessContributorHistory({
      uid: "user-a",
      rangeStart: start,
      rangeEnd: end,
      dayKeys,
      getIdToken: async () => "token",
    });
    expect(snap.historyStatus).toBe("error");
    expect(snap.dayByDay).toEqual({});
  });
});
