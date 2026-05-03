/**
 * After a successful workout backfill pass, overview bumps calendar refresh so
 * Recent Workouts can reflect newly ingested RawEvents (same adapter path).
 */
import React, { act } from "react";

type AhState = { lastCheckedAt: string | null; deepBackfillVersion: string | null };
const g = globalThis as unknown as { __recentBackfillAh?: AhState };
g.__recentBackfillAh ??= { lastCheckedAt: null, deepBackfillVersion: null };
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import TrainingOverviewScreen from "../overview";
import { runWorkoutHistoryBackfillPasses } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";

const mockUseWorkoutsCalendarRange = jest.fn();
const mockPush = jest.fn();

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
    user: { uid: "test-uid" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("id-token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready" as const,
      preferences: { units: { mass: "lb" as const }, timezone: { mode: "recorded" as const }, selectedGymId: null },
    },
    refresh: jest.fn(),
    setMassUnit: jest.fn(),
    setSelectedGymId: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-14",
  getWeekDaysForAnchor: () =>
    [
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
    ] as const,
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn(),
  setWorkoutsAnchor: jest.fn(),
  clearWorkoutsAnchor: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn().mockResolvedValue(null),
  setLastSyncAt: jest.fn().mockResolvedValue(undefined),
  getAppleHealthLastCheckedAt: jest.fn(() =>
    Promise.resolve(
      (globalThis as unknown as { __recentBackfillAh: AhState }).__recentBackfillAh.lastCheckedAt,
    ),
  ),
  setAppleHealthLastCheckedAt: jest.fn(async (iso: string) => {
    (globalThis as unknown as { __recentBackfillAh: AhState }).__recentBackfillAh.lastCheckedAt = iso;
  }),
  getAppleHealthDeepBackfillVersion: jest.fn(() =>
    Promise.resolve(
      (globalThis as unknown as { __recentBackfillAh: AhState }).__recentBackfillAh.deepBackfillVersion,
    ),
  ),
  setAppleHealthDeepBackfillVersion: jest.fn(async (version: string) => {
    (globalThis as unknown as { __recentBackfillAh: AhState }).__recentBackfillAh.deepBackfillVersion = version;
  }),
  getAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => "oli-wb-v2-2026-03-21"),
  setAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  clearAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  getAppleHealthConnected: jest.fn().mockResolvedValue(true),
  setAppleHealthConnected: jest.fn(),
  setAppleHealthNotAvailable: jest.fn(),
  getAppleHealthNotAvailable: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn(),
  pullTodaySnapshot: jest.fn().mockResolvedValue({
    ok: true,
    data: {
      day: "2026-03-10",
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
  stepsIdempotencyKey: (d: string) => `steps:${d}`,
  workoutIdempotencyKey: () => "w:key",
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn().mockResolvedValue({ ok: true, json: {} }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: (...args: unknown[]) => mockUseWorkoutsCalendarRange(...args),
}));
jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: {},
    saveOverride: jest.fn(),
    reload: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  TextInput: "TextInput",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: "ios", select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
  NativeModules: {
    AppleHealthKit: {
      isAvailable: (cb: (e: unknown, ok: boolean) => void) => cb(null, true),
    },
  },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    if (typeof cb === "function") cb();
  },
}));

const mockBackfill = runWorkoutHistoryBackfillPasses as jest.MockedFunction<
  typeof runWorkoutHistoryBackfillPasses
>;

const MOCK_EMPTY_BOOTSTRAP = {
  attempted: false,
  requestedStartDate: null,
  requestedEndDate: null,
  nativeMethodAssumed: false,
  workoutsFetched: 0,
  workoutsIngested: 0,
  pagesFetched: 0,
  truncated: false,
  nativeEarliestStart: null,
  nativeLatestStart: null,
  ingestAttempted: 0,
  ingestOk: 0,
  ingestFailed: 0,
};

beforeEach(() => {
  g.__recentBackfillAh!.lastCheckedAt = null;
  g.__recentBackfillAh!.deepBackfillVersion = "v13m";
  jest.clearAllMocks();
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
    durableTitlesByWorkoutId: {},
    days: [
      { day: "2026-03-08", workouts: [] },
      { day: "2026-03-09", workouts: [] },
      { day: "2026-03-10", workouts: [] },
      { day: "2026-03-11", workouts: [] },
      { day: "2026-03-12", workouts: [] },
      { day: "2026-03-13", workouts: [] },
      { day: "2026-03-14", workouts: [] },
    ],
  });
  mockBackfill.mockResolvedValue({
    ok: true,
    passesRun: 1,
    mayHaveMoreWorkouts: false,
    bootstrap: MOCK_EMPTY_BOOTSTRAP,
  });
});

