/**
 * Regression guard for the "Dashboard Weekly Fitness Timeout" audit fix.
 *
 * Asserts that `useWeeklyFitnessCard` never invokes the workouts calendar
 * range hydrate (`useWorkoutsCalendarRange`) and never fetches raw events
 * (`getRawEvents`). The card must rely exclusively on lightweight
 * `getDailyFacts` reads via `useWeeklyFitnessDailyFactsRollup`.
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getDailyFacts, getRawEvents } from "@/lib/api/usersMe";
import {
  __testing_resetDailyFactsInvalidationListeners,
  __testing_resetDailyFactsSessionCache,
} from "@/lib/data/dailyFactsSessionCache";
import { useWeeklyFitnessCard, type UseWeeklyFitnessCardResult } from "@/lib/data/dash/useWeeklyFitnessCard";

const mockUseWorkoutsCalendarRange = jest.fn();
const mockUseActivityStepsRollupForKeys = jest.fn(() => ({
  status: "ready" as const,
  rollupByDay: {},
  rollupFallbackBase: {},
  rollupDisplayByDay: {},
  isRefreshing: false,
  refetch: jest.fn(),
}));
const mockUseActivityHealthKitTodayStepsCard = jest.fn(() => ({
  hkToday: { status: "idle" as const },
  refreshHealthKitToday: jest.fn(),
}));
const mockUseWeeklyFitnessSleepRollupMap = jest.fn(() => ({
  status: "ready" as const,
  sleepNightByDay: {},
  isRefreshing: false,
  refetch: jest.fn(),
}));
const mockUsePreferences = jest.fn(() => ({
  state: {
    preferences: {
      weeklyFitnessGoals: {
        activityStepsPerDayGoal: 10_000,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 10,
        sleepHoursPerNightGoal: 8,
      },
    },
  },
}));

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: jest.fn(),
  getRawEvents: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: (...args: unknown[]) => mockUseWorkoutsCalendarRange(...args),
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS: ["workout", "strength_workout"],
}));

jest.mock("@/lib/data/activity/useActivityStepsRollupMap", () => ({
  useActivityStepsRollupForKeys: (...args: unknown[]) => mockUseActivityStepsRollupForKeys(...args),
}));

jest.mock("@/lib/data/activity/useActivityHealthKitTodayStepsCard", () => ({
  useActivityHealthKitTodayStepsCard: (...args: unknown[]) =>
    mockUseActivityHealthKitTodayStepsCard(...args),
}));

jest.mock("@/lib/data/dash/useWeeklyFitnessSleepRollupMap", () => ({
  useWeeklyFitnessSleepRollupMap: (...args: unknown[]) => mockUseWeeklyFitnessSleepRollupMap(...args),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => mockUsePreferences(),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>(
    "@/lib/ui/calendar/dateUtils",
  );
  return {
    ...actual,
    getTodayDayKeyLocal: () => "2026-06-04" as const,
  };
});

jest.mock("@react-navigation/native", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");
  return {
    /**
     * Mirror real navigation behaviour: fire the focus callback once on mount, not on every
     * render. The production `useFocusEffect` only fires when the screen actually gains focus;
     * for unit tests this is "mount". We capture the latest cb in a ref to avoid retriggering.
     */
    useFocusEffect: (cb: () => unknown) => {
      const cbRef = React.useRef(cb);
      cbRef.current = cb;
      React.useEffect(() => {
        const cleanup = cbRef.current();
        return typeof cleanup === "function" ? (cleanup as () => void) : undefined;
      }, []);
    },
  };
});

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockGetDailyFacts = getDailyFacts as jest.MockedFunction<typeof getDailyFacts>;
const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

type HookState = UseWeeklyFitnessCardResult;

function Harness(props: { onState: (s: HookState) => void }) {
  const state = useWeeklyFitnessCard();
  const stableRef = useRef(props.onState);
  stableRef.current = props.onState;
  useEffect(() => {
    stableRef.current(state);
  }, [state]);
  return null;
}

async function flush() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
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
  mockGetDailyFacts.mockResolvedValue({
    ok: true as const,
    status: 200,
    requestId: "req",
    json: {
      userId: "test-uid",
      date: "2026-05-07",
      strength: { workoutsCount: 0, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
      cardio: { durationMinutes: 0, sessions: 0 },
    },
  } as never);
});

