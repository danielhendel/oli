import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRouterPush = jest.fn();
const mockSetSelectedDay = jest.fn();

const mockSetSelectedWeekAnchorDay = jest.fn();
const mockOnPressActivityPreviousWeek = jest.fn();
const mockOnPressActivityNextWeek = jest.fn();
const mockSetSelectedYear = jest.fn();
const mockOnPressActivityPreviousYear = jest.fn();
const mockOnPressActivityNextYear = jest.fn();

const defaultYearlyCardModel = {
  year: 2026,
  title: "2026 Activity",
  rangeLabel: "2026",
  isCurrentYear: true,
  hasData: true,
  averageStepsPerDay: 6543,
  averageDisplay: "6,543",
  averageQualifier: "avg steps per day" as const,
  months: [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D",
  ].map((label, i) => ({
    monthIndex: i,
    monthKey: `2026-${String(i + 1).padStart(2, "0")}`,
    label: label as "J" | "F" | "M" | "A" | "S" | "O" | "N" | "D",
    averageSteps: i <= 3 ? 5000 + i * 250 : null,
    numericDayCount: i <= 3 ? 20 : 0,
    isFutureMonth: i > 3,
    isCurrentMonth: i === 3,
  })),
  chartMaxScale: 7000,
  todayMonthKey: "2026-04",
  isEmpty: false,
};

