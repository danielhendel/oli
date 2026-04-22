import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert } from "react-native";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockSaveOverride = jest.fn(async () => undefined);
const mockClearWorkoutOverride = jest.fn(async () => undefined);
const mockDeleteIngestedRawEventAuthed = jest.fn(async () => ({
  ok: true as const,
  status: 200 as const,
  data: { ok: true as const, rawEventId: "w1", requestId: "rid", suppressionWritten: false },
  requestId: "rid" as string | null,
}));
let mockOverridesState: Record<string, unknown> = {};

jest.mock("@/lib/api/usersMe", () => ({
  getWorkoutMonthSummaries: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    requestId: null,
    json: {
      year: 2026,
      expectedMonthCount: 12,
      complete: true,
      items: Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return {
          schemaVersion: 1,
          monthKey: `2026-${String(m).padStart(2, "0")}`,
          computedAt: "2026-01-01T00:00:00.000Z",
          reconcileVersion: "0",
          strengthSessionCount: 0,
          cardioSessionCount: 0,
          strengthWeekKeys: [],
          cardioWeekKeys: [],
          strengthDurationSumCapped: 0,
          strengthDurationCountCapped: 0,
          cardioDurationSumCapped: 0,
          cardioDurationCountCapped: 0,
        };
      }),
    },
  }),
  postWorkoutMonthSummariesRebuild: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    requestId: null,
    json: { year: 2026, monthsProcessed: 12 },
  }),
}));

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

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => {
  const actual = jest.requireActual<typeof import("@/lib/data/workouts/useWorkoutsCalendar")>(
    "@/lib/data/workouts/useWorkoutsCalendar",
  );
  const applyAuthoritativeWorkoutDeletionLocal = jest.fn();
  return {
    ...actual,
    useWorkoutsCalendarRange: jest.fn(),
    applyAuthoritativeWorkoutDeletionLocal,
  };
});

const mockedWorkoutCal = jest.requireMock<typeof import("@/lib/data/workouts/useWorkoutsCalendar")>(
  "@/lib/data/workouts/useWorkoutsCalendar",
);
const useWorkoutsCalendarRange = jest.mocked(mockedWorkoutCal.useWorkoutsCalendarRange);
const applyDeletionMock = jest.mocked(mockedWorkoutCal.applyAuthoritativeWorkoutDeletionLocal);

// `require` after mocks so the screen binds to the mocked `applyAuthoritativeWorkoutDeletionLocal`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TrainingOverviewScreen: typeof import("../overview").default = require("../overview").default;

const DEFAULT_WORKOUTS_CALENDAR_RANGE = {
  status: "ready" as const,
  durableTitlesByWorkoutId: {},
  days: [
    { day: "2026-03-09", workouts: [] },
    {
      day: "2026-03-10",
      workouts: [
        {
          id: "w1",
          provider: "manual",
          observedAt: "2026-03-10T10:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T10:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w2",
          provider: "manual",
          observedAt: "2026-03-10T09:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T09:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w3",
          provider: "manual",
          observedAt: "2026-03-10T08:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w4",
          provider: "manual",
          observedAt: "2026-03-10T07:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T07:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w5",
          provider: "manual",
          observedAt: "2026-03-10T06:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T06:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w6",
          provider: "manual",
          observedAt: "2026-03-10T05:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T05:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w7",
          provider: "manual",
          observedAt: "2026-03-10T04:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T04:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
        {
          id: "w8",
          provider: "manual",
          observedAt: "2026-03-10T03:00:00.000Z",
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength",
          start: "2026-03-10T03:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: 200,
          rawKind: "strength_workout",
          isDeletableRawEvent: true,
        },
      ],
    },
  ],
};

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-10",
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

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  clearWorkoutOverride: (...args: unknown[]) => mockClearWorkoutOverride(...args),
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: mockOverridesState,
    saveOverride: mockSaveOverride,
    reload: jest.fn(async () => undefined),
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
    DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 1,
  };
});

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: jest.fn(async () => null),
  setLastSyncAt: jest.fn(async () => undefined),
  getAppleHealthLastCheckedAt: jest.fn(async () => null),
  setAppleHealthLastCheckedAt: jest.fn(async () => undefined),
  getAppleHealthDeepBackfillVersion: jest.fn(async () => "v13m"),
  setAppleHealthDeepBackfillVersion: jest.fn(async () => undefined),
  getAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => "oli-wb-v2-2026-03-21"),
  setAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  clearAppleHealthWorkoutRangeBootstrapBuild: jest.fn(async () => undefined),
  getAppleHealthConnected: jest.fn(async () => true),
  getAppleHealthNotAvailable: jest.fn(async () => false),
  setAppleHealthNotAvailable: jest.fn(async () => undefined),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
  deleteIngestedRawEventAuthed: (...args: unknown[]) => mockDeleteIngestedRawEventAuthed(...args),
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

