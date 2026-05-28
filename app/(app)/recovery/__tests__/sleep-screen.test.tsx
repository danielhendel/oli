import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRouterPush = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}));
let navigationOptions: { headerRight?: () => React.ReactElement } = {};

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    setOptions: (opts: typeof navigationOptions) => {
      navigationOptions = opts;
    },
    goBack: jest.fn(),
  }),
  useRouter: () => ({ push: mockRouterPush }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-04-06",
  getWeekDaysForAnchor: () => [
    "2026-04-05",
    "2026-04-06",
    "2026-04-07",
    "2026-04-08",
    "2026-04-09",
    "2026-04-10",
    "2026-04-11",
  ],
}));

const mockPullToRefreshSleep = jest.fn().mockResolvedValue({ didVendorSyncAndRecompute: false });

jest.mock("@/lib/data/useSleepPullToRefresh", () => ({
  useSleepPullToRefresh: jest.fn(() => ({
    pullToRefreshSleep: mockPullToRefreshSleep,
  })),
}));

jest.mock("@/lib/data/sleep/useSleepOverviewScreenData", () => ({
  useSleepOverviewScreenData: jest.fn(),
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => {
  const ReactMock = require("react");
  const { View } = require("react-native");
  return {
    ModuleScreenShell: ({
      children,
      headerContent,
    }: {
      children: React.ReactNode;
      headerContent?: React.ReactNode;
    }) =>
      ReactMock.createElement(
        View,
        { testID: "module-screen-shell", "data-has-header-content": headerContent != null },
        headerContent ?? null,
        children,
      ),
  };
});

import { useSleepOverviewScreenData } from "@/lib/data/sleep/useSleepOverviewScreenData";
import SleepScreen from "../sleep";

const sleepTodayDetailReady = {
  status: "ready" as const,
  day: "2026-04-06",
  headlineWithUnit: "7h 0m Sleep",
  model: {
    day: "2026-04-06",
    headlineValueText: "7h 0m",
    scoreValueText: "82",
    ratingLabel: "Good",
    ratingTone: "good" as const,
    summarySentence: "Sleep duration and efficiency look solid for this day.",
    metricRows: [
      { id: "deep_sleep", label: "Deep sleep", value: "1h 35m", detail: { title: "Deep sleep", value: "1h 35m", body: "" } },
      { id: "rem_sleep", label: "REM sleep", value: "1h 40m", detail: { title: "REM sleep", value: "1h 40m", body: "" } },
      { id: "sleep_efficiency", label: "Sleep efficiency", value: "91%", detail: { title: "Sleep efficiency", value: "91%", body: "" } },
      { id: "lowest_heart_rate", label: "Lowest heart rate", value: "52 bpm", detail: { title: "Lowest heart rate", value: "52 bpm", body: "" } },
      { id: "average_hrv", label: "Average HRV", value: "48 ms", detail: { title: "Average HRV", value: "48 ms", body: "" } },
    ],
    hasAnySignal: true,
    emptyStateTitle: null,
    emptyStateSubtitle: null,
    lastNightSubtitle: "Last night\u2019s sleep",
  },
};

const sleepBaselineVm = {
  rows: [
    {
      key: "day7",
      label: "7 Day",
      hasEnoughData: true,
      averageMinutes: 420,
      displayValue: "7h/night",
      statusLabel: "Good",
      statusColor: "#248A3D",
      statusBackgroundColor: "#F0F8F4",
      progressFill01: 0.875,
    },
    {
      key: "day90",
      label: "90 Day",
      hasEnoughData: true,
      averageMinutes: 430,
      displayValue: "7h 10m/night",
      statusLabel: "Good",
      statusColor: "#248A3D",
      statusBackgroundColor: "#F0F8F4",
      progressFill01: 0.89,
    },
  ],
  personalizedExplainer:
    "Your 90-day sleep baseline is 7h 10m/night, which puts you in the Good range. Over the past 7 completed nights, you're averaging 7h/night — about 2% below your baseline.",
};

const defaultOverviewData = {
  user: { uid: "u1" },
  initializing: false,
  todayDayKey: "2026-04-06",
  sleepTodayDetailVm: sleepTodayDetailReady,
  weeklySleepVm: {
    chartPoints: [
      { dayKey: "2026-04-05", displayLabel: "S", value: 0, isFutureDay: false },
      { dayKey: "2026-04-06", displayLabel: "M", value: 420, isFutureDay: false },
      { dayKey: "2026-04-07", displayLabel: "T", value: 0, isFutureDay: false },
      { dayKey: "2026-04-08", displayLabel: "W", value: 0, isFutureDay: true },
      { dayKey: "2026-04-09", displayLabel: "T", value: 0, isFutureDay: true },
      { dayKey: "2026-04-10", displayLabel: "F", value: 0, isFutureDay: true },
      { dayKey: "2026-04-11", displayLabel: "S", value: 0, isFutureDay: true },
    ],
    chartMaxScale: 420,
    weeklyAverageText: "7h 0m",
    isEmpty: false,
  },
  sleepBaselineVm,
  weeklySleepLoading: false,
  baselineLoading: false,
  refetchSleepRollup: jest.fn(),
  selectedWeekAnchorDay: "2026-04-05",
  setSelectedWeekAnchorDay: jest.fn(),
  sleepThisWeekRangeLabel: "Apr 5\u201311",
  sleepThisWeekCanGoPrevious: true,
  sleepThisWeekCanGoNext: false,
  onPressSleepPreviousWeek: jest.fn(),
  onPressSleepNextWeek: jest.fn(),
};

describe("SleepScreen (Activity-parity layout)", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockPullToRefreshSleep.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseLocalSearchParams.mockReturnValue({});
    navigationOptions = {};
    jest.mocked(useSleepOverviewScreenData).mockReturnValue(defaultOverviewData);
  });

  it("header exposes calendar and settings routes via HeaderControls", async () => {
    await act(async () => {
      renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    expect(navigationOptions.headerRight).toBeDefined();
    let header!: renderer.ReactTestRenderer;
    await act(async () => {
      header = renderer.create(navigationOptions.headerRight!());
    });
    const calendar = header.root.findByProps({ accessibilityLabel: "Open sleep calendar" });
    await act(async () => {
      calendar.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/recovery/sleep/calendar");

    const settings = header.root.findByProps({ accessibilityLabel: "Sleep settings" });
    await act(async () => {
      settings.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/recovery/sleep/settings");
  });

  it("does not render the weekly calendar strip but preserves the day-selection signal", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).not.toContain("sleep-weekly-");
    expect(str).not.toContain("testIDPrefix");

    const lastSelectedDay = jest
      .mocked(useSleepOverviewScreenData)
      .mock.calls.at(-1)?.[0];
    expect(lastSelectedDay).toBe("2026-04-06");
  });

  it("renders Today, This Week's Sleep, and Sleep Baseline cards (Activity parity)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("sleep-today-card");
    expect(str).toContain("sleep-today-hero-metric");
    expect(str).toContain("7h 0m Sleep");
    expect(str).toContain("sleep-this-week-card");
    expect(str).toContain("sleep-this-week-range-label");
    expect(str).toContain("Apr 5");
    expect(str).toContain("sleep-baseline-card");
    expect(str).toContain("sleep-baseline-explainer");
    expect(str).toContain("90-day sleep baseline");
  });

  it("Today card renders the missing copy when the detail VM is missing", async () => {
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      sleepTodayDetailVm: {
        status: "missing",
        day: "2026-04-06",
        message: "No completed sleep found for this day.",
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("No completed sleep found for this day.");
    expect(str).not.toContain("7h 0m Sleep");
  });

  it("Today card refreshes from missing → ready when the rollup arrives later", async () => {
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      sleepTodayDetailVm: {
        status: "missing",
        day: "2026-04-06",
        message: "No completed sleep found for this day.",
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    let str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("No completed sleep found for this day.");

    jest.mocked(useSleepOverviewScreenData).mockReturnValue(defaultOverviewData);
    await act(async () => {
      tree.update(<SleepScreen />);
      await Promise.resolve();
    });
    str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("7h 0m Sleep");

    const lastSelectedDay = jest
      .mocked(useSleepOverviewScreenData)
      .mock.calls.at(-1)?.[0];
    expect(lastSelectedDay).toBe("2026-04-06");
  });

  it("respects a deep-linked historical day from route params", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "2026-04-02" });
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      sleepTodayDetailVm: {
        status: "missing",
        day: "2026-04-02",
        message: "No completed sleep found for this day.",
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    void tree;
    const lastSelectedDay = jest
      .mocked(useSleepOverviewScreenData)
      .mock.calls.at(-1)?.[0];
    expect(lastSelectedDay).toBe("2026-04-02");
  });

  it("wires the This Week navigator handlers to the hook", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const previous = tree.root.findByProps({ testID: "sleep-this-week-nav-previous" });
    await act(async () => {
      previous.props.onPress();
    });
    expect(defaultOverviewData.onPressSleepPreviousWeek).toHaveBeenCalled();
  });

  it("renders Today and Weekly cards while the baseline is still hydrating", async () => {
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      baselineLoading: true,
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("sleep-today-hero-metric");
    expect(str).toContain("7h 0m Sleep");
    expect(str).toContain("sleep-this-week-card");
    expect(str).toContain("sleep-baseline-loading-subtitle");
    expect(str).toContain("Calculating sleep baseline");
    expect(str).not.toContain("sleep-baseline-explainer");
  });

  it("renders Today even when the weekly nav-week hasn't finished settling", async () => {
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      weeklySleepLoading: true,
      baselineLoading: true,
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("sleep-today-hero-metric");
    expect(str).toContain("7h 0m Sleep");
    expect(str).toContain("Loading sleep");
  });
});