it("passes increasing refreshEpoch to the single overview useWorkoutsCalendarRange after successful backfill", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });

  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockBackfill).toHaveBeenCalled();
  const calls = mockUseWorkoutsCalendarRange.mock.calls;
  expect(calls.length).toBeGreaterThanOrEqual(1);
  const epochs = calls.map((c) => (c[2] as { refreshEpoch?: number } | undefined)?.refreshEpoch ?? 0);
  expect(Math.max(...epochs)).toBeGreaterThanOrEqual(1);
  expect(epochs[epochs.length - 1]).toBeGreaterThanOrEqual(epochs[0] ?? 0);
});

it("still shows recent workouts while calendar range is refreshing (stale-while-refresh)", async () => {
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
    durableTitlesByWorkoutId: {},
    refreshing: true,
    days: [
      { day: "2026-03-08", workouts: [] },
      { day: "2026-03-09", workouts: [] },
      { day: "2026-03-10", workouts: [] },
      { day: "2026-03-11", workouts: [] },
      {
        day: "2026-03-12",
        workouts: [
          {
            id: "rw1",
            observedAt: "2026-03-12T10:00:00.000Z",
            sourceId: "manual",
            title: "StaleRefreshRun",
            workoutType: "strength" as const,
            start: "2026-03-12T10:00:00.000Z",
            end: null,
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
      { day: "2026-03-13", workouts: [] },
      { day: "2026-03-14", workouts: [] },
    ],
  });

  let test!: renderer.ReactTestRenderer;
  await act(async () => {
    test = renderer.create(<TrainingOverviewScreen />);
  });

  const json = JSON.stringify(test.toJSON());
  expect(json).toContain("Stale Refresh Run");
});

it("renders formatted This Week workout title in the accent row without duration meta", async () => {
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
    durableTitlesByWorkoutId: {},
    days: [
      { day: "2026-03-08", workouts: [] },
      { day: "2026-03-09", workouts: [] },
      { day: "2026-03-10", workouts: [] },
      {
        day: "2026-03-11",
        workouts: [
          {
            id: "rw2",
            observedAt: "2026-03-11T10:00:00.000Z",
            sourceId: "apple_health",
            title: "TraditionalStrengthTraining",
            start: "2026-03-11T10:00:00.000Z",
            end: null,
            durationMinutes: 45,
            calories: 380,
          },
        ],
      },
      { day: "2026-03-12", workouts: [] },
      { day: "2026-03-13", workouts: [] },
      { day: "2026-03-14", workouts: [] },
    ],
  });

  let test!: renderer.ReactTestRenderer;
  await act(async () => {
    test = renderer.create(<TrainingOverviewScreen />);
  });

  const json = JSON.stringify(test.toJSON());
  expect(json).toContain("Strength Training");
  expect(json).toContain("workouts-overview-this-week-row-value-bar");
  expect(json).not.toContain("45 min");
  expect(json).not.toContain("Apple Health");
});

it("lists all in-week workouts on the overview (earliest first) and supports fifth-row interactions", async () => {
  mockUseWorkoutsCalendarRange.mockImplementation(() => ({
    status: "ready",
    durableTitlesByWorkoutId: {},
    days: [
      {
        day: "2026-03-11",
        workouts: [
          { id: "r1", observedAt: "2026-03-11T10:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T10:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r2", observedAt: "2026-03-11T09:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T09:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r3", observedAt: "2026-03-11T08:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T08:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r4", observedAt: "2026-03-11T07:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T07:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r5", observedAt: "2026-03-11T06:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T06:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r6", observedAt: "2026-03-11T05:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T05:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r7", observedAt: "2026-03-11T04:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T04:00:00.000Z", end: null, durationMinutes: 20, calories: null },
          { id: "r8", observedAt: "2026-03-11T03:00:00.000Z", sourceId: "manual", title: "Lift", workoutType: "strength" as const, start: "2026-03-11T03:00:00.000Z", end: null, durationMinutes: 20, calories: null },
        ],
      },
    ],
  }));

  let test!: renderer.ReactTestRenderer;
  await act(async () => {
    test = renderer.create(<TrainingOverviewScreen />);
  });

  const rows = test.root.findAll(
    (n) =>
      typeof n.props?.accessibilityLabel === "string" &&
      n.props.accessibilityLabel.startsWith("Open workout details r"),
  );
  expect(rows).toHaveLength(8);

  act(() => {
    test.root.findByProps({ accessibilityLabel: "Open workout details r4" }).props.onPress();
  });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/workouts/day/[day]",
    params: { day: "2026-03-11" },
  });

  act(() => {
    test.root.findByProps({ accessibilityLabel: "Workout actions r4" }).props.onPress();
  });
  act(() => {
    test.root.findByProps({ accessibilityLabel: "View details" }).props.onPress();
  });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/workouts/day/[day]",
    params: { day: "2026-03-11" },
  });
});
