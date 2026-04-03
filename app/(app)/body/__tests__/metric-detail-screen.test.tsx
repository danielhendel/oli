import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockTrends = jest.fn();
jest.mock("@/lib/data/body/useBodyMetricTrends", () => ({
  useBodyMetricTrends: (...args: unknown[]) => mockTrends(...args),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ metric: "weight" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/ui/WeightTrendChart", () => ({
  WeightTrendChart: () => {
    const React = require("react");
    return React.createElement("View", { testID: "chart" });
  },
}));

jest.mock("@/lib/ui/WeightRangeSelector", () => ({
  WeightRangeSelector: () => {
    const React = require("react");
    return React.createElement("View", { testID: "range" });
  },
}));

const MetricScreen = require("../metric/[metric]").default as React.ComponentType;

describe("Body metric detail screen", () => {
  beforeEach(() => {
    mockTrends.mockReturnValue({
      status: "ready",
      refetch: jest.fn(),
      data: {
        byMetric: {
          weight: [
            {
              dayKey: "2026-03-31",
              observedAt: "2026-03-31T12:00:00.000Z",
              weightKg: 72,
              sourceId: "apple_health",
            },
          ],
          body_fat_percent: [],
          bmi: [],
          lean_body_mass: [],
          resting_metabolic_rate: [],
        },
        statsByMetric: {
          weight: { change: null, avg: 72, high: 72, low: 72 },
          body_fat_percent: { change: null, avg: null, high: null, low: null },
          bmi: { change: null, avg: null, high: null, low: null },
          lean_body_mass: { change: null, avg: null, high: null, low: null },
          resting_metabolic_rate: { change: null, avg: null, high: null, low: null },
        },
      },
    });
  });

  it("calls useBodyMetricTrends with weight filter only", async () => {
    await act(async () => {
      renderer.create(React.createElement(MetricScreen));
    });
    expect(mockTrends).toHaveBeenCalled();
    const call = mockTrends.mock.calls[mockTrends.mock.calls.length - 1];
    expect(call?.[1]).toBe("weight");
    expect(call?.[2]).toEqual({ enabled: true });
  });
});
