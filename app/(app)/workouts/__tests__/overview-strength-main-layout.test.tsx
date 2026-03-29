/**
 * Strength overview main body: Today above Recent; analytics cards live on analytics-detail.
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

jest.mock("@/lib/workouts/exercises/customExerciseStore", () => ({
  listCustomExercises: jest.fn().mockResolvedValue([]),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import StrengthTrainingOverviewScreen from "../overview";

describe("Strength overview main layout", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it("renders Today before Recent and omits weekly/monthly analytics cards", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iToday = json.indexOf('"Today"');
    const iRecent = json.indexOf('"Recent"');
    const iWeeklyInsights = json.indexOf('"Weekly Insights"');
    expect(iToday).toBeGreaterThan(-1);
    expect(iRecent).toBeGreaterThan(-1);
    expect(iWeeklyInsights).toBeGreaterThan(-1);
    expect(iToday).toBeLessThan(iRecent);
    expect(iRecent).toBeLessThan(iWeeklyInsights);
    expect(json).not.toContain("Weekly Strength");
    expect(json).not.toContain("Weekly Muscle Group");
    expect(json).not.toContain("Monthly Workouts");
    expect(json).not.toContain("Yearly Workouts");
    expect(json).toContain("Weekly Insights");
  });

  it("Today View More navigates to Strength Analytics", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const viewMoreLinks = tree.root.findAllByProps({ accessibilityLabel: "View more" });
    expect(viewMoreLinks.length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      viewMoreLinks[0]!.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/workouts/analytics-detail");
  });
});
