import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRouterPush = jest.fn();
let navigationOptions: { headerRight?: () => React.ReactElement } = {};

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

jest.mock("@/lib/data/useReadinessView", () => ({
  useReadinessView: () => ({
    status: "ready" as const,
    data: {
      requestedDay: "2026-04-06",
      resolvedDay: "2026-04-06",
      isFallback: false,
      day: "2026-04-06",
      score: 80,
      contributors: {},
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/oura/useOuraViewWeekSnapshotPresence", () => ({
  useOuraViewWeekSnapshotPresence: () => ({
    status: "ready" as const,
    hasSnapshotByDay: {
      "2026-04-05": false,
      "2026-04-06": true,
      "2026-04-07": false,
      "2026-04-08": true,
      "2026-04-09": false,
      "2026-04-10": false,
      "2026-04-11": false,
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => ({
    status: "ready" as const,
    data: {
      connected: false,
      lastSnapshotAt: null,
      backfillStatus: null,
    },
  }),
}));

import ReadinessScreen from "../readiness";

describe("ReadinessScreen", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    navigationOptions = {};
  });

  it("header exposes calendar and settings routes via HeaderControls", async () => {
    await act(async () => {
      renderer.create(<ReadinessScreen />);
      await Promise.resolve();
    });
    expect(navigationOptions.headerRight).toBeDefined();
    let header!: renderer.ReactTestRenderer;
    await act(async () => {
      header = renderer.create(navigationOptions.headerRight!());
    });
    const calendar = header.root.findByProps({ accessibilityLabel: "Open readiness calendar" });
    await act(async () => {
      calendar.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/recovery/readiness/calendar");

    const settings = header.root.findByProps({ accessibilityLabel: "Readiness settings" });
    await act(async () => {
      settings.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/(app)/recovery/readiness/settings");
  });

  it("weekly strip marks days that have snapshot presence from the week hook", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("readiness-weekly-ring-2026-04-06");
    expect(str).toContain("readiness-weekly-ring-2026-04-08");
    expect(str).not.toContain("readiness-weekly-ring-2026-04-07");
  });
});
