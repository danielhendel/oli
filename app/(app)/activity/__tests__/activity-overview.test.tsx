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
    { day: "2026-04-05", meta: { hasSteps: false, ringTierIndex: null } },
    { day: "2026-04-06", meta: { hasSteps: true, ringTierIndex: 0 } },
    { day: "2026-04-07", meta: { hasSteps: false, ringTierIndex: null } },
    { day: "2026-04-08", meta: { hasSteps: false, ringTierIndex: null } },
    { day: "2026-04-09", meta: { hasSteps: false, ringTierIndex: null } },
    { day: "2026-04-10", meta: { hasSteps: false, ringTierIndex: null } },
    { day: "2026-04-11", meta: { hasSteps: false, ringTierIndex: null } },
  ],
  stepsRollup: {
    status: "ready" as const,
    rollupByDay: {},
    rollupDisplayByDay: {},
    rollupFallbackBase: {},
    isRefreshing: false,
    refetch: jest.fn(),
  },
  overview: {
    loading: false,
    error: null,
    yesterdayRowLoading: false,
    yesterdayRowError: null,
    model: {
      timeframes: [
        {
          key: "yesterday" as const,
          label: "Yesterday",
          compactStatsSummary: "9,876 steps",
          markerPosition01: 0.42,
        },
        {
          key: "day7" as const,
          label: "7 Day",
          compactStatsSummary: "3,000/day",
          markerPosition01: 0.25,
        },
        {
          key: "day30" as const,
          label: "30 Day",
          compactStatsSummary: "2,000/day",
          markerPosition01: 0.17,
        },
        {
          key: "ytd" as const,
          label: "YTD",
          compactStatsSummary: "Not enough data",
          markerPosition01: 0,
        },
        {
          key: "month12" as const,
          label: "12 Month",
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
      deltaFromBaselineSteps: -4321,
      deltaFromBaselineLabel: "4,321 steps below your baseline",
    },
  },
  baselineDetails: {
    loading: false,
    error: null,
    model: {
      title: "Activity Baseline",
      compactStatsSummary: "5,555 steps",
      markerPosition01: 0.31,
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

  it("renders Overview and Today’s Steps cards with timeframe rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("Step Ratings");
    expect(str).not.toContain("activity-step-ratings-toggle");
    expect(str.indexOf("Activity Baseline")).toBeLessThan(str.indexOf("Today’s Steps"));
    expect(str.indexOf("Today’s Steps")).toBeLessThan(str.indexOf("Yesterday"));
    const overviewBarMarker = "activity-overview-steps-bar-day7";
    expect(str.indexOf("Yesterday")).toBeLessThan(str.indexOf(overviewBarMarker));
    expect(str.indexOf("Your baseline is your average daily steps over the past 90 days")).toBeLessThan(
      str.indexOf("Today’s Steps"),
    );
    expect(str).toContain(overviewBarMarker);
    expect(str).toContain("Today’s Steps");
    expect(str).toContain("7 Day");
    expect(str).toContain("30 Day");
    expect(str).toContain("YTD");
    expect(str).toContain("12 Month");
    expect(str).toContain("3,000");
    expect(str).toContain("2,000");
    expect(str).toContain("Not enough data");
    expect(str).toContain("4,000");
    expect(str).toContain("1,234");
    expect(str).toContain("9,876");
    expect(str).toContain("5,555");
    expect(str).toContain("Your baseline is your average daily steps over the past 90 days");
    expect(str).toContain("activity-daily-details-delta-label");
    expect(str).toContain("steps below your baseline");
    expect(str).not.toContain("activity-baseline-tier-legend");
    expect(str).not.toContain("under 5,000");
    expect(str).not.toContain("15,000+");
    expect(str).not.toMatch(/1,234 steps/);
    expect(str).not.toMatch(/\d+ steps · \d/);
    expect(str).toContain("activity-overview-steps-bar-day7");
    expect(str).toContain("activity-overview-steps-bar-month12");
    expect(str).toContain("activity-baseline-details-steps-bar");
    expect(str).toContain("activity-daily-details-steps-bar");
    expect(str).toContain("activity-overview-steps-bar-yesterday");
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
    expect(mockSetSelectedDay).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/day/2026-04-07");
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
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/day/2026-04-05");
  });

  it("shows overview rollup warning on Overview only, not on Today’s Steps, when daily model is ready", async () => {
    const aggregateMessage = "Couldn’t load steps for 38 days. Other days may still show below.";
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      overview: {
        ...defaultOverviewData.overview,
        error: {
          message: aggregateMessage,
          requestId: "rAgg",
          onRetry: jest.fn(),
        },
      },
      dailyDetails: {
        loading: false,
        error: null,
        model: {
          title: "Today",
          compactStatsSummary: "148 steps",
          markerPosition01: 0.15,
        },
      },
    }));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain(aggregateMessage);
    expect(str).toContain("148");
    expect(str).not.toMatch(/148 steps/);
    const first = str.indexOf(aggregateMessage);
    const second = str.indexOf(aggregateMessage, first + 1);
    expect(second).toBe(-1);
  });

  it("shows Today’s Steps own error when daily fetch failed, separate from overview warning", async () => {
    const aggregateMessage = "Couldn’t load steps for 2 days. Other days may still show below.";
    const todayMessage = "Selected day request failed";
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      overview: {
        ...defaultOverviewData.overview,
        error: {
          message: aggregateMessage,
          requestId: "rAgg",
          onRetry: jest.fn(),
        },
      },
      dailyDetails: {
        loading: false,
        error: { message: todayMessage, requestId: "rDay", onRetry: jest.fn() },
        model: null,
      },
    }));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain(aggregateMessage);
    expect(str).toContain(todayMessage);
    expect(str).not.toContain("148 steps");
  });

  it("shows no rollup warning when overview has no error", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("Couldn’t load steps for");
    expect(str).toContain("1,234");
    expect(str).not.toMatch(/1,234 steps/);
  });

  it("navigates to day detail for the strip day marked as today and for a non-today strip day", async () => {
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      selectedDay: "2026-04-10",
      weeklyStripDays: [
        { day: "2026-04-05", meta: { hasSteps: false, ringTierIndex: null } },
        { day: "2026-04-10", meta: { hasSteps: true, ringTierIndex: 3 } },
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
    expect(mockRouterPush).toHaveBeenLastCalledWith("/(app)/activity/day/2026-04-10");

    mockRouterPush.mockClear();
    mockSetSelectedDay.mockClear();

    await act(async () => {
      findStripDayPressable(tree.root, "2026-04-05").props.onPress();
    });
    expect(mockSetSelectedDay).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenLastCalledWith("/(app)/activity/day/2026-04-05");
  });
});
