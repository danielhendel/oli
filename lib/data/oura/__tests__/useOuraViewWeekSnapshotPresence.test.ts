/**
 * Contract: week-strip rings use GET /users/me/oura-*-view per day.
 * Presence is `truthOutcomeFromApiResult(res).status === "ready"` (200 + DTO), not score fields.
 * Future days (day > local today YYYY-MM-DD): never fetch, never ring.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  mergeOuraWeekPresenceMaps,
  partitionOuraWeekPresenceDayKeys,
  useOuraViewWeekSnapshotPresence,
} from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";

describe("partitionOuraWeekPresenceDayKeys", () => {
  const today = "2026-04-06";

  it("puts only today in daysToFetch when rest of week is future (e.g. Sunday start of week)", () => {
    const week = [
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ];
    const { noSnapshotFutureDays, daysToFetch } = partitionOuraWeekPresenceDayKeys(week, today);
    expect(daysToFetch).toEqual(["2026-04-06"]);
    expect(noSnapshotFutureDays).toEqual({
      "2026-04-07": false,
      "2026-04-08": false,
      "2026-04-09": false,
      "2026-04-10": false,
      "2026-04-11": false,
      "2026-04-12": false,
    });
  });

  it("includes past and today in daysToFetch; marks only strictly future days", () => {
    const todayMidWeek = "2026-04-09";
    const week = [
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ];
    const { noSnapshotFutureDays, daysToFetch } = partitionOuraWeekPresenceDayKeys(week, todayMidWeek);
    expect(daysToFetch).toEqual(["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09"]);
    expect(noSnapshotFutureDays).toEqual({
      "2026-04-10": false,
      "2026-04-11": false,
      "2026-04-12": false,
    });
  });

  it("when every day is past or today, nothing is forced false for future", () => {
    const todayEnd = "2026-04-12";
    const week = [
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ];
    const { noSnapshotFutureDays, daysToFetch } = partitionOuraWeekPresenceDayKeys(week, todayEnd);
    expect(daysToFetch).toEqual(week);
    expect(Object.keys(noSnapshotFutureDays).length).toBe(0);
  });
});

describe("mergeOuraWeekPresenceMaps", () => {
  it("keeps future-day false entries and overlays API results", () => {
    const merged = mergeOuraWeekPresenceMaps(
      { "2026-04-10": false, "2026-04-11": false },
      [
        ["2026-04-08", true],
        ["2026-04-09", false],
      ],
    );
    expect(merged).toEqual({
      "2026-04-08": true,
      "2026-04-09": false,
      "2026-04-10": false,
      "2026-04-11": false,
    });
  });
});

describe("useOuraViewWeekSnapshotPresence (contract)", () => {
  it("treats 200 JSON as snapshot present", () => {
    const o = truthOutcomeFromApiResult({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-04-06",
        resolvedDay: "2026-04-06",
        isFallback: false,
        day: "2026-04-06",
        score: null,
        contributors: {},
      },
    });
    expect(o.status).toBe("ready");
  });

  it("treats 404 as no snapshot for that day", () => {
    const o = truthOutcomeFromApiResult({
      ok: false,
      kind: "http",
      status: 404,
      error: "nf",
      requestId: null,
    });
    expect(o.status).toBe("missing");
  });
});

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: (...args: unknown[]) =>
      (globalThis as { __oliOuraPresenceGetIdToken?: jest.Mock }).__oliOuraPresenceGetIdToken!(...args),
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getOuraSleepView: (day: string, token: string) =>
    (globalThis as { __oliOuraPresenceSleepMock?: jest.Mock }).__oliOuraPresenceSleepMock!(day, token),
  getOuraReadinessView: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: jest.fn(),
}));

import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

describe("useOuraViewWeekSnapshotPresence (hook)", () => {
  const weekStartingSunday = [
    "2026-04-06",
    "2026-04-07",
    "2026-04-08",
    "2026-04-09",
    "2026-04-10",
    "2026-04-11",
    "2026-04-12",
  ];

  beforeEach(() => {
    const gt = globalThis as { __oliOuraPresenceSleepMock?: jest.Mock; __oliOuraPresenceGetIdToken?: jest.Mock };
    gt.__oliOuraPresenceSleepMock = jest.fn();
    gt.__oliOuraPresenceGetIdToken = jest.fn().mockResolvedValue("token");
    (getTodayDayKeyLocal as jest.Mock).mockReset();
  });

  function sleepMock() {
    return (globalThis as { __oliOuraPresenceSleepMock?: jest.Mock }).__oliOuraPresenceSleepMock!;
  }

  function getIdTokenMock() {
    return (globalThis as { __oliOuraPresenceGetIdToken?: jest.Mock }).__oliOuraPresenceGetIdToken!;
  }

  function Capture({
    days,
    stateRef,
  }: {
    days: readonly string[];
    stateRef: { current: ReturnType<typeof useOuraViewWeekSnapshotPresence> | null };
  }) {
    stateRef.current = useOuraViewWeekSnapshotPresence(days, "sleep");
    return null;
  }

  it("does not call Oura API for future days; future days are never marked hasSnapshot", async () => {
    (getTodayDayKeyLocal as jest.Mock).mockReturnValue("2026-04-06");
    sleepMock().mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-04-06",
        resolvedDay: "2026-04-06",
        isFallback: false,
        day: "2026-04-06",
        score: 80,
        contributors: {},
      },
    });

    const stateRef: { current: ReturnType<typeof useOuraViewWeekSnapshotPresence> | null } = {
      current: null,
    };
    await act(async () => {
      renderer.create(React.createElement(Capture, { days: weekStartingSunday, stateRef }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const last = stateRef.current;
    expect(sleepMock()).toHaveBeenCalledTimes(1);
    expect(sleepMock()).toHaveBeenCalledWith("2026-04-06", "token");
    expect(last?.status).toBe("ready");
    if (last?.status === "ready") {
      expect(last.hasSnapshotByDay["2026-04-06"]).toBe(true);
      expect(last.hasSnapshotByDay["2026-04-07"]).toBe(false);
      expect(last.hasSnapshotByDay["2026-04-12"]).toBe(false);
    }
  });

  it("today with no data (404) → no ring for today; future days still false", async () => {
    (getTodayDayKeyLocal as jest.Mock).mockReturnValue("2026-04-06");
    sleepMock().mockResolvedValue({
      ok: false,
      kind: "http",
      status: 404,
      error: "nf",
      requestId: null,
    });

    const stateRef: { current: ReturnType<typeof useOuraViewWeekSnapshotPresence> | null } = {
      current: null,
    };
    await act(async () => {
      renderer.create(React.createElement(Capture, { days: weekStartingSunday, stateRef }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const last = stateRef.current;
    expect(last?.status).toBe("ready");
    if (last?.status === "ready") {
      expect(last.hasSnapshotByDay["2026-04-06"]).toBe(false);
      expect(last.hasSnapshotByDay["2026-04-07"]).toBe(false);
    }
  });

  it("past days with data → ring; past days without → no ring", async () => {
    (getTodayDayKeyLocal as jest.Mock).mockReturnValue("2026-04-12");
    sleepMock().mockImplementation(async (day: string) => {
      if (day === "2026-04-08") {
        return {
          ok: true,
          status: 200,
          requestId: null,
          json: {
            requestedDay: day,
            resolvedDay: day,
            isFallback: false,
            day,
            score: 70,
            contributors: {},
          },
        };
      }
      return { ok: false, kind: "http" as const, status: 404, error: "nf", requestId: null };
    });

    const stateRef: { current: ReturnType<typeof useOuraViewWeekSnapshotPresence> | null } = {
      current: null,
    };
    await act(async () => {
      renderer.create(React.createElement(Capture, { days: weekStartingSunday, stateRef }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const last = stateRef.current;
    expect(sleepMock()).toHaveBeenCalledTimes(7);
    expect(last?.status).toBe("ready");
    if (last?.status === "ready") {
      expect(last.hasSnapshotByDay["2026-04-08"]).toBe(true);
      expect(last.hasSnapshotByDay["2026-04-09"]).toBe(false);
    }
  });

  it("when all strip days are future, performs zero API calls and all days false", async () => {
    (getTodayDayKeyLocal as jest.Mock).mockReturnValue("2026-04-05");
    const onlyFutureWeek = [
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ];

    const stateRef: { current: ReturnType<typeof useOuraViewWeekSnapshotPresence> | null } = {
      current: null,
    };
    await act(async () => {
      renderer.create(React.createElement(Capture, { days: onlyFutureWeek, stateRef }));
      await Promise.resolve();
    });

    const last = stateRef.current;
    expect(sleepMock()).not.toHaveBeenCalled();
    expect(getIdTokenMock()).not.toHaveBeenCalled();
    expect(last?.status).toBe("ready");
    if (last?.status === "ready") {
      for (const d of onlyFutureWeek) {
        expect(last.hasSnapshotByDay[d]).toBe(false);
      }
    }
  });
});
