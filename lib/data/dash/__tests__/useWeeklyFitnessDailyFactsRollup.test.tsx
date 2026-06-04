/**
 * Tests for `useWeeklyFitnessDailyFactsRollup` — the lightweight `dailyFacts`-only
 * data source backing the Dash Weekly Fitness card after the timeout audit fix.
 *
 * Invariants under test:
 * - Per-day cells aggregate strength.workoutsCount, cardio.distanceMeters, cardio.sessions.
 * - 404 days resolve as `status: "missing"` and do NOT cause hook-level `status: "error"`.
 * - Real network/contract errors resolve as `status: "error"` and surface the message.
 * - Only the requested week day keys are fetched (one `getDailyFacts` per day).
 * - Empty `dayKeys` array yields `status: "ready"` with no API calls.
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getDailyFacts } from "@/lib/api/usersMe";
import {
  __testing_resetDailyFactsInvalidationListeners,
  __testing_resetDailyFactsSessionCache,
  getDailyFactsSessionCached,
} from "@/lib/data/dailyFactsSessionCache";
import {
  useWeeklyFitnessDailyFactsRollup,
  type WeeklyFitnessDailyFactsRollupState,
} from "@/lib/data/dash/useWeeklyFitnessDailyFactsRollup";
import type { DayKey } from "@/lib/ui/calendar/types";

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

const mockGetDailyFacts = getDailyFacts as jest.MockedFunction<typeof getDailyFacts>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

type DailyFactsBuilder = {
  day: string;
  strengthWorkoutsCount?: number;
  cardioDistanceMeters?: number;
  cardioSessions?: number;
};

function dailyFactsOk(b: DailyFactsBuilder) {
  const strengthBlock =
    b.strengthWorkoutsCount === undefined
      ? undefined
      : { workoutsCount: b.strengthWorkoutsCount, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} };
  const cardioBlock =
    b.cardioDistanceMeters === undefined && b.cardioSessions === undefined
      ? undefined
      : {
          durationMinutes: 0,
          sessions: b.cardioSessions ?? 0,
          ...(b.cardioDistanceMeters !== undefined ? { distanceMeters: b.cardioDistanceMeters } : {}),
        };
  return {
    ok: true as const,
    status: 200,
    requestId: `req-${b.day}`,
    json: {
      userId: "test-uid",
      date: b.day,
      ...(strengthBlock ? { strength: strengthBlock } : {}),
      ...(cardioBlock ? { cardio: cardioBlock } : {}),
    },
  };
}

function dailyFacts404(day: string) {
  return {
    ok: false as const,
    status: 404,
    kind: "http" as const,
    error: "Not found",
    requestId: `req-${day}`,
  };
}

function dailyFactsTimeout(day: string) {
  return {
    ok: false as const,
    status: 0,
    kind: "network" as const,
    error: "Request timed out",
    requestId: `req-${day}`,
  };
}

const WEEK: readonly DayKey[] = [
  "2026-05-03" as DayKey,
  "2026-05-04" as DayKey,
  "2026-05-05" as DayKey,
  "2026-05-06" as DayKey,
  "2026-05-07" as DayKey,
  "2026-05-08" as DayKey,
  "2026-05-09" as DayKey,
];

type HookState = WeeklyFitnessDailyFactsRollupState;

function Harness(props: { keys: readonly DayKey[]; onState: (s: HookState) => void }) {
  const state = useWeeklyFitnessDailyFactsRollup(props.keys);
  const stableRef = useRef(props.onState);
  stableRef.current = props.onState;
  useEffect(() => {
    stableRef.current(state);
  }, [state]);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  __testing_resetDailyFactsInvalidationListeners();
  __testing_resetDailyFactsSessionCache();
  mockUseAuth.mockReturnValue({
    user: { uid: "test-uid" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("id-token"),
  } as unknown as ReturnType<typeof useAuth>);
});

async function flush() {
  // Two ticks: one for the awaited fetchAll, one for the setState wave-end commit.
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useWeeklyFitnessDailyFactsRollup", () => {
  it("sums strength.workoutsCount and cardio.distanceMeters per requested day", async () => {
    mockGetDailyFacts.mockImplementation(async (day: string) => {
      const map: Record<string, ReturnType<typeof dailyFactsOk>> = {
        "2026-05-03": dailyFactsOk({ day, strengthWorkoutsCount: 1 }),
        "2026-05-04": dailyFactsOk({ day, cardioDistanceMeters: 2_500, cardioSessions: 1 }),
        "2026-05-05": dailyFactsOk({ day, strengthWorkoutsCount: 1 }),
        "2026-05-06": dailyFactsOk({ day }),
        "2026-05-07": dailyFactsOk({
          day,
          strengthWorkoutsCount: 1,
          cardioDistanceMeters: 1_000,
          cardioSessions: 1,
        }),
      };
      return (map[day] ?? dailyFacts404(day)) as never;
    });

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness keys={WEEK} onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(mockGetDailyFacts).toHaveBeenCalledTimes(7);
    const requestedDays = mockGetDailyFacts.mock.calls.map((c) => c[0]);
    expect(requestedDays.sort()).toEqual([...WEEK].sort());

    expect(latest).not.toBeNull();
    expect(latest!.status).toBe("ready");
    expect(latest!.error).toBeNull();

    const totalStrength = WEEK.reduce(
      (acc, d) => acc + (latest!.byDay[d]?.strengthWorkoutsCount ?? 0),
      0,
    );
    const totalMeters = WEEK.reduce(
      (acc, d) => acc + (latest!.byDay[d]?.cardioDistanceMeters ?? 0),
      0,
    );
    expect(totalStrength).toBe(3);
    expect(totalMeters).toBe(3_500);
  });

  it("treats 404 days as missing (zero, not an error)", async () => {
    mockGetDailyFacts.mockImplementation(async (day: string) => {
      if (day === "2026-05-07") {
        return dailyFactsOk({ day, strengthWorkoutsCount: 2, cardioDistanceMeters: 4_000 }) as never;
      }
      return dailyFacts404(day) as never;
    });

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness keys={WEEK} onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(latest!.status).toBe("ready");
    expect(latest!.error).toBeNull();

    const missingDays = WEEK.filter((d) => latest!.byDay[d]?.status === "missing");
    expect(missingDays.length).toBe(6);

    expect(latest!.byDay["2026-05-07" as DayKey]?.status).toBe("ready");
    expect(latest!.byDay["2026-05-07" as DayKey]?.strengthWorkoutsCount).toBe(2);
    expect(latest!.byDay["2026-05-07" as DayKey]?.cardioDistanceMeters).toBe(4_000);
  });

  it("surfaces a hook-level error when any day produces a real network failure (not 404)", async () => {
    mockGetDailyFacts.mockImplementation(async (day: string) => {
      if (day === "2026-05-05") return dailyFactsTimeout(day) as never;
      return dailyFactsOk({ day, strengthWorkoutsCount: 1 }) as never;
    });

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness keys={WEEK} onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(latest!.status).toBe("error");
    expect(latest!.error).toBe("Request timed out");
    expect(latest!.byDay["2026-05-05" as DayKey]?.status).toBe("error");
    // Other days still settled and contribute their numbers.
    expect(latest!.byDay["2026-05-03" as DayKey]?.strengthWorkoutsCount).toBe(1);
  });

  it("returns ready with no API calls when dayKeys is empty", async () => {
    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness keys={[]} onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(mockGetDailyFacts).not.toHaveBeenCalled();
    expect(latest!.status).toBe("ready");
    expect(latest!.error).toBeNull();
  });

  it("replaces stale session-cached strength counts with fresh API values on mount", async () => {
    const auditWeek: readonly DayKey[] = [
      "2026-05-31" as DayKey,
      "2026-06-01" as DayKey,
      "2026-06-02" as DayKey,
      "2026-06-03" as DayKey,
      "2026-06-04" as DayKey,
      "2026-06-05" as DayKey,
      "2026-06-06" as DayKey,
    ];
    const staleStrength: Record<string, number> = {
      "2026-05-31": 2,
      "2026-06-01": 2,
      "2026-06-02": 2,
      "2026-06-03": 0,
      "2026-06-04": 2,
      "2026-06-05": 0,
      "2026-06-06": 0,
    };
    const freshStrength: Record<string, number> = {
      "2026-05-31": 1,
      "2026-06-01": 1,
      "2026-06-02": 1,
      "2026-06-03": 0,
      "2026-06-04": 1,
      "2026-06-05": 0,
      "2026-06-06": 0,
    };

    mockGetDailyFacts.mockImplementation(async (day: string, _token: string, opts?: { cacheBust?: string }) => {
      const count = opts?.cacheBust ? (freshStrength[day] ?? 0) : (staleStrength[day] ?? 0);
      if (!opts?.cacheBust && count === 0 && (day === "2026-06-05" || day === "2026-06-06")) {
        return dailyFacts404(day) as never;
      }
      if (opts?.cacheBust && count === 0 && (day === "2026-06-05" || day === "2026-06-06")) {
        return dailyFacts404(day) as never;
      }
      return dailyFactsOk({ day, strengthWorkoutsCount: count }) as never;
    });

    // Prime session cache the way Activity rollup does (no cacheBust) — stale 2/day.
    for (const day of ["2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"] as const) {
      await getDailyFactsSessionCached({ userUid: "test-uid", day, token: "id-token" });
    }
    mockGetDailyFacts.mockClear();

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness keys={auditWeek} onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(mockGetDailyFacts).toHaveBeenCalledTimes(7);
    for (const call of mockGetDailyFacts.mock.calls) {
      expect(call[2]?.cacheBust).toEqual(expect.stringContaining(":"));
    }

    const requestedDays = mockGetDailyFacts.mock.calls.map((c) => c[0]).sort();
    expect(requestedDays).toEqual([...auditWeek].sort());

    const strengthByDay = Object.fromEntries(
      auditWeek.map((d) => [d, latest!.byDay[d]?.strengthWorkoutsCount ?? 0]),
    );
    expect(strengthByDay).toEqual({
      "2026-05-31": 1,
      "2026-06-01": 1,
      "2026-06-02": 1,
      "2026-06-03": 0,
      "2026-06-04": 1,
      "2026-06-05": 0,
      "2026-06-06": 0,
    });
    expect(Object.values(strengthByDay).reduce((a, n) => a + n, 0)).toBe(4);
  });

  it("only fetches the requested week day keys (no extra days)", async () => {
    mockGetDailyFacts.mockResolvedValue(dailyFactsOk({ day: "2026-05-07" }) as never);
    const onlyThreeDays = WEEK.slice(0, 3);

    await act(async () => {
      renderer.create(<Harness keys={onlyThreeDays} onState={() => undefined} />);
    });
    await flush();

    expect(mockGetDailyFacts).toHaveBeenCalledTimes(onlyThreeDays.length);
    const calledDays = mockGetDailyFacts.mock.calls.map((c) => c[0]).sort();
    expect(calledDays).toEqual([...onlyThreeDays].sort());
  });
});
