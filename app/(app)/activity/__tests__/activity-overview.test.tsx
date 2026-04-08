import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRouterPush = jest.fn();
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
  useActivityOverviewScreenData: () => ({
    user: { uid: "u1" },
    initializing: false,
    selectedDay: "2026-04-06",
    setSelectedDay: jest.fn(),
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
            key: "thisWeek" as const,
            label: "This Week",
            compactStatsSummary: "3,000/day",
            markerPosition01: 0.25,
          },
          {
            key: "mtd" as const,
            label: "MTD",
            compactStatsSummary: "2,000/day",
            markerPosition01: 0.17,
          },
          {
            key: "ytd" as const,
            label: "YTD",
            compactStatsSummary: "4,000/day",
            markerPosition01: 0.33,
          },
        ],
      },
    },
  }),
}));

import ActivityOverviewScreen from "../index";

describe("ActivityOverviewScreen", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
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

  it("renders Overview card with average-only multi-day rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityOverviewScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Overview");
    expect(str).toContain("5,000 steps");
    expect(str).toContain("3,000/day");
    expect(str).toContain("2,000/day");
    expect(str).toContain("4,000/day");
    expect(str).not.toMatch(/\d+ steps · \d/);
    expect(str).toContain("activity-overview-steps-bar-today");
    expect(str).toContain("activity-overview-steps-bar-ytd");
  });
});
