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
      {
        day: "2026-03-08",
        workouts: [
          {
            id: "c4",
            observedAt: "2026-03-08T07:00:00.000Z",
            sourceId: "apple_health",
            title: "Running",
            workoutType: "cardio" as const,
            start: "2026-03-08T07:00:00.000Z",
            end: "2026-03-08T07:40:00.000Z",
            durationMinutes: null,
            calories: null,
            distanceMeters: 4956.77952,
            activityName: "Running",
          },
        ],
      },
      {
        day: "2026-03-09",
        workouts: [
          {
            id: "c3",
            observedAt: "2026-03-09T12:00:00.000Z",
            sourceId: "apple_health",
            title: "Other",
            workoutType: "cardio" as const,
            start: "2026-03-09T12:00:00.000Z",
            end: "2026-03-09T12:31:00.000Z",
            durationMinutes: 31,
            calories: null,
            distanceMeters: 16093.44,
            activityName: "Other",
          },
        ],
      },
      {
        day: "2026-03-10",
        workouts: [
          {
            id: "c2",
            observedAt: "2026-03-10T09:00:00.000Z",
            sourceId: "apple_health",
            title: "Cycling",
            workoutType: "cardio" as const,
            start: "2026-03-10T09:00:00.000Z",
            end: "2026-03-10T09:22:00.000Z",
            durationMinutes: 22,
            calories: null,
            distanceMeters: 4377.41568,
            activityName: "Cycling",
          },
        ],
      },
      {
        day: "2026-03-11",
        workouts: [
          {
            id: "c1",
            observedAt: "2026-03-11T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Walking",
            workoutType: "cardio" as const,
            start: "2026-03-11T10:00:00.000Z",
            end: "2026-03-11T10:31:00.000Z",
            durationMinutes: 31,
            calories: null,
            distanceMeters: 4956.77952,
            activityName: "Walking",
          },
        ],
      },
    ],
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-12" as const,
  getWeekDaysForAnchor: () =>
    [
      "2026-03-08",
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

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("expo-router", () => {
  const w = { push: jest.fn(), setOptions: jest.fn() };
  (globalThis as unknown as { __oliCardioOverviewExpo: typeof w }).__oliCardioOverviewExpo = w;
  return {
    useNavigation: () => ({ setOptions: w.setOptions, goBack: jest.fn() }),
    useRouter: () => ({ push: w.push }),
  };
});

function cardioOverviewExpoMocks() {
  return (globalThis as unknown as { __oliCardioOverviewExpo: { push: jest.Mock; setOptions: jest.Mock } })
    .__oliCardioOverviewExpo;
}

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import CardioOverviewScreen from "@/app/(app)/cardio/index";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";

describe("Cardio overview baseline layout", () => {
  beforeEach(() => {
    cardioOverviewExpoMocks().push.mockClear();
    cardioOverviewExpoMocks().setOptions.mockClear();
  });

  it("renders Today first, This Week, Cardio Baseline history (no top baseline card, no weekly mi banner)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioOverviewScreen />);
    });
    const json = JSON.stringify(tree.toJSON());

    expect(json.indexOf("Today")).toBeLessThan(json.indexOf("This Week"));

    expect(json).not.toContain("cardio-baseline-card-nav");
    expect(json).not.toContain("cardio-baseline-frequency-bar");
    expect(json).not.toContain("mi this week");

    expect(json).toContain("cardio-today-card");
    expect(json).toContain("No cardio today");

    expect(json).toContain("Cardio Baseline");
    expect(json).toContain("Your cardio baseline is the average cardio distance across key time ranges.");
    expect(json).toContain("View More →");

    expect(json.indexOf("Cardio Baseline")).toBeLessThan(json.indexOf("7 Day"));
    expect(json).toContain("This Week");
    expect(json).toContain("7 Day");
    expect(json).toContain("30 Day");
    expect(json).toContain("90 Day");
    expect(json).toContain("YTD");
    expect(json).toContain("12 Month");
    expect(json).toContain("mi per week");
    expect(json).not.toContain("min/wk");
    expect(json).toContain("cardio-history-tier-pill-thisWeek");
    expect(json).toContain("cardio-history-progress-thisWeek");
    expect(json).toContain("cardio-history-progress-day30");
    expect(json).toContain("cardio-history-progress-day90");
    expect(json).toContain("cardio-history-progress-ytd");
    expect(json).toContain("cardio-history-progress-month12");
    expect(json).toContain("Data will appear when enough history is available");
    expect(json).toContain("—");

    expect(json).not.toContain("Recent cardio sessions");
    const labelSun = formatWeekdayFullFromDayKey("2026-03-08");
    const labelTue = formatWeekdayFullFromDayKey("2026-03-10");
    const labelWed = formatWeekdayFullFromDayKey("2026-03-11");
    expect(json).toContain(labelSun);
    expect(json).toContain(labelTue);
    expect(json).toContain(labelWed);
    expect(json.indexOf(labelSun)).toBeLessThan(json.indexOf(labelTue));
    expect(json.indexOf(labelTue)).toBeLessThan(json.indexOf(labelWed));
    expect(json).toContain("3.08 mi / 31 min");
    expect(json).toContain("Walking");
    expect(json).toContain("31 min");
    expect(json).toContain("3.08 mi");

    expect(json).not.toContain("undefined");
    expect(json).not.toContain('"children":["2026"]');

    expect(json).not.toContain("cardio-baseline-frequency-legend");
  });

  it("Cardio Baseline tier pill opens cardio range explainer", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioOverviewScreen />);
    });
    const { push } = cardioOverviewExpoMocks();
    const pill = tree.root.findByProps({ testID: "cardio-history-tier-pill-thisWeek" });
    await act(async () => {
      pill.props.onPress();
    });
    expect(push).toHaveBeenCalledWith({
      pathname: "/(app)/cardio/cardio-range-explainer",
      params: expect.objectContaining({
        window: "7 Day",
        tierIndex: expect.any(String),
        tierLabel: expect.any(String),
        displayValue: expect.any(String),
      }),
    });
  });
});
