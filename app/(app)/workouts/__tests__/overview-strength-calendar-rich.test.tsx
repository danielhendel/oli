/**
 * Strength overview with hydrated calendar rows (completed sessions + This Week minutes summary).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/lib/api/usersMe", () => ({
  getWorkoutMonthSummaries: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    requestId: null,
    json: { year: 2026, expectedMonthCount: 12, complete: false, items: [] },
  }),
  postWorkoutMonthSummariesRebuild: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    requestId: null,
    json: { year: 2026, monthsProcessed: 12 },
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("t"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready" as const,
      preferences: {
        units: { mass: "lb" as const },
        timezone: { mode: "recorded" as const },
        selectedGymId: null,
      },
    },
    refresh: jest.fn(),
    setMassUnit: jest.fn(),
    setSelectedGymId: jest.fn(),
  }),
}));

const weekDayKeys = [
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
  "2026-03-15",
] as const;

jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: () => ({ energy: undefined, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: () => ({
    status: "ready" as const,
    durableTitlesByWorkoutId: {},
    days: weekDayKeys.map((day, idx) =>
      idx < 5
        ? {
            day,
            workouts: [
              {
                id: `w-${day}`,
                observedAt: `${day}T10:00:00.000Z`,
                sourceId: "apple_health",
                title: "Lift",
                workoutType: "strength" as const,
                start: `${day}T10:00:00.000Z`,
                end: `${day}T10:50:00.000Z`,
                durationMinutes: 50,
                calories: null,
              },
            ],
          }
        : { day, workouts: [] },
    ),
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-12" as const,
  getWeekDaysForAnchor: () => weekDayKeys,
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn(),
  pullTodaySnapshot: jest.fn().mockResolvedValue({
    ok: true,
    data: {
      day: "2026-03-12",
      steps: null,
      exerciseMinutes: null,
      activeEnergyKcal: null,
      restingHeartRateBpm: null,
      workouts: [],
    },
  }),
  pullAnchoredWorkouts: jest.fn(),
  pullWorkoutsByDateRange: jest.fn(),
  toHealthKitIso8601: (d: Date) => d.toISOString(),
  stepsIdempotencyKey: jest.fn(),
  workoutIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn(),
  setWorkoutsAnchor: jest.fn(),
  clearWorkoutsAnchor: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => {
  const { emptyWorkoutHistoryBootstrapSummary } =
    jest.requireActual<typeof import("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill")>(
      "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill",
    );
  return {
    runWorkoutHistoryBackfillPasses: jest.fn(async () => ({
      ok: true,
      passesRun: 1,
      mayHaveMoreWorkouts: false,
      bootstrap: emptyWorkoutHistoryBootstrapSummary(),
    })),
    DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
  };
});

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn().mockResolvedValue(null),
  setLastSyncAt: jest.fn(),
  getAppleHealthLastCheckedAt: jest.fn().mockResolvedValue(null),
  setAppleHealthLastCheckedAt: jest.fn(),
  getAppleHealthDeepBackfillVersion: jest.fn().mockResolvedValue("v14-physiology"),
  setAppleHealthDeepBackfillVersion: jest.fn().mockResolvedValue(undefined),
  getAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue("oli-wb-v2-2026-03-21"),
  setAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue(undefined),
  clearAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue(undefined),
  getAppleHealthConnected: jest.fn().mockResolvedValue(true),
  setAppleHealthConnected: jest.fn(),
  setAppleHealthNotAvailable: jest.fn(),
  getAppleHealthNotAvailable: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/api/ingest", () => ({ ingestRawEvent: jest.fn() }));
jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn().mockResolvedValue({ ok: true, json: {} }),
}));

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({ overridesByWorkoutId: {}, reload: jest.fn() }),
}));

jest.mock("@/lib/workouts/journal/manualWorkoutSummary", () => ({
  listManualWorkoutDaySummaries: jest.fn().mockResolvedValue([]),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("expo-router", () => {
  const w = { push: jest.fn(), setOptions: jest.fn() };
  (globalThis as unknown as { __oliStrengthRichOverviewExpo?: typeof w }).__oliStrengthRichOverviewExpo = w;
  return {
    useNavigation: () => ({ setOptions: w.setOptions, goBack: jest.fn() }),
    useRouter: () => ({ push: w.push }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import StrengthTrainingOverviewScreen from "../overview";

describe("Strength overview hydrated calendar copy", () => {
  it("shows Today completed state without under-title weekly summary sentence", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Completed");
    expect(json).toContain("Log Another →");
    expect(json).not.toContain("Completed Today");
    expect(json).not.toContain("No workout today");
    expect(json).not.toContain("minutes completed this week");
    expect(json).not.toContain("sessions and ");
    expect(json).toContain("50 min");
    expect(json).toContain("Lift");
  });

  it("still exposes row actions for weekly entries", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Workout actions");
    expect(json).toContain("workouts-this-week-range-label");
    expect(json).not.toContain("strength-recent-week-combined-view-more");
    expect(json).not.toContain("View All →");
  });

  it("mounts the Yearly Strength card below Strength Baseline with the current-year total", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iBaseline = json.indexOf("strength-history-summary-card");
    const iYearly = json.indexOf("workouts-yearly-card");
    expect(iBaseline).toBeGreaterThan(-1);
    expect(iYearly).toBeGreaterThan(-1);
    // Placement: Yearly card sits AFTER the Strength Baseline card.
    expect(iBaseline).toBeLessThan(iYearly);
    expect(json).toContain("2026 Strength");
    expect(json).toContain("workouts-yearly-range-label");
    expect(json).toContain("workouts-yearly-month-chart");
    // 5 strength workouts were seeded for 2026 (one per Mon–Fri of the week).
    const totalValue = tree.root.findByProps({ testID: "workouts-yearly-total-metric-value" });
    expect(totalValue.props.children).toBe("5");
    // Forward chevron disabled — we're on the current year by default.
    const nextChevron = tree.root.findByProps({ testID: "workouts-yearly-nav-next" });
    expect(nextChevron.props.disabled).toBe(true);
  });

  it("Yearly Strength card previous-year chevron updates the displayed year label", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const previous = tree.root.findByProps({ testID: "workouts-yearly-nav-previous" });
    expect(previous.props.disabled).toBe(false);
    await act(async () => {
      previous.props.onPress();
    });
    const label = tree.root.findByProps({ testID: "workouts-yearly-range-label" });
    expect(label.props.children).toBe("2025");
    const next = tree.root.findByProps({ testID: "workouts-yearly-nav-next" });
    expect(next.props.disabled).toBe(false);
  });
});
