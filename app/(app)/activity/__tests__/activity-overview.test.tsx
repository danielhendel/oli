import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRouterPush = jest.fn();
const mockSetSelectedDay = jest.fn();

const defaultOverviewData = {
  user: { uid: "u1" },
  initializing: false,
  selectedDay: "2026-04-06",
  setSelectedDay: mockSetSelectedDay,
  weeklyStripDays: [
    { day: "2026-04-05", meta: { hasSteps: false } },
    { day: "2026-04-06", meta: { hasSteps: true } },
    { day: "2026-04-07", meta: { hasSteps: false } },
    { day: "2026-04-08", meta: { hasSteps: false } },
    { day: "2026-04-09", meta: { hasSteps: false } },
    { day: "2026-04-10", meta: { hasSteps: false } },
    { day: "2026-04-11", meta: { hasSteps: false } },
  ],
  stepsRollup: { status: "ready" as const, rollupByDay: {}, refetch: jest.fn() },
  overview: {
    loading: false,
    error: null,
    model: {
      timeframes: [
        {
          key: "today" as const,
          label: "Today",
          compactStatsSummary: "5,000 steps",
          markerPosition01: 0.4,
        },
        {
          key: "avg7d" as const,
          label: "7D Avg",
          compactStatsSummary: "3,000/day",
          markerPosition01: 0.25,
        },
        {
          key: "avg30d" as const,
          label: "30D Avg",
          compactStatsSummary: "2,000/day",
          markerPosition01: 0.17,
        },
        {
          key: "avg365d" as const,
          label: "365D Avg",
          compactStatsSummary: "4,000/day",
          markerPosition01: 0.33,
        },
      ],
    },
  },
  dailyDetails: {
    loading: false,
    error: null,
    model: {
      title: "Sun 4/6",
      compactStatsSummary: "1,234 steps",
      markerPosition01: 0.12,
    },
  },
};

const mockUseActivityOverviewScreenData = jest.fn(() => defaultOverviewData);

let navigationOptions: { headerRight?: () => React.ReactElement; headerLeft?: () => React.ReactElement } = {};

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    setOptions: (opts: typeof navigationOptions) => {
      navigationOptions = opts;
    },
    goBack: jest.fn(),
  }),
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(),
  }),
}));

jest.mock("@/lib/data/activity/useActivityOverviewScreenData", () => ({
  useActivityOverviewScreenData: () => mockUseActivityOverviewScreenData(),
}));

import ActivityOverviewScreen from "../index";

function findStripDayPressable(root: renderer.ReactTestRenderer["root"], dayKey: string) {
  const label = `${dayKey},`;
  const nodes = root.findAll(
    (n) =>
      typeof n.props?.accessibilityLabel === "string" &&
      n.props.accessibilityRole === "button" &&
      (n.props.accessibilityLabel as string).startsWith(label),
  );
  const hit = nodes[0];
  if (hit == null) {
    throw new Error(`No weekly strip cell found for day ${dayKey}`);
  }
  return hit;
}

describe("ActivityOverviewScreen", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockSetSelectedDay.mockClear();
    mockUseActivityOverviewScreenData.mockImplementation(() => defaultOverviewData);
    navigationOptions = {};
  });

  it("header exposes calendar and settings routes via HeaderControls", async () => {
    await act(async () => {
      renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    expect(navigationOptions.headerRight).toBeDefined();
    expect(navigationOptions.headerLeft).toBeDefined();
    let header!: renderer.ReactTestRenderer;
    await act(async () => {
      header = renderer.create(navigationOptions.headerRight!());
    });
    const calendar = header.root.findByProps({ accessibilityLabel: "Open activity calendar" });
    expect(calendar).toBeDefined();
    await act(async () => {
      calendar.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/calendar");
    mockRouterPush.mockClear();
    const overflow = header.root.findByProps({ accessibilityLabel: "Activity settings" });
    await act(async () => {
      overflow.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/settings");
  });

  it("renders Overview and Daily details cards with trailing averages", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Overview");
    expect(str).toContain("Daily details");
    expect(str).toContain("5,000 steps");
    expect(str).toContain("3,000/day");
    expect(str).toContain("2,000/day");
    expect(str).toContain("4,000/day");
    expect(str).toContain("1,234 steps");
    expect(str).not.toMatch(/\d+ steps · \d/);
    expect(str).toContain("activity-overview-steps-bar-today");
    expect(str).toContain("activity-overview-steps-bar-avg365d");
    expect(str).toContain("activity-daily-details-steps-bar");
  });

  it("tapping a weekly strip day pushes activity day detail with local YYYY-MM-DD param", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const cell = findStripDayPressable(tree.root, "2026-04-07");
    await act(async () => {
      cell.props.onPress();
    });
    expect(mockSetSelectedDay).toHaveBeenCalledWith("2026-04-07");
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/(app)/activity/day/[day]",
      params: { day: "2026-04-07" },
    });
  });

  it("strip selection uses the same day key string as the calendar and day route (zero-padded month/day)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const cell = findStripDayPressable(tree.root, "2026-04-05");
    expect(cell.props.accessibilityLabel).toMatch(/^2026-04-05,/);
    await act(async () => {
      cell.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/(app)/activity/day/[day]",
      params: { day: "2026-04-05" },
    });
  });

  it("navigates to day detail for the strip day marked as today and for a non-today strip day", async () => {
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      selectedDay: "2026-04-10",
      weeklyStripDays: [
        { day: "2026-04-05", meta: { hasSteps: false } },
        { day: "2026-04-10", meta: { hasSteps: true } },
      ],
    }));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });

    await act(async () => {
      findStripDayPressable(tree.root, "2026-04-10").props.onPress();
    });
    expect(mockRouterPush).toHaveBeenLastCalledWith({
      pathname: "/(app)/activity/day/[day]",
      params: { day: "2026-04-10" },
    });

    mockRouterPush.mockClear();
    mockSetSelectedDay.mockClear();

    await act(async () => {
      findStripDayPressable(tree.root, "2026-04-05").props.onPress();
    });
    expect(mockRouterPush).toHaveBeenLastCalledWith({
      pathname: "/(app)/activity/day/[day]",
      params: { day: "2026-04-05" },
    });
  });
});
