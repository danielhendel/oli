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
  rollupAggregateError: null as { message: string; requestId: string | null; onRetry: () => void } | null,
  activityHistorySummaryModel: {
    rows: [
      {
        key: "day7" as const,
        label: "7 Day" as const,
        hasEnoughData: true,
        averageStepsPerDay: 3000,
        displayValue: "3,000 steps/day",
        tierLabel: "Moderately Active",
        tierIndexForBar: 2,
        progressFill01: 0.4,
      },
      {
        key: "day30" as const,
        label: "30 Day" as const,
        hasEnoughData: true,
        averageStepsPerDay: 2000,
        displayValue: "2,000 steps/day",
        tierLabel: "Lightly Active",
        tierIndexForBar: 1,
        progressFill01: 0.3,
      },
      {
        key: "day90" as const,
        label: "90 Day" as const,
        hasEnoughData: true,
        averageStepsPerDay: 2500,
        displayValue: "2,500 steps/day",
        tierLabel: "Moderately Active",
        tierIndexForBar: 2,
        progressFill01: 0.35,
      },
      {
        key: "ytd" as const,
        label: "YTD" as const,
        hasEnoughData: false,
        averageStepsPerDay: null,
        displayValue: "—",
        tierLabel: null,
        tierIndexForBar: null,
        progressFill01: null,
      },
      {
        key: "month12" as const,
        label: "12 Month" as const,
        hasEnoughData: true,
        averageStepsPerDay: 4000,
        displayValue: "4,000 steps/day",
        tierLabel: "Active",
        tierIndexForBar: 3,
        progressFill01: 0.5,
      },
    ],
  },
  activityThisWeekCardModel: {
    compactValuePrimary: "5,000 steps/day",
    ratingLabel: "Active",
    activityTierIndexForBar: 3,
    fillWidth01Override: 0.55,
    chartPoints: [
      {
        dayKey: "2026-04-05",
        displayLabel: "S",
        value: 0,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-06",
        displayLabel: "M",
        value: 9876,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-07",
        displayLabel: "T",
        value: 0,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-08",
        displayLabel: "W",
        value: 0,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-09",
        displayLabel: "T",
        value: 0,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-10",
        displayLabel: "F",
        value: 0,
        isFutureDay: false,
      },
      {
        dayKey: "2026-04-11",
        displayLabel: "S",
        value: 0,
        isFutureDay: false,
      },
    ],
    chartMaxScale: 10500,
    baselineMeanStepsPerDay: 5555,
    weeklyAverageMetricValue: "9,876",
    isEmpty: false,
  },
  activityTodayCardModel: {
    stepsDigits: "1,234",
    tierPill: {
      label: "Lightly Active",
      color: "#F7F8FA",
      backgroundColor: "#20262E",
      emphasis: "subtle" as const,
      rangeDisplay: "",
    },
    subtitle: "4,321 steps below your baseline",
    compactStatsSummaryForA11y: "1,234",
    activityTierIndexForBar: 1,
    fillWidth01Override: 0.25,
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

  it("renders Today, This Week's Activity, Activity Baseline in order with baseline rows as steps/day", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str.indexOf("activity-today-card")).toBeLessThan(str.indexOf("activity-this-week-view-all"));
    expect(str.indexOf("activity-this-week-view-all")).toBeLessThan(str.indexOf("activity-history-summary-card"));
    expect(str).toContain("Today");
    expect(str).toContain("This Week's Activity");
    expect(str).toContain("Activity Baseline");
    expect(str).toContain("Your activity baseline is the average daily steps across key time ranges.");
    expect(str).toContain("7 Day");
    expect(str).toContain("30 Day");
    expect(str).toContain("90 Day");
    expect(str).toContain("YTD");
    expect(str).toContain("12 Month");
    expect(str).toContain("steps/day");
    expect(str).not.toContain("Yesterday");
    expect(str).not.toContain("Your typical daily activity level based on the past 90 days");
    expect(str).not.toContain("activity-baseline-details-steps-bar");
    expect(str).not.toContain("activity-baseline-threshold-markers");
    expect(str).toContain("activity-history-tier-pill-day7");
    expect(str).toContain("activity-today-tier-progress");
    expect(str).not.toContain("activity-today-view-link");
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

  it("shows overview rollup warning on Activity Baseline card when aggregate error is present", async () => {
    const aggregateMessage = "Couldn’t load steps for 38 days. Other days may still show below.";
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      rollupAggregateError: {
        message: aggregateMessage,
        requestId: "rAgg",
        onRetry: jest.fn(),
      },
      dailyDetails: {
        loading: false,
        error: null,
        model: {
          title: "Today",
          compactStatsSummary: "148",
          markerPosition01: 0.15,
        },
      },
      activityTodayCardModel: {
        stepsDigits: "148",
        tierPill: defaultOverviewData.activityTodayCardModel.tierPill,
        subtitle: "Steps recorded today",
        compactStatsSummaryForA11y: "148",
        activityTierIndexForBar: 0,
        fillWidth01Override: 0.1,
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

  it("shows Today’s Steps own error when daily fetch failed, separate from aggregate warning", async () => {
    const aggregateMessage = "Couldn’t load steps for 2 days. Other days may still show below.";
    const todayMessage = "Selected day request failed";
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      rollupAggregateError: {
        message: aggregateMessage,
        requestId: "rAgg",
        onRetry: jest.fn(),
      },
      dailyDetails: {
        loading: false,
        error: { message: todayMessage, requestId: "rDay", onRetry: jest.fn() },
        model: null,
      },
      activityTodayCardModel: null,
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

  it("shows no rollup warning when aggregate has no error", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("Couldn’t load steps for");
    expect(str).toContain("1,234");
    expect(str).not.toContain('"1,234 steps"');
  });

  it("navigates to day detail for strip days", async () => {
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

  it("Activity Baseline View More navigates to activity analytics", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const viewMore = tree.root.findByProps({ testID: "activity-history-summary-view-more" });
    await act(async () => {
      viewMore.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/analytics");
  });

  it("This Week View All navigates to activity history", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const viewAll = tree.root.findByProps({ testID: "activity-this-week-view-all" });
    await act(async () => {
      viewAll.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/activity/history");
  });

  it("Activity This Week chart shows average subtitle, no rating pill, step label on chart, and baseline pills unchanged", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-this-week-weekly-chart");
    expect(str).not.toContain("activity-this-week-day-row-bar");
    expect(str).not.toContain("activity-this-week-rating-pill");
    expect(str).toContain("activity-this-week-average-steps");
    expect(str).toContain("9,876");
    expect(str).toContain("avg steps per day");
    expect(str).toContain("9,876");
    expect(str).toContain('"M"');
    expect(str).toContain('"S"');
    expect(str).toContain("activity-history-tier-pill-day7");
  });

  it("opens Activity Range Explainer when baseline tier pill is pressed", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const pill = tree.root.findByProps({ testID: "activity-history-tier-pill-day7" });
    await act(async () => {
      pill.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/(app)/activity/activity-range-explainer",
      params: expect.objectContaining({
        window: "7 Day",
        tierLabel: "Moderately Active",
        displayValue: "3,000 steps/day",
      }),
    });
  });
});
