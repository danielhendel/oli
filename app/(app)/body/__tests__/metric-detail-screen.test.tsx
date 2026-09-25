import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
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

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: {
      status: "ready",
      profile: {
        identity: { dateOfBirth: "1990-01-15", sexAtBirth: "male" },
        body: { heightCm: 175 },
      },
    },
  }),
}));

jest.mock("@/lib/data/body/useBodyCompositionInterpretation", () => {
  const actual = jest.requireActual("@/lib/data/body/useBodyCompositionInterpretation");
  return actual;
});

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
let mockMetricParam = "weight";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ metric: mockMetricParam }),
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/ui/WeightTrendChart", () => ({
  WeightTrendChart: (props: {
    emphasizeLatestPoint?: boolean;
    accessibilityLabel?: string;
    chartHeight?: number;
    accentColor?: string;
  }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", {
      testID: "chart",
      emphasizeLatestPoint: props.emphasizeLatestPoint === true,
      accessibilityLabel: props.accessibilityLabel,
      chartHeight: props.chartHeight,
      accentColor: props.accentColor,
    });
  },
}));

jest.mock("@/lib/ui/WeightRangeSelector", () => ({
  WeightRangeSelector: (props: { value: string; onChange: (r: string) => void }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "range", value: props.value },
      ReactLocal.createElement("Pressable", {
        testID: "range-30D",
        onPress: () => props.onChange("30D"),
      }),
    );
  },
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: (props: { accessibilityLabel?: string; testID?: string }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("Pressable", {
      testID: props.testID ?? "header-back",
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

jest.mock("@/lib/ui/body/BodyMetricManualEntrySheet", () => ({
  BodyMetricManualEntrySheet: () => null,
}));

jest.mock("@/lib/hooks/useBodyMetricEntryKeyboard", () => ({
  useBodyMetricEntryKeyboard: () => ({ keyboardHeight: 0, keyboardVisible: false }),
}));

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-03-31",
  ymdInTimeZoneFromIso: jest.requireActual("@/lib/time/dayKey").ymdInTimeZoneFromIso,
}));

const MetricScreen = require("../metric/[metric]").default as React.ComponentType;

function readyTrends(metricKey: "weight" | "body_fat_percent" | "lean_body_mass") {
  return {
    status: "ready" as const,
    refetch: jest.fn(),
    data: {
      byMetric: {
        weight:
          metricKey === "weight"
            ? [
                {
                  dayKey: "2025-03-31",
                  observedAt: "2025-03-31T12:00:00.000Z",
                  weightKg: 73,
                  sourceId: "manual",
                },
                {
                  dayKey: "2026-03-01",
                  observedAt: "2026-03-01T12:00:00.000Z",
                  weightKg: 73,
                  sourceId: "manual",
                },
                {
                  dayKey: "2026-03-31",
                  observedAt: "2026-03-31T12:00:00.000Z",
                  weightKg: 72,
                  sourceId: "apple_health",
                },
              ]
            : [],
        body_fat_percent:
          metricKey === "body_fat_percent"
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
        lean_body_mass:
          metricKey === "lean_body_mass"
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
        weight: { change: -1, avg: 72.666, high: 73, low: 72 },
        body_fat_percent: { change: null, avg: 18.2, high: 18.2, low: 18.2 },
        bmi: { change: null, avg: null, high: null, low: null },
        lean_body_mass: { change: null, avg: 60, high: 60, low: 60 },
        resting_metabolic_rate: { change: null, avg: null, high: null, low: null },
      },
    },
  };
}

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("Body metric detail — Weight trend redesign", () => {
  beforeEach(() => {
    mockSetOptions.mockClear();
    mockPush.mockClear();
    mockTrends.mockClear();
    mockMetricParam = "weight";
    mockTrends.mockReturnValue(readyTrends("weight"));
  });

  it("places Weight title beside back (not centered) with calendar/history on the right", async () => {
    await act(async () => {
      renderer.create(React.createElement(MetricScreen));
    });
    const opts = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0];
    expect(opts.headerTitleAlign).toBe("left");
    expect(opts.title).toBe("");
    const left = opts.headerLeft();
    expect(left.props.title).toBe("Weight");
    const right = opts.headerRight();
    expect(right.props.calendarAccessibilityLabel).toBe("Open Weight calendar");
    expect(right.props.logAccessibilityLabel).toBe("Open Weight history");
    act(() => {
      right.props.onCalendarPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/calendar?metric=weight");
    act(() => {
      right.props.onLogPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/list?metric=weight");
  });

  it("removes Latest card, embedded History card, and keeps one trend surface", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-detail" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-latest" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-chart" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-summary" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-history" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-hero-weight" })).toHaveLength(0);
    const text = collectText(tree);
    expect(text).not.toMatch(/\bLatest\b/);
    expect(text).not.toMatch(/Weight History/);
    expect(tree.root.findByProps({ testID: "chart" }).props.emphasizeLatestPoint).toBe(true);
    expect(tree.root.findByProps({ testID: "chart" }).props.chartHeight).toBe(320);
  });

  it("shows current Weight with Change/High/Low stats and no hero change chip", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-latest" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-period-change" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-change" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-stat-average" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-high" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-stat-low" })).toBeDefined();
    const changeA11y = String(
      tree.root.findByProps({ testID: "body-metric-trend-stat-change" }).props.accessibilityLabel,
    );
    expect(changeA11y).toMatch(/change/i);
    expect(changeA11y).toMatch(/−2\.2 lb|−2\.2/);
    const text = collectText(tree);
    expect(text).toMatch(/Tue, Mar 31/);
    expect(text).toMatch(/1Y|Change/);
    expect(tree.root.findByProps({ testID: "body-metric-trend-observed-coverage" })).toBeDefined();
    const summaryA11y = tree.root.findByProps({ testID: "body-metric-trend-detail" }).props
      .accessibilityLabel as string;
    expect(summaryA11y).not.toMatch(/healthy|improved|worsened|good|bad/i);
  });

  it("Weight keeps full-history fetch across range switches so Y-domain stays locked", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    const first = mockTrends.mock.calls[0];
    expect(first?.[0]).toBe("All");
    expect(first?.[1]).toBe("weight");
    await act(async () => {
      tree.root.findByProps({ testID: "range-30D" }).props.onPress();
    });
    const last = mockTrends.mock.calls[mockTrends.mock.calls.length - 1];
    expect(last?.[0]).toBe("All");
    expect(last?.[1]).toBe("weight");
  });

  it("Body Fat removes education panel and keeps Weight-parity trend surface", async () => {
    mockMetricParam = "body-fat";
    mockTrends.mockReturnValue(readyTrends("body_fat_percent"));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-education" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-history" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-detail-history-empty" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-trend-detail" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "range" })).toBeDefined();
    const text = collectText(tree);
    expect(text).not.toMatch(/EDUCATIONAL REFERENCE|Educational context only|Additional limitations/i);
    expect(text).not.toMatch(/Population, method, and evidence/i);
  });

  it("Body Fat keeps full-history fetch across range switches so Y-domain stays locked", async () => {
    mockMetricParam = "body-fat";
    mockTrends.mockReturnValue(readyTrends("body_fat_percent"));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    const first = mockTrends.mock.calls[0];
    expect(first?.[0]).toBe("All");
    expect(first?.[1]).toBe("body_fat_percent");
    await act(async () => {
      tree.root.findByProps({ testID: "range-30D" }).props.onPress();
    });
    const last = mockTrends.mock.calls[mockTrends.mock.calls.length - 1];
    expect(last?.[0]).toBe("All");
    expect(last?.[1]).toBe("body_fat_percent");
  });

  it("empty Weight history shows Add measurement, not a fake chart", async () => {
    mockTrends.mockReturnValue({
      ...readyTrends("weight"),
      data: {
        ...readyTrends("weight").data,
        byMetric: { ...readyTrends("weight").data.byMetric, weight: [] },
      },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(MetricScreen));
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-empty" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-trend-add" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "chart" })).toHaveLength(0);
  });
});
