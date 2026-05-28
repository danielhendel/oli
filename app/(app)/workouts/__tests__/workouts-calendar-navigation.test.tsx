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
          reconcileVersion: "1",
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

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    mergeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
    getAllKeys: jest.fn(async () => []),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => undefined),
    multiRemove: jest.fn(async () => undefined),
  },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}));
const mockUseWorkoutsCalendarRange = jest.fn();

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockGoBack,
  }),
  useLocalSearchParams: mockUseLocalSearchParams,
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useFocusEffect: jest.fn(),
  Stack: {
    Screen: () => null,
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import React from "react";
import renderer, { act } from "react-test-renderer";
import TrainingOverviewScreen from "../overview";
import WorkoutsCalendarScreen from "../calendar";
import WorkoutDayScreen from "../day/[day]";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: async () => "token",
  }),
}));

jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: () => ({ energy: undefined, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => {
  const actual = jest.requireActual("@/lib/data/workouts/useWorkoutsCalendar");
  return {
    ...actual,
    useWorkoutsCalendarRange: (...args: unknown[]) => mockUseWorkoutsCalendarRange(...args),
    useWorkoutDayDetail: () => ({
      status: "ready",
      day: "2026-03-10",
      workouts: [],
      durableTitlesByWorkoutId: {},
    }),
  };
});

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: {},
    saveOverride: jest.fn(),
    reload: jest.fn(),
  }),
}));
jest.mock("@/lib/workouts/journal/manualWorkoutSummary", () => ({
  listManualWorkoutDaySummaries: jest.fn(async () => []),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn(async () => ({ ok: false, error: "not used" })),
  pullTodaySnapshot: jest.fn(async () => ({ ok: true, data: { day: "2026-03-10", steps: null, exerciseMinutes: null, activeEnergyKcal: null, restingHeartRateBpm: null, workouts: [] } })),
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

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn(async () => ({ ok: true, json: { lastSyncAt: null } })),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { selectedGymId: null } },
    setSelectedGymId: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-03-12",
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

jest.mock("@/lib/workouts/gymRegistry", () => ({
  getGymLabel: () => "Any gym",
  getGymMenuOptions: () => [],
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  TextInput: "TextInput",
  Alert: { alert: jest.fn() },
  FlatList: ({
    data,
    renderItem,
    ListHeaderComponent,
    ListFooterComponent,
  }: {
    data: unknown[];
    renderItem: (args: { item: unknown; index: number }) => React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    ListFooterComponent?: React.ReactNode;
  }) => {
    const ReactLocal = require("react") as typeof React;
    const safeData = Array.isArray(data) ? data : [];
    const sampledItems = safeData.slice(0, 2);
    const marchItem = safeData.find(
      (it) =>
        !!it &&
        typeof it === "object" &&
        "key" in (it as Record<string, unknown>) &&
        (it as { key?: string }).key === "2026-03",
    );
    if (marchItem) sampledItems.push(marchItem);
    return ReactLocal.createElement(
      "View",
      null,
      ListHeaderComponent ?? null,
      sampledItems.length > 0
        ? sampledItems.map((item, index) =>
            ReactLocal.createElement("View", { key: index }, renderItem({ item, index })),
          )
        : null,
      ListFooterComponent ?? null,
    );
  },
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: "ios" },
  NativeModules: {},
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

function getNodeText(node: renderer.ReactTestInstance): string {
  const { children } = node.props;
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (child && typeof child === "object") {
          return getNodeText(child as renderer.ReactTestInstance);
        }
        return "";
      })
      .join("");
  }
  if (children && typeof children === "object") {
    return getNodeText(children as renderer.ReactTestInstance);
  }
  return "";
}

function findByA11yLabel(root: renderer.ReactTestRenderer["root"], label: string) {
  return root.find(
    (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel === label,
  );
}

/** Month-summary fetch resolves on a microtask; flush so console discipline does not see stray act() warnings. */
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

describe("Workouts calendar navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseWorkoutsCalendarRange.mockImplementation((start: string, end: string) => {
      // Workouts overview uses one shared range ending on the fixed analytics year (2026-12-31).
      if (end === "2026-12-31") {
        return {
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
                  id: "w1",
                  observedAt: "2026-03-11T10:00:00.000Z",
                  sourceId: "manual",
                  title: "Strength Training",
                  workoutType: "strength" as const,
                  start: "2026-03-11T10:00:00.000Z",
                  end: "2026-03-11T11:00:00.000Z",
                  durationMinutes: 60,
                  calories: 500,
                },
              ],
            },
            { day: "2026-03-12", workouts: [] },
            { day: "2026-03-13", workouts: [] },
            { day: "2026-03-14", workouts: [] },
          ],
        };
      }
      return {
        status: "ready",
        durableTitlesByWorkoutId: {},
        days: [
          { day: "2026-03-10", workouts: [] },
          {
            day: "2026-03-11",
            workouts: [
              {
                id: "w1",
                observedAt: "2026-03-11T10:00:00.000Z",
                sourceId: "manual",
                title: "Strength Training",
                workoutType: "strength" as const,
                start: "2026-03-11T10:00:00.000Z",
                end: "2026-03-11T11:00:00.000Z",
                durationMinutes: 60,
                calories: 500,
              },
            ],
          },
        ],
      };
    });
  });

  it("header calendar button navigates to workouts calendar", async () => {
    await mountTrainingOverview();

    // headerRight is injected via navigation.setOptions, not in the main tree
    const optionsArg = mockSetOptions.mock.calls[0]?.[0];
    expect(optionsArg).toBeDefined();
    const HeaderRight = optionsArg.headerRight;
    expect(typeof HeaderRight).toBe("function");

    let headerTree!: renderer.ReactTestRenderer;
    act(() => {
      headerTree = renderer.create(HeaderRight());
    });

    const btn = findByA11yLabel(headerTree.root, "Open strength calendar");
    act(() => {
      btn.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/calendar");
  });

  it("weekly strip day press navigates to workout day", async () => {
    const test = await mountTrainingOverview();

    const dayBtn = findByA11yLabel(test.root, "2026-03-11, has workouts");
    act(() => {
      dayBtn.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-11" },
    });
  });

  it("month grid day press navigates to workout day", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutsCalendarScreen />);
    });

    const btn = findByA11yLabel(test.root, "2026-03-11, has workouts");
    act(() => {
      btn.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/day/[day]",
      params: { day: "2026-03-11" },
    });
  });

  it("calendar partial state renders month grid without full-screen loading gate", () => {
    mockUseWorkoutsCalendarRange.mockReturnValue({ status: "partial" });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutsCalendarScreen />);
    });
    const textNodes = test.root.findAll((n) => typeof n.props?.children === "string");
    expect(
      textNodes.some((n) => String(n.props.children).includes("Loading workouts calendar")),
    ).toBe(false);
    expect(textNodes.some((n) => String(n.props.children) === "Sun")).toBe(true);
  });

  it("calendar transitions from loading to ready without hook-order crash", () => {
    const state = { current: { status: "partial" as const } };
    mockUseWorkoutsCalendarRange.mockImplementation(() => state.current);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutsCalendarScreen />);
    });
    state.current = {
      status: "ready",
      durableTitlesByWorkoutId: {},
      days: [
        { day: "2026-03-10", workouts: [] },
        {
          day: "2026-03-11",
          workouts: [
            {
              id: "w1",
              observedAt: "2026-03-11T10:00:00.000Z",
              sourceId: "manual",
              title: "Strength Training",
              workoutType: "strength" as const,
              start: "2026-03-11T10:00:00.000Z",
              end: "2026-03-11T11:00:00.000Z",
              durationMinutes: 60,
              calories: 500,
            },
          ],
        },
      ],
    };
    act(() => {
      test.update(<WorkoutsCalendarScreen />);
    });
    const button = findByA11yLabel(test.root, "2026-03-11, has workouts");
    expect(button).toBeTruthy();
  });

  it("renders continuous month view with no arrow controls or Today jump button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutsCalendarScreen />);
    });

    const today = test.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel === "Go to current month",
    );
    expect(today).toHaveLength(0);

    const prev = test.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel === "Previous month",
    );
    const next = test.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel === "Next month",
    );
    expect(prev).toHaveLength(0);
    expect(next).toHaveLength(0);
  });

  it("day detail renders without error for valid day", () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "2026-03-10" });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });
    const nodesWithDayStateTitle = test.root.findAll(
      (n) =>
        typeof getNodeText(n) === "string" &&
        (getNodeText(n).includes("No workouts for this day") ||
          getNodeText(n).includes("Invalid day parameter")),
    );
    expect(nodesWithDayStateTitle.length).toBeGreaterThan(0);
  });

});

