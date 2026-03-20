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

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => {
  const actual = jest.requireActual("@/lib/data/workouts/useWorkoutsCalendar");
  return {
    ...actual,
    useWorkoutsCalendarRange: (start: string) => {
      if (start === "2026-03-08") {
        return {
          status: "ready",
          days: [
            { day: "2026-03-08", workouts: [] },
            { day: "2026-03-09", workouts: [] },
          ],
        };
      }
      return {
        status: "ready",
        days: [
          { day: "2026-03-10", workouts: [] },
          {
            day: "2026-03-11",
            workouts: [
              {
                id: "w1",
                observedAt: "2026-03-11T10:00:00.000Z",
                sourceId: "manual",
                title: "Run",
                start: "2026-03-11T10:00:00.000Z",
                end: "2026-03-11T11:00:00.000Z",
                durationMinutes: 60,
                calories: 500,
              },
            ],
          },
        ],
      };
    },
    useWorkoutDayDetail: () => ({
      status: "ready",
      day: "2026-03-10",
      workouts: [],
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
  stepsIdempotencyKey: jest.fn(),
  workoutIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: jest.fn(),
  setWorkoutsAnchor: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/runWorkoutHistoryBackfill", () => ({
  runWorkoutHistoryBackfillPasses: jest.fn(async () => ({
    ok: true,
    passesRun: 1,
    mayHaveMoreWorkouts: false,
  })),
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES: 3,
}));

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

jest.mock("@/lib/workouts/gymRegistry", () => ({
  getGymLabel: () => "Any gym",
  getGymMenuOptions: () => [],
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

describe("Workouts calendar navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it("header calendar button navigates to workouts calendar", () => {
    act(() => {
      renderer.create(<TrainingOverviewScreen />);
    });

    // headerRight is injected via navigation.setOptions, not in the main tree
    const optionsArg = mockSetOptions.mock.calls[0]?.[0];
    expect(optionsArg).toBeDefined();
    const HeaderRight = optionsArg.headerRight;
    expect(typeof HeaderRight).toBe("function");

    let headerTree!: renderer.ReactTestRenderer;
    act(() => {
      headerTree = renderer.create(HeaderRight());
    });

    const btn = findByA11yLabel(headerTree.root, "Open workouts calendar");
    act(() => {
      btn.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/calendar");
  });

  it("weekly strip day press navigates to workout day", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TrainingOverviewScreen />);
    });

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

