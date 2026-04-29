/**
 * Strength overview main body: Baseline, This Week + Strength history summary;
 * analytics detail charts stay off this screen.
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

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: () => ({
    status: "ready" as const,
    durableTitlesByWorkoutId: {},
    days: [
      { day: "2026-03-09", workouts: [] },
      { day: "2026-03-10", workouts: [] },
      { day: "2026-03-11", workouts: [] },
      { day: "2026-03-12", workouts: [] },
      { day: "2026-03-13", workouts: [] },
      { day: "2026-03-14", workouts: [] },
      { day: "2026-03-15", workouts: [] },
    ],
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-12" as const,
  getWeekDaysForAnchor: () =>
    [
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
      "2026-03-15",
    ] as const,
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
  getAppleHealthDeepBackfillVersion: jest.fn().mockResolvedValue("v13m"),
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
  (globalThis as unknown as { __oliWorkoutsOverviewExpo?: typeof w }).__oliWorkoutsOverviewExpo = w;
  return {
    useNavigation: () => ({ setOptions: w.setOptions, goBack: jest.fn() }),
    useRouter: () => ({ push: w.push }),
  };
});

function workoutsOverviewExpoMocks() {
  return (globalThis as unknown as { __oliWorkoutsOverviewExpo: { push: jest.Mock; setOptions: jest.Mock } })
    .__oliWorkoutsOverviewExpo;
}

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import StrengthTrainingOverviewScreen from "../overview";

describe("Strength overview main layout", () => {
  beforeEach(() => {
    workoutsOverviewExpoMocks().push.mockClear();
    workoutsOverviewExpoMocks().setOptions.mockClear();
  });

  it("renders Strength Baseline, This Week, and Strength history summary", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iBaseline = json.indexOf('"Strength Baseline"');
    const iThisWeek = json.indexOf('"This Week"');
    const iHistory7 = json.indexOf('"7 Day"');
    expect(iBaseline).toBeGreaterThan(-1);
    expect(iThisWeek).toBeGreaterThan(-1);
    expect(iHistory7).toBeGreaterThan(-1);
    expect(json).not.toContain("strength-this-week-frequency-bar");
    expect(json).not.toContain('"Overview"');
    expect(json).not.toContain('"Recent Workouts"');
    expect(iBaseline).toBeLessThan(iThisWeek);
    expect(iThisWeek).toBeLessThan(iHistory7);
    expect(json).not.toContain("Last Week");
    expect(json).toContain("30 Day");
    expect(json).toContain("YTD");
    expect(json).toContain("12 Month");
    expect(json).toContain("strength-history-summary-card");
    expect(json).toContain("wo");
    expect(json).not.toContain("Weekly Insights");
    expect(json).not.toContain("Weekly Strength");
    expect(json).not.toContain("Weekly Muscle Group");
    expect(json).not.toContain("Monthly Workouts");
    expect(json).not.toContain("Yearly Workouts");
    expect(json).toContain("This Week");
    expect(json).not.toContain("No workout logged today");
    expect((json.match(/strength-baseline-frequency-markers/g) ?? []).length).toBe(1);
  });

  it("overflow opens Strength settings route (dedicated settings, not in-popup menu)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const { setOptions, push } = workoutsOverviewExpoMocks();
    expect(setOptions.mock.calls.length).toBeGreaterThan(0);
    const lastOpts = setOptions.mock.calls[setOptions.mock.calls.length - 1]![0] as {
      headerRight?: () => React.ReactElement;
    };
    expect(lastOpts.headerRight).toBeDefined();
    let header!: renderer.ReactTestRenderer;
    await act(async () => {
      header = renderer.create(lastOpts.headerRight!());
    });
    const overflow = header.root.findByProps({ accessibilityLabel: "Strength settings" });
    await act(async () => {
      overflow.props.onPress();
    });
    expect(push).toHaveBeenCalledWith("/(app)/workouts/settings");
    void tree;
  });

  it("pressing Strength Baseline navigates to Strength Analytics (analytics-detail)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const baselineNav = tree.root.findByProps({ testID: "strength-baseline-card-nav" });
    await act(async () => {
      baselineNav.props.onPress();
    });
    expect(workoutsOverviewExpoMocks().push).toHaveBeenCalledWith("/(app)/workouts/analytics-detail");
  });

  it("combined card header View More navigates to All Strength Workouts", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const footer = tree.root.findByProps({ testID: "strength-recent-week-combined-view-more" });
    await act(async () => {
      footer.props.onPress();
    });
    expect(workoutsOverviewExpoMocks().push).toHaveBeenCalledWith("/(app)/workouts/recent-workouts-full");
  });
});
