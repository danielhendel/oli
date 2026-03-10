/**
 * Invariant: when runAnchoredWorkoutsSync returns ok: true, lastSyncAt must be updated.
 * Overview calls setLastSyncAt(nowIso) after successful sync.
 */
import React, { act } from "react";
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import TrainingOverviewScreen from "../overview";
import { runAnchoredWorkoutsSync } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import * as storage from "@/lib/integrations/appleHealth/storage";

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

jest.mock("@/lib/integrations/appleHealth/runAnchoredWorkoutsSync", () => ({
  runAnchoredWorkoutsSync: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn().mockResolvedValue(null),
  setWorkoutsAnchor: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn(),
  setLastSyncAt: jest.fn().mockResolvedValue(undefined),
  getAppleHealthLastCheckedAt: jest.fn().mockImplementation(() => Promise.resolve(new Date().toISOString())),
  setAppleHealthLastCheckedAt: jest.fn().mockResolvedValue(undefined),
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
      isAvailable: (cb: (err: unknown, ok: boolean) => void) => cb(null, true),
    },
  },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    if (typeof cb === "function") cb();
  },
}));

const mockRunAnchoredWorkoutsSync = runAnchoredWorkoutsSync as jest.MockedFunction<typeof runAnchoredWorkoutsSync>;
const mockSetLastSyncAt = storage.setLastSyncAt as jest.MockedFunction<typeof storage.setLastSyncAt>;
const mockSetAppleHealthLastCheckedAt = storage.setAppleHealthLastCheckedAt as jest.MockedFunction<
  typeof storage.setAppleHealthLastCheckedAt
>;

beforeEach(() => {
  jest.clearAllMocks();
  (storage.getLastSyncAt as jest.Mock).mockResolvedValue(null);
  (storage.getAppleHealthLastCheckedAt as jest.Mock).mockResolvedValue(new Date().toISOString());
  (storage.getAppleHealthConnected as jest.Mock).mockResolvedValue(true);
  mockRunAnchoredWorkoutsSync.mockResolvedValue({ ok: true });
});

it("smart foreground sync: when lastCheckedAt is recent, runner is not called on focus", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  (storage.getAppleHealthLastCheckedAt as jest.Mock).mockResolvedValue(new Date().toISOString());
  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRunAnchoredWorkoutsSync).not.toHaveBeenCalled();
});

it("smart foreground sync: when lastCheckedAt is old, runner is called and setAppleHealthLastCheckedAt is called", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  (storage.getAppleHealthLastCheckedAt as jest.Mock).mockResolvedValue(null);
  await act(async () => {
    renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRunAnchoredWorkoutsSync).toHaveBeenCalled();
  expect(mockSetAppleHealthLastCheckedAt).toHaveBeenCalled();
});

it("on successful sync calls setLastSyncAt with ISO string", async () => {
  allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  let root: ReturnType<typeof renderer.create>;
  await act(async () => {
    root = renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  const syncButton = root!.root.findByProps({ accessibilityLabel: "Sync now" });
  expect(syncButton).toBeDefined();
  await act(async () => {
    syncButton.props.onPress();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockRunAnchoredWorkoutsSync).toHaveBeenCalled();
  expect(mockSetLastSyncAt).toHaveBeenCalledTimes(1);
  const [iso] = mockSetLastSyncAt.mock.calls[0]!;
  expect(typeof iso).toBe("string");
  expect(() => new Date(iso).toISOString()).not.toThrow();
});

it("renders current gym label on overview (No gym when selectedGymId null)", async () => {
  let root: ReturnType<typeof renderer.create>;
  await act(async () => {
    root = renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  const treeStr = JSON.stringify(root!.toJSON());
  expect(treeStr).toContain("Gym");
  expect(treeStr).toContain("No gym");
});