async function mountTrainingOverview(): Promise<renderer.ReactTestRenderer> {
  let test!: renderer.ReactTestRenderer;
  await act(async () => {
    test = renderer.create(<TrainingOverviewScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return test;
}

describe("overview workout actions", () => {
  beforeEach(() => {
    mockOverridesState = {};
    jest.clearAllMocks();
    applyDeletionMock.mockImplementation(() => undefined);
    jest.mocked(useWorkoutsCalendarRange).mockReturnValue(DEFAULT_WORKOUTS_CALENDAR_RANGE as never);
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: true as const,
      status: 200 as const,
      data: { ok: true as const, rawEventId: "w1", requestId: "rid", suppressionWritten: false },
      requestId: "rid" as string | null,
    });
  });

  it("view details keeps day navigation", async () => {
    const test = await mountTrainingOverview();
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

  it("tapping recent row opens workout day details", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Open workout details w1" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-10" },
    });
  });

  it("opens contextual menu with all expected actions and dismisses on outside tap", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    expect(test.root.findByProps({ accessibilityLabel: "View details" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Do it again" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Rename workout" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Edit duration" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Edit workout type" })).toBeTruthy();
    expect(test.root.findByProps({ accessibilityLabel: "Delete workout" })).toBeTruthy();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Close workout menu" }).props.onPress();
    });
    expect(test.root.findAllByProps({ accessibilityLabel: "View details" })).toHaveLength(0);
  });

  it("row subtitle shows duration only and keeps source hidden", async () => {
    const test = await mountTrainingOverview();
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("20 min");
    expect(json).not.toContain("Apple Health");
    expect(json).not.toContain("Manual");
  });

  it("lists all strength-tab sessions in the local calendar week on the overview (earliest first)", async () => {
    const test = await mountTrainingOverview();
    const rowButtons = test.root.findAll(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.startsWith("Open workout details "),
    );
    expect(rowButtons).toHaveLength(8);
  });

  it("fifth visible row (earliest-first order) still supports row tap and action menu", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Open workout details w4" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-10" },
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w4" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Edit workout type" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/type",
      params: expect.objectContaining({ workoutId: "w4" }),
    });
  });

  it("rename action navigates to dedicated edit screen", async () => {
    const test = await mountTrainingOverview();
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
    const test = await mountTrainingOverview();

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

  it("delete workout requires confirmation and calls delete with the selected workout id", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w4" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    expect(mockDeleteIngestedRawEventAuthed).not.toHaveBeenCalled();

    expect(test.root.findByProps({ accessibilityLabel: "Confirm delete workout" })).toBeTruthy();

    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });

    expect(mockDeleteIngestedRawEventAuthed).toHaveBeenCalledWith("w4", "token");
    expect(mockClearWorkoutOverride).toHaveBeenCalledWith("w4");
    expect(applyDeletionMock).toHaveBeenCalledWith("u1", "w4");
    expect(jest.mocked(Alert.alert)).not.toHaveBeenCalled();
  });

  it("delete 404 still evicts locally and does not show a blocking failure alert", async () => {
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: true as const,
      status: 404 as const,
      data: {
        ok: true as const,
        rawEventId: "w2",
        requestId: "rid-404",
        suppressionWritten: false,
      },
      requestId: "rid-404" as string | null,
    });
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w2" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });
    expect(applyDeletionMock).toHaveBeenCalledWith("u1", "w2");
    expect(jest.mocked(Alert.alert)).not.toHaveBeenCalled();
  });

  it("delete HTTP 500 does not evict locally and shows an error alert", async () => {
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: false as const,
      status: 500,
      requestId: "rid-500",
      kind: "http",
      error: "HTTP 500",
    });
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w6" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });
    expect(applyDeletionMock).not.toHaveBeenCalled();
    expect(jest.mocked(Alert.alert)).toHaveBeenCalled();
  });

  it("delete HTTP 401 does not evict locally and does not show an error alert", async () => {
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: false as const,
      status: 401,
      requestId: "rid-401",
      kind: "http",
      error: "Unauthorized",
    });
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w7" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });
    expect(applyDeletionMock).not.toHaveBeenCalled();
    expect(jest.mocked(Alert.alert)).not.toHaveBeenCalled();
  });

  it("delete 403 does not evict locally and shows an error alert", async () => {
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: false as const,
      status: 403,
      requestId: "rid-403",
      kind: "http",
      error: "Forbidden",
    });
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w3" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });
    expect(applyDeletionMock).not.toHaveBeenCalled();
    expect(jest.mocked(Alert.alert)).toHaveBeenCalled();
  });

  it("delete network failure does not evict locally", async () => {
    mockDeleteIngestedRawEventAuthed.mockResolvedValue({
      ok: false as const,
      status: 0,
      requestId: null,
      kind: "network",
      error: "offline",
    });
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w5" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ accessibilityLabel: "Confirm delete workout" }).props.onPress();
      await Promise.resolve();
    });
    expect(applyDeletionMock).not.toHaveBeenCalled();
    expect(jest.mocked(Alert.alert)).toHaveBeenCalled();
  });

  it("cancel on delete confirmation does not call delete", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Cancel delete workout" }).props.onPress();
    });
    expect(mockDeleteIngestedRawEventAuthed).not.toHaveBeenCalled();
  });

  it("shows Delete Workout for Apple Health imports when raw-events list omitted provider (sourceId healthkit only)", async () => {
    jest.mocked(useWorkoutsCalendarRange).mockReturnValue({
      status: "ready",
      durableTitlesByWorkoutId: {},
      days: [
        {
          day: "2026-03-09",
          workouts: [],
        },
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "hk1",
              observedAt: "2026-03-10T10:00:00.000Z",
              sourceId: "healthkit",
              rawKind: "strength_workout",
              isDeletableRawEvent: true,
              title: "Strength",
              workoutType: "strength",
              start: "2026-03-10T10:00:00.000Z",
              end: null,
              durationMinutes: 45,
              calories: null,
            },
          ],
        },
      ],
    } as never);

    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions hk1" }).props.onPress();
    });
    expect(test.root.findByProps({ accessibilityLabel: "Delete workout" })).toBeTruthy();
  });

  it("shows Delete Workout for manual rows when provider field omitted (sourceId manual only)", async () => {
    jest.mocked(useWorkoutsCalendarRange).mockReturnValue({
      status: "ready",
      durableTitlesByWorkoutId: {},
      days: [
        { day: "2026-03-09", workouts: [] },
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "md1",
              observedAt: "2026-03-10T11:00:00.000Z",
              sourceId: "manual",
              rawKind: "strength_workout",
              isDeletableRawEvent: true,
              title: "Lift",
              workoutType: "strength",
              start: "2026-03-10T11:00:00.000Z",
              end: null,
              durationMinutes: 30,
              calories: null,
            },
          ],
        },
      ],
    } as never);

    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions md1" }).props.onPress();
    });
    expect(test.root.findByProps({ accessibilityLabel: "Delete workout" })).toBeTruthy();
  });

  it("hides Delete Workout when row is not hydrate-backed (isDeletableRawEvent unset)", async () => {
    jest.mocked(useWorkoutsCalendarRange).mockReturnValue({
      status: "ready",
      durableTitlesByWorkoutId: {},
      days: [
        { day: "2026-03-09", workouts: [] },
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "ghost",
              provider: "manual",
              observedAt: "2026-03-10T12:00:00.000Z",
              sourceId: "manual",
              rawKind: "strength_workout",
              title: "Synthetic",
              workoutType: "strength",
              start: "2026-03-10T12:00:00.000Z",
              end: null,
              durationMinutes: 30,
              calories: null,
            },
          ],
        },
      ],
    } as never);

    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions ghost" }).props.onPress();
    });
    expect(() => test.root.findByProps({ accessibilityLabel: "Delete workout" })).toThrow();
  });

  it("hides Delete Workout for unsupported workout providers", async () => {
    jest.mocked(useWorkoutsCalendarRange).mockReturnValue({
      status: "ready",
      durableTitlesByWorkoutId: {},
      days: [
        {
          day: "2026-03-09",
          workouts: [],
        },
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "vx1",
              provider: "vendor_xyz",
              observedAt: "2026-03-10T10:00:00.000Z",
              sourceId: "vendor_xyz",
              rawKind: "strength_workout",
              title: "Strength",
              workoutType: "strength",
              start: "2026-03-10T10:00:00.000Z",
              end: null,
              durationMinutes: 45,
              calories: null,
            },
          ],
        },
      ],
    } as never);

    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions vx1" }).props.onPress();
    });
    expect(() => test.root.findByProps({ accessibilityLabel: "Delete workout" })).toThrow();
  });

  it("delete confirmation copy describes removing from Oli (not Apple Health source deletion)", async () => {
    const test = await mountTrainingOverview();
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Workout actions w1" }).props.onPress();
    });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress();
    });
    const body = test.root.findByProps({ accessibilityLabel: "Delete workout confirmation body" });
    expect(String(body.props.children)).toContain("from Oli");
    expect(String(body.props.children)).not.toContain("Apple Health");
  });
});
