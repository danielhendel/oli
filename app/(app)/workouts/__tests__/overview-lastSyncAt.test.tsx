/**
 * Invariant: when runAnchoredWorkoutsSync returns ok: true, lastSyncAt must be updated.
 * Overview calls setLastSyncAt(nowIso) after successful sync.
 */
import React, { act } from "react";

type AhThrottle = { lastCheckedAt: string | null };
const g = globalThis as unknown as { __overviewAhLastChecked?: AhThrottle };
g.__overviewAhLastChecked ??= { lastCheckedAt: null };
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import TrainingOverviewScreen from "../overview";
import { runWorkoutHistoryBackfillPasses } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import * as storage from "@/lib/integrations/appleHealth/storage";
import * as anchor from "@/lib/integrations/appleHealth/anchor";

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
  getTodayDayKeyLocal: () => "2026-03-07",
  getWeekDaysForAnchor: () =>
    [
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ] as const,
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn().mockResolvedValue(null),
  setWorkoutsAnchor: jest.fn().mockResolvedValue(undefined),
  clearWorkoutsAnchor: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn(),
  setLastSyncAt: jest.fn().mockResolvedValue(undefined),
  getAppleHealthLastCheckedAt: jest.fn(() =>
    Promise.resolve(
      (globalThis as unknown as { __overviewAhLastChecked: AhThrottle }).__overviewAhLastChecked
        .lastCheckedAt,
    ),
  ),
  setAppleHealthLastCheckedAt: jest.fn(async (iso: string) => {
    (globalThis as unknown as { __overviewAhLastChecked: AhThrottle }).__overviewAhLastChecked.lastCheckedAt =
      iso;
  }),
  getAppleHealthDeepBackfillVersion: jest.fn().mockResolvedValue(null),
  setAppleHealthDeepBackfillVersion: jest.fn().mockResolvedValue(undefined),
  getAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue("oli-wb-v2-2026-03-21"),
  setAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue(undefined),
  clearAppleHealthWorkoutRangeBootstrapBuild: jest.fn().mockResolvedValue(undefined),
  getAppleHealthConnected: jest.fn(),
  setAppleHealthConnected: jest.fn(),
  setAppleHealthNotAvailable: jest.fn(),
  getAppleHealthNotAvailable: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn().mockResolvedValue({ ok: true }),
  pullTodaySnapshot: jest.fn().mockResolvedValue({
    ok: true,
    data: {
      day: "2026-03-01",
      steps: 1000,
      exerciseMinutes: 30,
      activeEnergyKcal: 200,
      restingHeartRateBpm: 60,
      workouts: [],
    },
  }),
  pullAnchoredWorkouts: jest.fn().mockResolvedValue({
    ok: true,
    data: { workouts: [], anchor: "anchor-1" },
  }),
  pullWorkoutsByDateRange: jest.fn(),
  toHealthKitIso8601: (d: Date) => d.toISOString(),
  stepsIdempotencyKey: (day: string) => `steps:${day}`,
  workoutIdempotencyKey: () => "workout:key",
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "req-1",
    json: { ok: true, requestId: "req-1", connected: true, lastSyncAt: null },
  }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: () => ({ energy: undefined, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: jest.fn(() => ({
    status: "ready",
    durableTitlesByWorkoutId: {},
    days: [
      { day: "2026-03-01", workouts: [] },
      { day: "2026-03-02", workouts: [] },
      { day: "2026-03-03", workouts: [] },
      { day: "2026-03-04", workouts: [] },
      { day: "2026-03-05", workouts: [] },
      { day: "2026-03-06", workouts: [] },
      { day: "2026-03-07", workouts: [] },
    ],
  })),
}));
jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: {},
    saveOverride: jest.fn(),
    reload: jest.fn(),
  }),
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
      isAvailable: (cb: (err: unknown, ok: boolean) => void) => cb(null, true),
    },
  },
  AppState: {
    addEventListener: jest.fn((_evt: string, cb: (state: string) => void) => {
      (globalThis as unknown as { __ahAppStateCb?: (state: string) => void }).__ahAppStateCb = cb;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    if (typeof cb === "function") cb();
  },
}));

const mockRunBackfill = runWorkoutHistoryBackfillPasses as jest.MockedFunction<
  typeof runWorkoutHistoryBackfillPasses
>;
const mockGetDeepBackfillVersion = storage.getAppleHealthDeepBackfillVersion as jest.MockedFunction<
  typeof storage.getAppleHealthDeepBackfillVersion
>;
const mockSetAppleHealthLastCheckedAt = storage.setAppleHealthLastCheckedAt as jest.MockedFunction<
  typeof storage.setAppleHealthLastCheckedAt
>;
const mockClearWorkoutsAnchor = anchor.clearWorkoutsAnchor as jest.MockedFunction<
  typeof anchor.clearWorkoutsAnchor
>;
const mockClearRangeBootstrapBuild = storage.clearAppleHealthWorkoutRangeBootstrapBuild as jest.MockedFunction<
  typeof storage.clearAppleHealthWorkoutRangeBootstrapBuild
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
  g.__overviewAhLastChecked!.lastCheckedAt = new Date().toISOString();
  jest.clearAllMocks();
  (storage.getLastSyncAt as jest.Mock).mockResolvedValue(null);
  (storage.getAppleHealthConnected as jest.Mock).mockResolvedValue(true);
  mockGetDeepBackfillVersion.mockResolvedValue("v14-physiology");
  mockRunBackfill.mockResolvedValue({
    ok: true,
    passesRun: 1,
    mayHaveMoreWorkouts: false,
    bootstrap: MOCK_EMPTY_BOOTSTRAP,
  });
});

it("smart foreground sync: when lastCheckedAt is recent, runner is not called on focus", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  g.__overviewAhLastChecked!.lastCheckedAt = new Date().toISOString();
  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRunBackfill).not.toHaveBeenCalled();
});

it("smart foreground sync: when lastCheckedAt is old, runner is called and setAppleHealthLastCheckedAt is called", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  g.__overviewAhLastChecked!.lastCheckedAt = null;
  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRunBackfill).toHaveBeenCalled();
  expect(mockSetAppleHealthLastCheckedAt).toHaveBeenCalled();
});

it("runs backfill when deep backfill version is missing even if lastCheckedAt is recent", async () => {
  g.__overviewAhLastChecked!.lastCheckedAt = new Date().toISOString();
  mockGetDeepBackfillVersion.mockResolvedValueOnce(null).mockResolvedValue("v14-physiology");
  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRunBackfill).toHaveBeenCalled();
  expect(mockClearWorkoutsAnchor).toHaveBeenCalled();
  expect(mockClearRangeBootstrapBuild).toHaveBeenCalled();
});
