import React from "react";
import renderer, { act } from "react-test-renderer";
import TrainingOverviewScreen from "../overview";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockSaveOverride = jest.fn(async () => undefined);
let mockOverridesState: Record<string, unknown> = {};

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(async () => "token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { selectedGymId: null } },
    setSelectedGymId: jest.fn(),
  }),
}));

jest.mock("@/lib/workouts/gymRegistry", () => ({
  getGymMenuOptions: () => [],
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutsCalendarRange: () => ({
    status: "ready",
    days: [
      { day: "2026-03-09", workouts: [] },
      {
        day: "2026-03-10",
        workouts: [
          { id: "w1", observedAt: "2026-03-10T10:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T10:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w2", observedAt: "2026-03-10T09:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T09:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w3", observedAt: "2026-03-10T08:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T08:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w4", observedAt: "2026-03-10T07:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T07:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w5", observedAt: "2026-03-10T06:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T06:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w6", observedAt: "2026-03-10T05:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T05:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w7", observedAt: "2026-03-10T04:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T04:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
          { id: "w8", observedAt: "2026-03-10T03:00:00.000Z", sourceId: "manual", title: "Running", workoutType: "cardio", start: "2026-03-10T03:00:00.000Z", end: null, durationMinutes: 20, calories: 200 },
        ],
      },
    ],
  }),
}));

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: mockOverridesState,
    saveOverride: mockSaveOverride,
    reload: jest.fn(),
  }),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  pullTodaySnapshot: jest.fn(async () => ({
    ok: true,
    data: {
      day: "2026-03-10",
      steps: 12000,
      exerciseMinutes: 75,
      activeEnergyKcal: 2345,
      restingHeartRateBpm: 1234,
      workouts: [],
    },
  })),
  pullAnchoredWorkouts: jest.fn(),
  stepsIdempotencyKey: jest.fn(),
  workoutIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn(),
  setWorkoutsAnchor: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(async () => ({ ok: true })),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 1,
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn(async () => null),
  setLastSyncAt: jest.fn(async () => undefined),
  getAppleHealthLastCheckedAt: jest.fn(async () => null),
  setAppleHealthLastCheckedAt: jest.fn(async () => undefined),
  getAppleHealthConnected: jest.fn(async () => true),
  getAppleHealthNotAvailable: jest.fn(async () => false),
  setAppleHealthNotAvailable: jest.fn(async () => undefined),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  TextInput: "TextInput",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios" },
  NativeModules: {},
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

describe("overview workout actions", () => {
  beforeEach(() => {
    mockOverridesState = {};
    jest.clearAllMocks();
  });

  it("view details keeps day navigation", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    const openActions = test.root.findByProps({ accessibilityLabel: "Workout actions w1" });
    act(() => {
      openActions.props.onPress();
    });
    const viewDetails = test.root.findByProps({ accessibilityLabel: "View details" });
    act(() => {
      viewDetails.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-10" },
    });
  });

  it("tapping recent row opens workout day details", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Open workout details w1" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-10" },
    });
  });

  it("opens contextual menu with all expected actions and dismisses on outside tap", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    expect(test.root.findByProps({ accessibilityLabel: "View details" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Do it again" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Rename workout" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Edit duration" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Edit workout type" })).toBeTruthy();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Close workout menu" }).props.onPress();
    });
    expect(test.root.findAllByProps({ accessibilityLabel: "View details" })).toHaveLength(0);
  });

  it("row subtitle shows duration only and keeps source hidden", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("20 min");
    expect(json).not.toContain("Apple Health");
    expect(json).not.toContain("Manual");
  });

  it("caps recent workouts list to 7 rows", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    const rowButtons = test.root.findAll(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.startsWith("Open workout details "),
    );
    expect(rowButtons).toHaveLength(7);
  });

  it("lower row still supports row tap and action menu", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Open workout details w7" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-10" },
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w7" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Edit workout type" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/type",
      params: expect.objectContaining({ workoutId: "w7" }),
    });
  });

  it("rename action navigates to dedicated edit screen", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<TrainingOverviewScreen />);
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Rename workout" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/rename",
      params: expect.objectContaining({ workoutId: "w1" }),
    });
  });

  it("duration and type actions navigate to dedicated edit screens", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<TrainingOverviewScreen />);
    });

    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Edit duration" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/duration",
      params: expect.objectContaining({ workoutId: "w1" }),
    });

    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Edit workout type" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/type",
      params: expect.objectContaining({ workoutId: "w1" }),
    });
  });
});
