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

// Strength Today calorie + Avg HR rows are sourced from `useDailyEnergyCard(today)`. Mock it
// inert here so the overview screen renders the rows with graceful "—" placeholders and never
// fires a real network request during tests (no `useDailyFacts` / `getDailyFacts` paths).
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: () => ({ energy: undefined, loading: false, error: null, refetch: jest.fn() }),
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

  it("renders Today card, then This Week, then Strength Baseline table (no Program card, no standalone baseline card)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    const iTodayCard = json.indexOf("strength-today-card");
    const iThisWeek = json.indexOf('"This Week"');
    const iBaselineCard = json.indexOf("strength-history-summary-card");
    const iBaselineHeading = json.indexOf('"Strength Baseline"');
    expect(iTodayCard).toBeGreaterThan(-1);
    expect(iBaselineCard).toBeGreaterThan(-1);
    expect(iThisWeek).toBeGreaterThan(-1);
    expect(iBaselineHeading).toBeGreaterThan(-1);
    expect(json).not.toContain("strength-program-card");
    expect(json).not.toContain("strength-baseline-card-nav");
    expect(json).not.toContain("strength-this-week-frequency-bar");
    expect(json).not.toContain("strength-this-week-rating-pill");
    expect(json).not.toContain("workouts-overview-this-week-row-value-bar");
    expect(json).not.toContain('"Overview"');
    expect(json).not.toContain('"Recent Workouts"');
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
    // Strength Today metrics-first layout: rest state shows the hero but no metric rows.
    expect(json).toContain("strength-today-hero");
    expect(json).not.toContain("strength-today-metric-rows");
    expect(json).not.toContain("strength-today-duration-figure");
    expect(json).toContain("strength-history-progress-thisWeek");
    expect(json).toContain("View More →");
    expect(json).not.toContain("Plan workout");
    expect(json).not.toContain("Log workout");
    expect(json).not.toContain("Create workout");
    // Personalized baseline explainer replaces the static literal.
    expect(json).toContain("strength baseline");
    expect(json).toContain("strength-history-summary-view-more");
    // "View All →" entry point removed from the Strength This Week card; the only remaining
    // header action in the Strength overview is the baseline "View More →" link.
    expect(json).not.toContain("View All →");
    expect(json).not.toContain("strength-recent-week-combined-view-more");
    expect(json).toContain("workouts-this-week-range-label");
    expect(json).not.toContain("strength-baseline-frequency-legend");
    // Per-row tier pill entry point removed from baseline card.
    expect(json).not.toContain("strength-history-tier-pill-");
    // Yearly card is visibility-gated on current-year having ≥1 completed strength workout.
    // This fixture seeds zero workouts, so the card must NOT mount.
    expect(json).not.toContain("workouts-yearly-card");
    expect(json).not.toContain("2026 Strength");
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

  it("Strength Baseline card no longer renders per-row tier pills", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    expect(() => tree.root.findByProps({ testID: "strength-history-tier-pill-thisWeek" })).toThrow();
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

  it("log icon opens Strength log route", async () => {
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
    const log = header.root.findByProps({ accessibilityLabel: "Open strength log" });
    await act(async () => {
      log.props.onPress();
    });
    expect(push).toHaveBeenCalledWith("/(app)/workouts/list");
    void tree;
  });

  it("renders Weekly Volume between This Week and Strength Baseline when working rows exist", async () => {
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
    expect(json).toContain("Weekly Volume");
    expect(json).not.toContain("Volume per Muscle Group");
    expect(json).not.toContain("Weekly Working Volume");
    expect(json).toContain("weekly-working-volume-chest");
    // Nav cluster present; static "This Week" subtitle replaced by the range label.
    expect(json).toContain("weekly-working-volume-range-label");
    expect(json).not.toContain("weekly-working-volume-subtitle");
    // Forward chevron disabled on default current-week mount.
    const nextChevron = tree.root.findByProps({ testID: "weekly-working-volume-nav-next" });
    expect(nextChevron.props.disabled).toBe(true);
    expect(iThisWeek).toBeLessThan(iWeeklyVolume);
    expect(iWeeklyVolume).toBeLessThan(iBaselineCard);
  });

  it("Weekly Volume previous-week press leaves This Week range label and WeeklyStrip selected day unchanged", async () => {
    mockBuildWeeklyWorkingSetVolumeRows.mockReturnValue([{ muscleGroup: "chest", setCount: 4 }]);
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const volumeLabelBefore = tree.root.findByProps({ testID: "weekly-working-volume-range-label" })
      .props.children as string;
    const thisWeekLabelBefore = tree.root.findByProps({ testID: "workouts-this-week-range-label" })
      .props.children as string;
    const previous = tree.root.findByProps({ testID: "weekly-working-volume-nav-previous" });
    expect(previous.props.disabled).toBe(false);
    await act(async () => {
      previous.props.onPress();
    });
    const volumeLabelAfter = tree.root.findByProps({ testID: "weekly-working-volume-range-label" })
      .props.children as string;
    const thisWeekLabelAfter = tree.root.findByProps({ testID: "workouts-this-week-range-label" })
      .props.children as string;
    expect(volumeLabelAfter).not.toBe(volumeLabelBefore);
    // State isolation: This Week navigator must not move when Volume navigates.
    expect(thisWeekLabelAfter).toBe(thisWeekLabelBefore);
    // Forward enables after leaving the current volume week.
    const next = tree.root.findByProps({ testID: "weekly-working-volume-nav-next" });
    expect(next.props.disabled).toBe(false);
  });

  it("This Week card next-week chevron is disabled on the default current-week mount", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const next = tree.root.findByProps({ testID: "workouts-this-week-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("This Week card previous-week chevron navigates the displayed week back by 7 days", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const initialLabel = tree.root.findByProps({ testID: "workouts-this-week-range-label" })
      .props.children as string;
    const previous = tree.root.findByProps({ testID: "workouts-this-week-nav-previous" });
    expect(previous.props.disabled).toBe(false);
    await act(async () => {
      previous.props.onPress();
    });
    const updatedLabel = tree.root.findByProps({ testID: "workouts-this-week-range-label" })
      .props.children as string;
    expect(typeof updatedLabel).toBe("string");
    expect(updatedLabel).not.toBe(initialLabel);
    // Forward should now be enabled because we've left the current week.
    const next = tree.root.findByProps({ testID: "workouts-this-week-nav-next" });
    expect(next.props.disabled).toBe(false);
    expect(next.props.accessibilityState).toEqual({ disabled: false });
  });

  it("Strength Baseline progress bars on the Strength overview use the shared Oli blue fill", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTrainingOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    // Strength Baseline rows render the shared blue fill (#4F7CFF), same as Activity/Sleep baseline.
    expect(json).toContain("#4F7CFF");
    // Old strength tier fills (saturated green / orange) must not appear on the Strength overview.
    expect(json.toLowerCase()).not.toContain("#4deb7a");
    expect(json.toLowerCase()).not.toContain("#ffb347");
  });
});