describe("useWeeklyFitnessCard regression (audit fix)", () => {
  it("never invokes useWorkoutsCalendarRange", async () => {
    await act(async () => {
      renderer.create(<Harness onState={() => undefined} />);
    });
    await flush();

    expect(mockUseWorkoutsCalendarRange).not.toHaveBeenCalled();
  });

  it("never invokes getRawEvents (no raw workout payload hydration)", async () => {
    await act(async () => {
      renderer.create(<Harness onState={() => undefined} />);
    });
    await flush();

    expect(mockGetRawEvents).not.toHaveBeenCalled();
  });

  it("issues at most 7 GET /daily-facts requests (current week only)", async () => {
    await act(async () => {
      renderer.create(<Harness onState={() => undefined} />);
    });
    await flush();

    expect(mockGetDailyFacts).toHaveBeenCalled();
    expect(mockGetDailyFacts.mock.calls.length).toBeLessThanOrEqual(7);
  });

  it("does not surface error when all days are 404 (empty future days)", async () => {
    mockGetDailyFacts.mockReset();
    mockGetDailyFacts.mockResolvedValue({
      ok: false as const,
      status: 404,
      kind: "http" as const,
      error: "Not found",
      requestId: "req-404",
    } as never);

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(latest!.error).toBeNull();
    const strengthRow = latest!.rows.find((r) => r.key === "strength");
    const cardioRow = latest!.rows.find((r) => r.key === "cardio");
    expect(strengthRow?.valueLabel).toBe("0 workouts");
    expect(cardioRow?.valueLabel).toBe("0.0 miles");
  });

  it("surfaces an error when a real network timeout occurs", async () => {
    mockGetDailyFacts.mockReset();
    mockGetDailyFacts.mockResolvedValue({
      ok: false as const,
      status: 0,
      kind: "network" as const,
      error: "Request timed out",
      requestId: null,
    } as never);

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => (latest = s)} />);
    });
    await flush();

    expect(latest!.error).toBe("Request timed out");
  });

  it("renders strength = 4 workouts for audit week dailyFacts [1,1,1,0,1,0,0] (not 8)", async () => {
    const strengthByDay: Record<string, number> = {
      "2026-05-31": 1,
      "2026-06-01": 1,
      "2026-06-02": 1,
      "2026-06-03": 0,
      "2026-06-04": 1,
      "2026-06-05": 0,
      "2026-06-06": 0,
    };

    mockGetDailyFacts.mockReset();
    mockGetDailyFacts.mockImplementation(async (day: string) => {
      const count = strengthByDay[day] ?? 0;
      return {
        ok: true as const,
        status: 200,
        requestId: `req-${day}`,
        json: {
          userId: "test-uid",
          date: day,
          strength: { workoutsCount: count, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
          cardio: { durationMinutes: 0, sessions: 0 },
        },
      } as never;
    });

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => (latest = s)} />);
    });
    await flush();

    const strengthRow = latest!.rows.find((r) => r.key === "strength");
    expect(strengthRow?.valueLabel).toBe("4 workouts");
    expect(mockGetDailyFacts.mock.calls.length).toBeLessThanOrEqual(14);
  });

  it("renders strength + cardio row values aggregated from dailyFacts", async () => {
    mockGetDailyFacts.mockReset();
    // Every day in the current week returns: 1 strength workout + 1km cardio.
    // Result is independent of which calendar week the test happens to run on.
    mockGetDailyFacts.mockImplementation(async (day: string) => {
      return {
        ok: true as const,
        status: 200,
        requestId: `req-${day}`,
        json: {
          userId: "test-uid",
          date: day,
          strength: { workoutsCount: 1, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
          cardio: { durationMinutes: 10, sessions: 1, distanceMeters: 1_000 },
        },
      } as never;
    });

    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => (latest = s)} />);
    });
    await flush();

    const dayCount = mockGetDailyFacts.mock.calls.length;
    expect(dayCount).toBeGreaterThan(0);

    const strengthRow = latest!.rows.find((r) => r.key === "strength");
    expect(strengthRow?.valueLabel).toBe(`${dayCount} ${dayCount === 1 ? "workout" : "workouts"}`);

    const expectedMiles = ((dayCount * 1_000) / 1609.344).toFixed(1);
    const cardioRow = latest!.rows.find((r) => r.key === "cardio");
    expect(cardioRow?.valueLabel).toBe(`${expectedMiles} miles`);
  });
});
