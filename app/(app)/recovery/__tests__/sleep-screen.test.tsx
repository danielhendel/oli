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

jest.mock("@/lib/data/useSleepDayView", () => ({
  useSleepDayView: jest.fn(),
}));

jest.mock("@/lib/data/useSleepWeekDataPresence", () => ({
  useSleepWeekDataPresence: () => ({
    status: "ready" as const,
    hasSleepDataByDay: {
      "2026-04-05": false,
      "2026-04-06": true,
      "2026-04-07": true,
      "2026-04-08": false,
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

/** Avoid ScrollView/RefreshControl JSON serialization issues in react-test-renderer. */
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

import { useSleepDayView } from "@/lib/data/useSleepDayView";
import SleepScreen from "../sleep";

const defaultOuraFallbackState = {
  status: "oura_fallback" as const,
  data: {
    requestedDay: "2026-04-06",
    resolvedDay: "2026-04-06",
    isFallback: false,
    day: "2026-04-06",
    score: 72,
    contributors: {},
  },
  refetch: jest.fn(),
};

describe("SleepScreen", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseLocalSearchParams.mockReturnValue({});
    navigationOptions = {};
    jest.mocked(useSleepDayView).mockReturnValue(defaultOuraFallbackState);
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

  it("weekly strip marks days that have snapshot presence from the week hook", async () => {
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

  it("Oli branch titles the score card and prefers vendor score when API returns one", async () => {
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "oli",
      requestedDay: "2026-04-06",
      resolvedDay: "2026-04-06",
      facts: { schemaVersion: 1, userId: "u", date: "2026-04-06", computedAt: "2026-01-01T00:00:00.000Z" },
      sleep: {
        totalMinutes: 420,
        mainSleepMinutes: 420,
        efficiency: 0.9,
        oliSleepScore: {
          value: 81,
          version: "sleep-score-v1.0.0",
          computedAt: "2026-01-01T00:00:00.000Z",
          confidence: 0.85,
          components: {
            duration: 0.9,
            efficiency: 0.8,
            latency: 0.7,
            rem: 0.6,
            deep: 0.5,
          },
          weights: {
            duration: 0.4,
            efficiency: 0.2,
            latency: 0.15,
            rem: 0.125,
            deep: 0.125,
          },
          reasons: ["Sleep duration was strong."],
        },
      },
      insights: null,
      vendorSleepView: {
        requestedDay: "2026-04-06",
        resolvedDay: "2026-04-06",
        isFallback: false,
        day: "2026-04-06",
        score: 88,
        contributors: {},
      },
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Sleep Score");
    expect(str).toContain("88");
    expect(str).not.toContain("81");
    expect(str).not.toContain("Computed by Oli from your sleep facts");
    expect(str).not.toContain("Oli sleep facts");
  });

  it("Oli branch falls back honestly when vendor and Oli scores are unavailable", async () => {
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "oli",
      requestedDay: "2026-04-06",
      resolvedDay: "2026-04-06",
      facts: { schemaVersion: 1, userId: "u", date: "2026-04-06", computedAt: "2026-01-01T00:00:00.000Z" },
      sleep: {
        totalMinutes: 420,
        oliSleepScore: {
          value: null,
          version: "sleep-score-v1.0.0",
          computedAt: "2026-01-01T00:00:00.000Z",
          confidence: 0.35,
          components: {
            duration: 0.5,
            efficiency: null,
            latency: null,
            rem: null,
            deep: null,
          },
          weights: {
            duration: 1,
            efficiency: 0,
            latency: 0,
            rem: 0,
            deep: 0,
          },
          reasons: ["Stage data was incomplete, so no Oli score is shown."],
        },
      },
      insights: null,
      vendorSleepView: null,
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Stage data was incomplete");
    expect(str).not.toContain("We'll show a score when Oura provides one.");
  });

  it("metrics card titles Last night's sleep, omits rollup copy and awakenings, renders metric bars", async () => {
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "oli",
      requestedDay: "2026-04-06",
      resolvedDay: "2026-04-06",
      facts: { schemaVersion: 1, userId: "u", date: "2026-04-06", computedAt: "2026-01-01T00:00:00.000Z" },
      sleep: {
        totalMinutes: 420,
        mainSleepMinutes: 420,
        efficiency: 0.88,
        latencyMinutes: 10,
        remSleepMinutes: 75,
        deepSleepMinutes: 55,
        awakenings: 3,
        oliSleepScore: {
          value: 80,
          version: "sleep-score-v1.0.0",
          computedAt: "2026-01-01T00:00:00.000Z",
          confidence: 0.9,
          components: {
            duration: 0.9,
            efficiency: 0.85,
            latency: 0.8,
            rem: 0.75,
            deep: 0.7,
          },
          weights: {
            duration: 0.4,
            efficiency: 0.2,
            latency: 0.15,
            rem: 0.125,
            deep: 0.125,
          },
          reasons: [],
        },
      },
      insights: null,
      vendorSleepView: null,
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Last night's sleep");
    expect(str).not.toContain("Rollup from");
    expect(str).not.toContain("Awakenings");
    expect(str).toContain("sleep-oli-metric-bar-total");
    expect(str).toContain("sleep-oli-metric-bar-efficiency");
    expect(str).toContain("sleep-oli-metric-bar-latency");
    expect(str).toContain("sleep-oli-metric-bar-rem");
    expect(str).toContain("sleep-oli-metric-bar-deep");
    expect(str).toContain("sleep-oli-metric-pill-total");
    expect(str).toContain("sleep-oli-metric-pill-efficiency");
    expect(str).toContain("Optimal");
  });

  it("applies route day param when returning from calendar", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "2026-04-07" });
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "oli",
      requestedDay: "2026-04-07",
      resolvedDay: "2026-04-07",
      facts: { schemaVersion: 1, userId: "u", date: "2026-04-07", computedAt: "2026-01-01T00:00:00.000Z" },
      sleep: {
        totalMinutes: 400,
        mainSleepMinutes: 400,
        oliSleepScore: {
          value: 70,
          version: "sleep-score-v1.0.0",
          computedAt: "2026-01-01T00:00:00.000Z",
          confidence: 0.8,
          components: {
            duration: 0.7,
            efficiency: 0.7,
            latency: 0.7,
            rem: 0.7,
            deep: 0.7,
          },
          weights: {
            duration: 0.4,
            efficiency: 0.2,
            latency: 0.15,
            rem: 0.125,
            deep: 0.125,
          },
          reasons: [],
        },
      },
      insights: null,
      vendorSleepView: null,
      refetch: jest.fn(),
    });
    await act(async () => {
      renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    expect(useSleepDayView).toHaveBeenCalledWith("2026-04-07");
  });

  it("shows loading shell while sleep view is partial", async () => {
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "partial",
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("Loading sleep data");
  });

  it("shows error retry when sleep view errors", async () => {
    jest.mocked(useSleepDayView).mockReturnValue({
      status: "error",
      error: "nope",
      requestId: null,
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Couldn't load sleep data");
    expect(str).toContain("Try again");
  });

  it("Oura fallback branch uses Sleep Score title without legacy footnote", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Sleep Score");
    expect(str).not.toContain("Oura nightly score");
    expect(str).not.toContain("Legacy Oura detail");
  });
});
