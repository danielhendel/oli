/**
 * After a successful workout backfill pass, overview bumps calendar refresh so
 * Recent Workouts can reflect newly ingested RawEvents (same adapter path).
 */
import React, { act } from "react";

type AhThrottle = { lastCheckedAt: string | null };
const g = globalThis as unknown as { __recentBackfillAh?: AhThrottle };
g.__recentBackfillAh ??= { lastCheckedAt: null };
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import TrainingOverviewScreen from "../overview";
import { runWorkoutHistoryBackfillPasses } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";

const mockUseWorkoutsCalendarRange = jest.fn();

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

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn(),
  setWorkoutsAnchor: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn().mockResolvedValue(null),
  setLastSyncAt: jest.fn().mockResolvedValue(undefined),
  getAppleHealthLastCheckedAt: jest.fn(() =>
    Promise.resolve(
      (globalThis as unknown as { __recentBackfillAh: AhThrottle }).__recentBackfillAh.lastCheckedAt,
    ),
  ),
  setAppleHealthLastCheckedAt: jest.fn(async (iso: string) => {
    (globalThis as unknown as { __recentBackfillAh: AhThrottle }).__recentBackfillAh.lastCheckedAt = iso;
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
      day: "2026-03-10",
      steps: null,
      exerciseMinutes: null,
      activeEnergyKcal: null,
      restingHeartRateBpm: null,
      workouts: [],
    },
  }),
  pullAnchoredWorkouts: jest.fn(),
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

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
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

beforeEach(() => {
  g.__recentBackfillAh!.lastCheckedAt = null;
  jest.clearAllMocks();
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
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
  mockBackfill.mockResolvedValue({ ok: true, passesRun: 1, mayHaveMoreWorkouts: false });
});

it("passes increasing refreshEpoch to useWorkoutsCalendarRange after successful backfill", async () => {
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
  const epochs = calls.map((c) => (c[2] as { refreshEpoch?: number } | undefined)?.refreshEpoch ?? 0);
  expect(Math.max(...epochs)).toBeGreaterThanOrEqual(1);
  expect(epochs[epochs.length - 1]).toBeGreaterThanOrEqual(epochs[0] ?? 0);
});

it("still shows recent workouts while calendar range is refreshing (stale-while-refresh)", async () => {
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
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

it("renders formatted recent workout title and summary metadata", async () => {
  mockUseWorkoutsCalendarRange.mockReturnValue({
    status: "ready",
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
  expect(json).toContain("45 min");
  expect(json).toContain("380 kcal");
  expect(json).toContain("Apple Health");
});