const defaultOverviewData = {
  user: { uid: "u1" },
  initializing: false,
  selectedDay: "2026-04-06",
  setSelectedDay: mockSetSelectedDay,
  todayDayKey: "2026-04-06",
  selectedWeekAnchorDay: "2026-04-05",
  setSelectedWeekAnchorDay: mockSetSelectedWeekAnchorDay,
  activityThisWeekRangeLabel: "Apr 5\u201311",
  activityThisWeekCanGoPrevious: true,
  activityThisWeekCanGoNext: false,
  onPressActivityPreviousWeek: mockOnPressActivityPreviousWeek,
  onPressActivityNextWeek: mockOnPressActivityNextWeek,
  selectedYear: 2026,
  setSelectedYear: mockSetSelectedYear,
  activityYearlyCardVisible: true,
  activityYearlyCardLoading: false,
  activityYearRangeLabel: "2026",
  activityYearCanGoPrevious: true,
  activityYearCanGoNext: false,
  onPressActivityPreviousYear: mockOnPressActivityPreviousYear,
  onPressActivityNextYear: mockOnPressActivityNextYear,
  activityYearlyCardModel: defaultYearlyCardModel,
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
    personalizedExplainer:
      "Your 90-day baseline is 2,500 steps/day, which puts you in the Sedentary range. Over the past 7 completed days, you're averaging 3,000 steps/day — about 20% above your baseline.",
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

function findStripDayPressables(root: renderer.ReactTestRenderer["root"]): unknown[] {
  return root.findAll(
    (n) =>
      typeof n.props?.accessibilityLabel === "string" &&
      n.props.accessibilityRole === "button" &&
      /^\d{4}-\d{2}-\d{2},/.test(n.props.accessibilityLabel as string),
  );
}

describe("ActivityOverviewScreen", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockSetSelectedDay.mockClear();
    mockSetSelectedWeekAnchorDay.mockClear();
    mockOnPressActivityPreviousWeek.mockClear();
    mockOnPressActivityNextWeek.mockClear();
    mockSetSelectedYear.mockClear();
    mockOnPressActivityPreviousYear.mockClear();
    mockOnPressActivityNextYear.mockClear();
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
    expect(str.indexOf("activity-today-card")).toBeLessThan(str.indexOf("activity-this-week-nav"));
    expect(str.indexOf("activity-this-week-nav")).toBeLessThan(
      str.indexOf("activity-history-summary-card"),
    );
    expect(str).toContain("Today");
    expect(str).toContain("This Week's Activity");
    expect(str).toContain("Activity Baseline");
    // Personalized explainer (from the model fixture) — replaces the legacy generic copy.
    expect(str).toContain("Your 90-day baseline is 2,500 steps/day");
    expect(str).toContain("Sedentary range");
    expect(str).toContain("7 completed days");
    expect(str).not.toContain(
      "Your activity baseline is the average daily steps across key time ranges.",
    );
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
    // Per-row status/range pills are removed from the Activity Baseline card.
    expect(str).not.toContain("activity-history-tier-pill-day7");
    expect(str).not.toContain("activity-history-tier-pill-day30");
    expect(str).not.toContain("activity-history-tier-pill-day90");
    expect(str).not.toContain("activity-history-tier-pill-ytd");
    expect(str).not.toContain("activity-history-tier-pill-month12");
    expect(str).toContain("activity-today-tier-progress");
    expect(str).not.toContain("activity-today-view-link");
    expect(str).not.toContain("activity-today-tier-pill");
    expect(str).not.toContain("activity-this-week-view-all");
  });

  it("does not render the weekly strip day cells on the overview", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    expect(findStripDayPressables(tree.root)).toHaveLength(0);
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("activity-weekly-outer-ring-");
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

  it("This Week's Activity renders a Daily Energy-style week range label and prev/next chevrons (no View All)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    expect(tree.root.findAllByProps({ testID: "activity-this-week-view-all" })).toHaveLength(0);
    const rangeLabel = tree.root.findByProps({ testID: "activity-this-week-range-label" });
    expect(rangeLabel.props.children).toBe("Apr 5\u201311");
    const prev = tree.root.findByProps({ testID: "activity-this-week-nav-previous" });
    const next = tree.root.findByProps({ testID: "activity-this-week-nav-next" });
    expect(prev.props.accessibilityLabel).toBe("Previous week");
    expect(next.props.accessibilityLabel).toBe("Next week");
    expect(next.props.disabled).toBe(true);
  });

  it("Previous week button delegates to the screen-data handler", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const prev = tree.root.findByProps({ testID: "activity-this-week-nav-previous" });
    await act(async () => {
      prev.props.onPress?.();
    });
    expect(mockOnPressActivityPreviousWeek).toHaveBeenCalledTimes(1);
  });

  it("Next week button fires the screen-data handler when enabled", async () => {
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      activityThisWeekRangeLabel: "Mar 29\u2013Apr 4",
      activityThisWeekCanGoPrevious: true,
      activityThisWeekCanGoNext: true,
    }));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const next = tree.root.findByProps({ testID: "activity-this-week-nav-next" });
    expect(next.props.disabled).toBe(false);
    await act(async () => {
      next.props.onPress?.();
    });
    expect(mockOnPressActivityNextWeek).toHaveBeenCalledTimes(1);
  });

  it("Activity This Week chart shows average subtitle, no rating pill, step labels on chart, and baseline pills unchanged", async () => {
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
    expect(str).toContain('"M"');
    expect(str).toContain('"S"');
    // Per-row baseline pills were removed in the Activity Baseline UX redesign.
    expect(str).not.toContain("activity-history-tier-pill-day7");
  });

  it("renders the Yearly Activity card under Activity Baseline when visible", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-yearly-card");
    expect(str).toContain("2026 Activity");
    expect(str).toContain("activity-yearly-range-label");
    expect(str).toContain("activity-yearly-month-chart");
    // Placement: Yearly card sits AFTER the Activity Baseline card.
    expect(str.indexOf("activity-history-summary-card")).toBeLessThan(
      str.indexOf("activity-yearly-card"),
    );
    // Order above: Today → This Week → Baseline → Yearly.
    expect(str.indexOf("activity-today-card")).toBeLessThan(str.indexOf("activity-this-week-nav"));
    expect(str.indexOf("activity-this-week-nav")).toBeLessThan(
      str.indexOf("activity-history-summary-card"),
    );
  });

  it("hides the Yearly Activity card when current-year has no completed data", async () => {
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      activityYearlyCardVisible: false,
    }));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("activity-yearly-card");
  });

  it("disables the Yearly Next-year button on the current year", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const next = tree.root.findByProps({ testID: "activity-yearly-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("Previous-year button delegates to the screen-data handler", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const prev = tree.root.findByProps({ testID: "activity-yearly-nav-previous" });
    await act(async () => {
      prev.props.onPress?.();
    });
    expect(mockOnPressActivityPreviousYear).toHaveBeenCalledTimes(1);
  });

  it("Next-year button fires the screen-data handler when enabled for a prior year", async () => {
    mockUseActivityOverviewScreenData.mockImplementation(() => ({
      ...defaultOverviewData,
      selectedYear: 2024,
      activityYearRangeLabel: "2024",
      activityYearCanGoNext: true,
      activityYearlyCardModel: {
        ...defaultYearlyCardModel,
        year: 2024,
        title: "2024 Activity",
        rangeLabel: "2024",
        isCurrentYear: false,
      },
    }));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const next = tree.root.findByProps({ testID: "activity-yearly-nav-next" });
    expect(next.props.disabled).toBe(false);
    await act(async () => {
      next.props.onPress?.();
    });
    expect(mockOnPressActivityNextYear).toHaveBeenCalledTimes(1);
  });
});
