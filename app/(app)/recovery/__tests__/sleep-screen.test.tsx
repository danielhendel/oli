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
  const React = require("react");
  const { View } = require("react-native");
  return {
    ModuleScreenShell: ({
      children,
      headerContent,
    }: {
      children: React.ReactNode;
      headerContent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        headerContent ?? null,
        children,
      ),
  };
});

import { useSleepOverviewScreenData } from "@/lib/data/sleep/useSleepOverviewScreenData";
import SleepScreen from "../sleep";

const defaultOverviewData = {
  user: { uid: "u1" },
  initializing: false,
  todayDayKey: "2026-04-06",
  weeklyStripDays: [
    { day: "2026-04-05", meta: { hasOuraSnapshot: false } },
    { day: "2026-04-06", meta: { hasOuraSnapshot: true } },
    { day: "2026-04-07", meta: { hasOuraSnapshot: true } },
    { day: "2026-04-08", meta: { hasOuraSnapshot: false } },
    { day: "2026-04-09", meta: { hasOuraSnapshot: false } },
    { day: "2026-04-10", meta: { hasOuraSnapshot: false } },
    { day: "2026-04-11", meta: { hasOuraSnapshot: false } },
  ],
  sleepTodayVm: {
    selectedDay: "2026-04-06",
    loading: false,
    durationText: "7h 0m",
    statusPill: {
      label: "Good" as const,
      color: "#248A3D",
      backgroundColor: "#F0F8F4",
    },
    subtitle: "Completed sleep from last night.",
    compactStatsSummaryForA11y: "7h 0m",
  },
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
  sleepBaselineVm: {
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
    ],
  },
  weeklySleepLoading: false,
  refetchSleepRollup: jest.fn(),
  refetchWeekStrip: jest.fn(),
};

describe("SleepScreen", () => {
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

  it("renders Today, This Week's Sleep, and Sleep Baseline cards", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("sleep-today-card");
    expect(str).toContain("Today");
    expect(str).toContain("7h 0m");
    expect(str).toContain("sleep-this-week-card");
    expect(str).toContain("This Week");
    expect(str).toContain("sleep-baseline-card");
    expect(str).toContain("Sleep Baseline");
    expect(str).not.toContain("View All");
  });

  it("weekly strip marks days that have snapshot presence", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("sleep-weekly-ring-2026-04-06");
    expect(str).toContain("sleep-weekly-ring-2026-04-07");
    expect(str).not.toContain("sleep-weekly-ring-2026-04-05");
  });

  it("Today card shows empty state when no completed sleep", async () => {
    jest.mocked(useSleepOverviewScreenData).mockReturnValue({
      ...defaultOverviewData,
      sleepTodayVm: {
        selectedDay: "2026-04-06",
        loading: false,
        durationText: null,
        statusPill: null,
        subtitle: "No completed sleep found for this day.",
        compactStatsSummaryForA11y: "No completed sleep",
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("No completed sleep found for this day.");
  });
});
