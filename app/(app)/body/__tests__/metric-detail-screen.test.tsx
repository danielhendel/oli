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

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
let mockMetricParam = "weight";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ metric: mockMetricParam }),
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/ui/WeightTrendChart", () => ({
  WeightTrendChart: () => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", { testID: "chart" });
  },
}));

jest.mock("@/lib/ui/WeightRangeSelector", () => ({
  WeightRangeSelector: () => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", { testID: "range" });
  },
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: (props: { accessibilityLabel?: string }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("Pressable", {
      testID: "header-back",
      accessibilityLabel: props.accessibilityLabel,
    });
  },
}));

jest.mock("@/lib/ui/HeaderControls", () => ({
  HeaderControls: (props: {
    calendarAccessibilityLabel?: string;
    logAccessibilityLabel?: string;
    onCalendarPress?: () => void;
    onLogPress?: () => void;
  }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "header-controls" },
      ReactLocal.createElement("Pressable", {
        testID: "header-calendar",
        accessibilityLabel: props.calendarAccessibilityLabel,
        onPress: props.onCalendarPress,
      }),
      ReactLocal.createElement("Pressable", {
        testID: "header-log",
        accessibilityLabel: props.logAccessibilityLabel,
        onPress: props.onLogPress,
      }),
    );
  },
}));

jest.mock("@/lib/ui/body/BodyMetricDetailEducationPanel", () => ({
  BodyMetricDetailEducationPanel: (props: { testID?: string }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", {
      testID: props.testID ?? "body-metric-detail-education",
    });
  },
}));

const MetricScreen = require("../metric/[metric]").default as React.ComponentType;

function readyTrends(metricKey: "weight" | "body_fat_percent" | "lean_body_mass") {
  return {
    status: "ready" as const,
    refetch: jest.fn(),
    data: {
      byMetric: {
        weight: metricKey === "weight"
          ? [
              {
                dayKey: "2026-03-31",
                observedAt: "2026-03-31T12:00:00.000Z",
                weightKg: 72,
                sourceId: "apple_health",
              },
            ]
          : [],
        body_fat_percent: metricKey === "body_fat_percent"
          ? [
              {
                dayKey: "2026-03-31",
                observedAt: "2026-03-31T12:00:00.000Z",
                weightKg: 18.2,
                sourceId: "apple_health",
              },
            ]
          : [],
        bmi: [],
        lean_body_mass: metricKey === "lean_body_mass"
          ? [
              {
                dayKey: "2026-03-31",
                observedAt: "2026-03-31T12:00:00.000Z",
                weightKg: 60,
                sourceId: "apple_health",
              },
            ]
          : [],
        resting_metabolic_rate: [],
      },
      statsByMetric: {
        weight: { change: null, avg: 72, high: 72, low: 72 },
        body_fat_percent: { change: null, avg: 18.2, high: 18.2, low: 18.2 },
        bmi: { change: null, avg: null, high: null, low: null },
        lean_body_mass: { change: null, avg: 60, high: 60, low: 60 },
        resting_metabolic_rate: { change: null, avg: null, high: null, low: null },
      },
    },
  };
}

describe("Body metric detail screen — metric-specific headers", () => {
  beforeEach(() => {
    mockSetOptions.mockClear();
    mockPush.mockClear();
    mockMetricParam = "weight";
    mockTrends.mockReturnValue(readyTrends("weight"));
  });

  it("configures Weight header with calendar and list filtered to Weight", async () => {
    await act(async () => {
      renderer.create(React.createElement(MetricScreen));
    });
    expect(mockTrends).toHaveBeenCalled();
    const call = mockTrends.mock.calls[mockTrends.mock.calls.length - 1];
    expect(call?.[1]).toBe("weight");
    expect(mockSetOptions).toHaveBeenCalled();
    const opts = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0];
    expect(opts.title).toBe("Weight");
    const headerRight = opts.headerRight();
    expect(headerRight.props.calendarAccessibilityLabel).toBe("Open Weight calendar");
    expect(headerRight.props.logAccessibilityLabel).toBe("Open Weight history");
    act(() => {
      headerRight.props.onCalendarPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/calendar?metric=weight");
    act(() => {
      headerRight.props.onLogPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/list?metric=weight");
    const headerLeft = opts.headerLeft();
    expect(headerLeft.props.accessibilityLabel).toBe("Back to Body Composition");
  });

  it("configures Body Fat header and shows education panel", async () => {
    mockMetricParam = "body-fat";
    mockTrends.mockReturnValue(readyTrends("body_fat_percent"));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    const opts = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0];
    expect(opts.title).toBe("Body Fat");
    const headerRight = opts.headerRight();
    expect(headerRight.props.calendarAccessibilityLabel).toBe("Open Body Fat calendar");
    expect(headerRight.props.logAccessibilityLabel).toBe("Open Body Fat history");
    expect(tree.root.findByProps({ testID: "body-metric-detail-education" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-history-empty" })).toHaveLength(0);
  });

  it("configures Lean Mass header without cross-metric Weight history", async () => {
    mockMetricParam = "lean-mass";
    mockTrends.mockReturnValue(readyTrends("lean_body_mass"));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    const opts = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0];
    expect(opts.title).toBe("Lean Mass");
    const headerRight = opts.headerRight();
    expect(headerRight.props.calendarAccessibilityLabel).toBe("Open Lean Mass calendar");
    expect(tree.root.findByProps({ testID: "body-metric-detail-education" })).toBeDefined();
    const call = mockTrends.mock.calls[mockTrends.mock.calls.length - 1];
    expect(call?.[1]).toBe("lean_body_mass");
  });

  it("shows honest empty history for the selected metric only", async () => {
    mockMetricParam = "body-fat";
    mockTrends.mockReturnValue({
      ...readyTrends("body_fat_percent"),
      data: {
        ...readyTrends("body_fat_percent").data,
        byMetric: {
          ...readyTrends("body_fat_percent").data.byMetric,
          body_fat_percent: [],
        },
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-history-empty" })).toHaveLength(1);
    const emptyChildren = tree.root.findByProps({ testID: "body-metric-detail-history-empty" }).props
      .children;
    const emptyText = Array.isArray(emptyChildren) ? emptyChildren.join("") : String(emptyChildren);
    expect(emptyText).toMatch(/No Body Fat entries/);
  });
});
