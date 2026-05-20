/**
 * Strength overview main body: Today, This Week, Strength Baseline frequency table (formerly history card).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet } from "react-native";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

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

jest.mock("@/lib/data/workouts/workoutDetailMuscleVolume", () => {
  const actual = jest.requireActual<typeof import("@/lib/data/workouts/workoutDetailMuscleVolume")>(
    "@/lib/data/workouts/workoutDetailMuscleVolume",
  );
  return {
    ...actual,
    buildWeeklyWorkingSetVolumeRows: jest.fn(() => []),
  };
});

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

import { STRENGTH_BASELINE_CARD_EXPLAINER_COPY } from "@/lib/ui/workouts/StrengthHistorySummaryCard";
import { buildWeeklyWorkingSetVolumeRows } from "@/lib/data/workouts/workoutDetailMuscleVolume";

import StrengthTrainingOverviewScreen from "../overview";

const mockBuildWeeklyWorkingSetVolumeRows = buildWeeklyWorkingSetVolumeRows as jest.MockedFunction<
  typeof buildWeeklyWorkingSetVolumeRows
>;

describe("Strength overview main layout", () => {
  beforeEach(() => {
    workoutsOverviewExpoMocks().push.mockClear();
    workoutsOverviewExpoMocks().setOptions.mockClear();
    mockBuildWeeklyWorkingSetVolumeRows.mockReturnValue([]);
  });

  it("renders Program card, then Today card, then This Week, then Strength Baseline table (no standalone baseline card)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iProgramCard = json.indexOf("strength-program-card");
    const iTodayCard = json.indexOf("strength-today-card");
    const iThisWeek = json.indexOf('"This Week"');
    const iBaselineCard = json.indexOf("strength-history-summary-card");
    const iBaselineHeading = json.indexOf('"Strength Baseline"');
    expect(iProgramCard).toBeGreaterThan(-1);
    expect(iTodayCard).toBeGreaterThan(-1);
    expect(iBaselineCard).toBeGreaterThan(-1);
    expect(iThisWeek).toBeGreaterThan(-1);
    expect(iBaselineHeading).toBeGreaterThan(-1);
    expect(json).not.toContain("strength-baseline-card-nav");
    expect(json).not.toContain("strength-this-week-frequency-bar");
    expect(json).not.toContain("strength-this-week-rating-pill");
    expect(json).not.toContain("workouts-overview-this-week-row-value-bar");
    expect(json).not.toContain('"Overview"');
    expect(json).not.toContain('"Recent Workouts"');
    expect(iProgramCard).toBeLessThan(iTodayCard);
    expect(iTodayCard).toBeLessThan(iThisWeek);
    expect(iThisWeek).toBeLessThan(iBaselineCard);
    expect(json).not.toContain("weekly-working-volume-card");
    expect(json).not.toContain("Last Week");
    expect(json).not.toContain("14 Day");
    expect(json).not.toContain("This Month");
    expect(json).toContain("7 Day");
    expect(json).toContain("30 Day");
    expect(json).toContain("90 Day");
    expect(json).toContain("YTD");
    expect(json).toContain("12 Month");
    expect(json).toContain("per week");
    expect(json).not.toContain("workouts/wk");
    expect(json).not.toContain("minutes completed this week");
    expect(json).not.toContain("Weekly Insights");
    expect(json).not.toContain("Weekly Strength");
    expect(json).not.toContain("Weekly Muscle Group");
    expect(json).not.toContain("Monthly Workouts");
    expect(json).not.toContain("Yearly Workouts");
    expect(json).toContain("This Week");
    expect(json).not.toContain("No workout logged today");
    expect(json).toContain("No workout today");
    expect(json).toContain("strength-history-progress-thisWeek");
    expect(json).toContain("View More →");
    expect(json).not.toContain("Plan workout");
    expect(json).not.toContain("Log workout");
    expect(json).not.toContain("Create workout");
    expect(json).toContain(STRENGTH_BASELINE_CARD_EXPLAINER_COPY);
    expect(json).toContain("strength-history-summary-view-more");
    expect(json).toContain("View All →");
    expect(json).not.toContain("strength-baseline-frequency-legend");
  });

  it("This Week combined card uses the same elevated shell padding as Weekly Working Volume", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const thisWeekCard = tree.root.findByProps({ testID: "workouts-overview-this-week-combined-card" });
    const flat = StyleSheet.flatten(thisWeekCard.props.style ?? {});
    expect(flat.backgroundColor).toBe(UI_CARD_SURFACE);
    expect(flat.padding).toBe(15);
    expect(flat.borderRadius).toBe(12);
  });

  it("Strength Baseline tier pill opens strength range explainer with params", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const { push } = workoutsOverviewExpoMocks();
    const pill = tree.root.findByProps({ testID: "strength-history-tier-pill-thisWeek" });
    await act(async () => {
      pill.props.onPress();
    });
    expect(push).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/strength-range-explainer",
      params: expect.objectContaining({
        window: "7 Day",
        tierBand: expect.any(String),
        tierLabel: expect.any(String),
      }),
    });
  });

  it("Strength Baseline View More navigates to Strength Analytics", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const { push } = workoutsOverviewExpoMocks();
    const viewMore = tree.root.findByProps({ testID: "strength-history-summary-view-more" });
    await act(async () => {
      viewMore.props.onPress();
    });
    expect(push).toHaveBeenCalledWith("/(app)/workouts/analytics-detail");
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

  it("renders Weekly Working Volume between This Week and Strength Baseline when working rows exist", async () => {
    mockBuildWeeklyWorkingSetVolumeRows.mockReturnValue([{ muscleGroup: "chest", setCount: 4 }]);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iThisWeek = json.indexOf('"This Week"');
    const iWeeklyVolume = json.indexOf("weekly-working-volume-card");
    const iBaselineCard = json.indexOf("strength-history-summary-card");
    expect(iWeeklyVolume).toBeGreaterThan(-1);
    expect(json).toContain("Volume per Muscle Group");
    expect(json).not.toContain("Weekly Working Volume");
    expect(json).toContain("weekly-working-volume-chest");
    expect(iThisWeek).toBeLessThan(iWeeklyVolume);
    expect(iWeeklyVolume).toBeLessThan(iBaselineCard);
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
