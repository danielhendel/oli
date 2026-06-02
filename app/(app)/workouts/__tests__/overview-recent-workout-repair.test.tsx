/**
 * Integration: Workouts overview focus invokes the rolling 14-day recent repair
 * pass even when needsDeepBackfill = false (v14-physiology already completed),
 * and even when anchored-sync is throttled. The repair runs INDEPENDENTLY of
 * `WORKOUT_DEEP_BACKFILL_VERSION` and `appleHealth:lastCheckedAt`.
 */
import React, { act } from "react";

type AhState = {
  lastCheckedAt: string | null;
  deepBackfillVersion: string | null;
  workoutsRecentRepairLastRunAt: string | null;
};
const g = globalThis as unknown as { __recentRepairAh?: AhState };
g.__recentRepairAh ??= {
  lastCheckedAt: null,
  deepBackfillVersion: null,
  workoutsRecentRepairLastRunAt: null,
};

import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import TrainingOverviewScreen from "../overview";
import { runWorkoutHistoryBackfillPasses } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import { runRecentWorkoutRepair } from "@/lib/integrations/appleHealth/runRecentWorkoutRepair";

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

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-06-02",
  getWeekDaysForAnchor: () =>
    [
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ] as const,
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
}));

jest.mock("@/lib/integrations/appleHealth/runRecentWorkoutRepair", () => {
  const actual = jest.requireActual("@/lib/integrations/appleHealth/runRecentWorkoutRepair");
  return {
    ...actual,
    // Default mock: status "ran" with ingestedCount=0 so the focus loop does
    // not re-trigger via `setWorkoutsCalendarRefreshEpoch`. Individual tests
    // can override per-call if they want to assert the epoch bump.
    runRecentWorkoutRepair: jest.fn(async () => ({
      status: "ran",
      startDay: "2026-05-20",
      endDay: "2026-06-02",
      daysRequested: 14,
      hkWorkoutCount: 0,
      ingestedCount: 0,
      failedCount: 0,
      durationMs: 12,
      reason: "focus",
      latestNativeWorkoutStart: null,
    })),
  };
});

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
      (globalThis as unknown as { __recentRepairAh: AhState }).__recentRepairAh.lastCheckedAt,
    ),
  ),
  setAppleHealthLastCheckedAt: jest.fn(async (iso: string) => {
    (globalThis as unknown as { __recentRepairAh: AhState }).__recentRepairAh.lastCheckedAt = iso;
  }),
  getAppleHealthDeepBackfillVersion: jest.fn(() =>
    Promise.resolve(
      (globalThis as unknown as { __recentRepairAh: AhState }).__recentRepairAh.deepBackfillVersion,
    ),
  ),
  setAppleHealthDeepBackfillVersion: jest.fn(async (version: string) => {
    (globalThis as unknown as { __recentRepairAh: AhState }).__recentRepairAh.deepBackfillVersion =
      version;
  }),
  getAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => "oli-wb-v2-2026-03-21"),
  setAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  clearAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  getAppleHealthWorkoutsRecentRepairLastRunAt: jest.fn(async () =>
    (globalThis as unknown as { __recentRepairAh: AhState }).__recentRepairAh
      .workoutsRecentRepairLastRunAt,
  ),
  setAppleHealthWorkoutsRecentRepairLastRunAt: jest.fn(async (_uid: string, iso: string) => {
    (
      globalThis as unknown as { __recentRepairAh: AhState }
    ).__recentRepairAh.workoutsRecentRepairLastRunAt = iso;
  }),
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
      day: "2026-06-02",
      steps: null,
      exerciseMinutes: null,
      activeEnergyKcal: null,
      restingHeartRateBpm: null,
      workouts: [],
    },
  }),
  pullAnchoredWorkouts: jest.fn(),
  pullWorkoutsByDateRange: jest.fn(async () => ({
    ok: true,
    data: { workouts: [], pagesFetched: 0, truncated: false },
  })),
  toHealthKitIso8601: (d: Date) => d.toISOString(),
  stepsIdempotencyKey: (d: string) => `steps:${d}`,
  workoutIdempotencyKey: () => "w:key",
  getStepCountForDateRange: jest.fn(),
  runAppleHealthWorkoutPhysiologyDiagnostic: jest.fn(),
  runAppleHealthWorkoutPhysiologyEnrichment: jest.fn(async () => null),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(async () => ({ ok: true })),
  deleteIngestedRawEventAuthed: jest.fn(),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn().mockResolvedValue({ ok: true, json: {} }),
}));

jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: () => ({ energy: undefined, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: (...args: unknown[]) => mockUseWorkoutsCalendarRange(...args),
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS: ["workout", "strength_workout"],
  applyAuthoritativeWorkoutDeletionLocal: jest.fn(),
}));

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: {},
    saveOverride: jest.fn(),
    reload: jest.fn(),
  }),
  clearWorkoutOverride: jest.fn(),
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
  // InteractionManager intentionally omitted — overview uses runAfterInteractionsSafe
  // which falls back to synchronous execution when InteractionManager is undefined.
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    if (typeof cb === "function") cb();
  },
}));

const mockBackfill = runWorkoutHistoryBackfillPasses as jest.MockedFunction<
  typeof runWorkoutHistoryBackfillPasses
>;
const mockRecentRepair = runRecentWorkoutRepair as jest.MockedFunction<
  typeof runRecentWorkoutRepair
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

function emptyCalendar() {
  return {
    status: "ready",
    durableTitlesByWorkoutId: {},
    days: [
      { day: "2026-05-31", workouts: [] },
      { day: "2026-06-01", workouts: [] },
      { day: "2026-06-02", workouts: [] },
      { day: "2026-06-03", workouts: [] },
      { day: "2026-06-04", workouts: [] },
      { day: "2026-06-05", workouts: [] },
      { day: "2026-06-06", workouts: [] },
    ],
  };
}

beforeEach(() => {
  g.__recentRepairAh!.lastCheckedAt = null;
  g.__recentRepairAh!.deepBackfillVersion = null;
  g.__recentRepairAh!.workoutsRecentRepairLastRunAt = null;
  jest.clearAllMocks();
  mockUseWorkoutsCalendarRange.mockReturnValue(emptyCalendar());
  mockBackfill.mockResolvedValue({
    ok: true,
    passesRun: 1,
    mayHaveMoreWorkouts: false,
    bootstrap: MOCK_EMPTY_BOOTSTRAP,
  });
  mockRecentRepair.mockResolvedValue({
    status: "ran",
    startDay: "2026-05-20",
    endDay: "2026-06-02",
    daysRequested: 14,
    hkWorkoutCount: 0,
    ingestedCount: 0,
    failedCount: 0,
    durationMs: 12,
    reason: "focus",
    latestNativeWorkoutStart: null,
  });
});

it("invokes recent workout repair on focus even when needsDeepBackfill=false (v14-physiology already completed)", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  g.__recentRepairAh!.deepBackfillVersion = "v14-physiology";
  g.__recentRepairAh!.lastCheckedAt = new Date().toISOString(); // anchored throttle would normally skip

  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  // Two ticks: first to land focus + maybeAutoAppleSync, second to flush the
  // fire-and-forget runAfterInteractionsSafe(...) IIFE that schedules repair.
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockRecentRepair).toHaveBeenCalled();
  const [opts] = mockRecentRepair.mock.calls[0]!;
  expect(opts.uid).toBe("test-uid");
  expect(opts.token).toBe("id-token");
  expect(opts.reason).toBe("focus");
});

it("repair fires independently of anchored sync (still runs when anchored sync is throttled by APPLE_AUTO_MIN_MS)", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  // v14-physiology completed AND lastCheckedAt is fresh → anchored sync should be throttled.
  g.__recentRepairAh!.deepBackfillVersion = "v14-physiology";
  g.__recentRepairAh!.lastCheckedAt = new Date().toISOString();

  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  // Anchored sync should have been skipped (throttle).
  expect(mockBackfill).not.toHaveBeenCalled();
  // But repair still fires.
  expect(mockRecentRepair).toHaveBeenCalled();
});

it("repair fires alongside anchored sync when needsDeepBackfill=true (independent path)", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  g.__recentRepairAh!.deepBackfillVersion = null; // forces needsDeepBackfill = true

  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockBackfill).toHaveBeenCalled();
  expect(mockRecentRepair).toHaveBeenCalled();
});
