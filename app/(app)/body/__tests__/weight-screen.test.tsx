import React from "react";
import renderer, { act } from "react-test-renderer";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import { BODY_METRIC_DETAIL_HREFS } from "../index";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
jest.mock("react-native-svg", () => {
  const React = require("react");
  const mk =
    (name: string) =>
    (props: { children?: unknown; [k: string]: unknown }) =>
      React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: mk("Svg"),
    Defs: mk("Defs"),
    LinearGradient: mk("LinearGradient"),
    Stop: mk("Stop"),
    Path: mk("Path"),
    Rect: mk("Rect"),
    Circle: mk("Circle"),
  };
});

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

const mockHook = jest.fn();
jest.mock("@/lib/data/body/useBodyOverviewData", () => ({
  useBodyOverviewData: (...args: unknown[]) => mockHook(...args),
}));

const mockAccess = jest.fn();
jest.mock("@/lib/data/body/useAppleHealthBodyAccessState", () => ({
  useAppleHealthBodyAccessState: () => mockAccess(),
}));

jest.mock("@/lib/data/body/useAppleHealthBodyBackfill", () => ({
  useAppleHealthBodyBackfill: () => ({
    state: { status: "idle" as const, message: null, summary: null },
    start: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const Screen = require("../index").default as React.ComponentType;

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

function sample(dayKey: string, weightKg: number) {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

function buildBody(overrides: Record<string, unknown> = {}) {
  return {
    today: "2026-03-31",
    peek: { status: "ready" as const, items: [] as unknown[], refetch: jest.fn() },
    snapshotDayPeek: { status: "ready" as const, items: [] as unknown[], refetch: jest.fn() },
    weightBaseline: {
      status: "ready" as const,
      model: { kind: "insufficient_data" as const, reason: "no_samples_in_window" as const },
    },
    series: {
      status: "ready" as const,
      data: { points: [] as WeightPoint[], latest: null },
      refetch: jest.fn(),
    },
    dayFacts: { status: "missing" as const },
    isBodySyncing: false,
    syncAppleHealthBodyNow: jest.fn(),
    hasSuccessfulBodySync: false,
    weekDays: [] as { day: string; meta: { hasMeasurement: boolean } }[],
    markedDays: new Set<string>(),
    byDay: new Map<string, WeightPoint[]>(),
    recent: [] as { day: string; latest: WeightPoint }[],
    stats: { changeKg: null, avgKg: null, highKg: null, lowKg: null },
    weightSamples: [] as { dayKey: string; observedAt: string; weightKg: number }[],
    overview: {
      overviewDay: null as string | null,
      weightKg: null as number | null,
      bodyFatPercent: null as number | null,
      bmi: null as number | null,
      leanBodyMassKg: null as number | null,
      restingMetabolicRateKcal: null as number | null,
      hasAnyMetric: false,
    },
    ...overrides,
  };
}

function buildPopulatedBody() {
  return buildBody({
    overview: {
      overviewDay: "2026-03-31",
      weightKg: 80,
      bodyFatPercent: 18,
      bmi: 24.2,
      leanBodyMassKg: 60,
      restingMetabolicRateKcal: 1700,
      hasAnyMetric: true,
    },
    weightSamples: [
      sample("2026-01-15", 79),
      sample("2026-02-10", 80),
      sample("2026-03-29", 78),
      sample("2026-03-31", 80),
    ],
  });
}

describe("Body Composition main screen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockAccess.mockReturnValue({
      phase: "ready",
      authLoading: false,
      authSnapshot: { kind: "authorized" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
  });

  it("hides the horizontal weekday/date calendar strip", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    // No calendar day ring cells, no "has body measurement" day pressables.
    expect(tree.root.findAllByProps({ testID: "body-weekly-ring-2026-03-31" })).toHaveLength(0);
    const stripDay = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.includes("body measurement"),
      );
    expect(stripDay).toBeUndefined();
  });

  it("renders Today, This Week's Weight, Weight Baseline, and 2026 Weight in order", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Today");
    expect(text).toContain("This Week's Weight");
    expect(text).toContain("Weight Baseline");
    expect(text).toContain("2026 Weight");
    expect(text.indexOf("Today")).toBeLessThan(text.indexOf("This Week's Weight"));
    expect(text.indexOf("This Week's Weight")).toBeLessThan(text.indexOf("Weight Baseline"));
    expect(text.indexOf("Weight Baseline")).toBeLessThan(text.indexOf("2026 Weight"));
  });

  it("renders Today card weight, BMI, body fat, and lean mass when available", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("176.4 lb");
    expect(text).toContain("BMI");
    expect(text).toContain("24.2");
    expect(text).toContain("Body Fat");
    expect(text).toContain("18.0%");
    expect(text).toContain("Lean Mass");
    expect(text).toContain("132.3 lb");
  });

  it("renders the This Week's Weight line chart with a date range label", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    expect(tree.root.findByProps({ testID: "body-this-week-line-chart" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-this-week-range-label" })).toBeDefined();
  });

  it("renders all five Weight Baseline periods", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    for (const key of ["7d", "30d", "90d", "ytd", "12m"]) {
      expect(tree.root.findByProps({ testID: `body-weight-baseline-row-${key}` })).toBeDefined();
    }
  });

  it("renders the 2026 Weight card with year navigation", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    expect(tree.root.findByProps({ testID: "body-yearly-nav" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-yearly-nav-next" }).props.disabled).toBe(true);
  });

  it("does not render any range/status (Optimal) pills on the updated cards", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toMatch(/Optimal|Out of range/);
    expect(text).not.toMatch(/Maintaining|Gaining|Losing/);
  });

  it("routes to the weight metric detail when the Today weight row is pressed", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const weightRow = tree.root.findByProps({ testID: "body-today-weight-row" });
    act(() => {
      weightRow.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith(BODY_METRIC_DETAIL_HREFS.weight);
  });

  it("routes to BMI detail from the Today BMI row", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const bmiRow = tree.root.findByProps({ testID: "body-today-row-bmi" });
    act(() => {
      bmiRow.props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(BODY_METRIC_DETAIL_HREFS.bmi);
  });

  it("renders the Today empty state when all metrics are absent", () => {
    mockHook.mockReturnValue(buildBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    expect(tree.root.findByProps({ testID: "body-today-empty-state" })).toBeDefined();
    // Yearly card is gated off until the current year has data.
    expect(tree.root.findAllByProps({ testID: "body-yearly-card" })).toHaveLength(0);
  });

  it("shows Apple Health permission onboarding when access is not determined", () => {
    mockHook.mockReturnValue(buildBody());
    mockAccess.mockReturnValue({
      phase: "not_determined",
      authLoading: false,
      authSnapshot: { kind: "not_determined" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Connect Apple Health for Body data");
    expect(text).toContain("Allow Apple Health Access");
  });

  it("invokes onAllowAppleHealthBodyAccess when Allow Apple Health Access is pressed", () => {
    const onAllow = jest.fn();
    mockHook.mockReturnValue(buildBody());
    mockAccess.mockReturnValue({
      phase: "not_determined",
      authLoading: false,
      authSnapshot: { kind: "not_determined" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: onAllow,
      onOpenAppSettings: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const primary = tree.root
      .findAllByType("Pressable")
      .find((p) => p.props.accessibilityLabel === "Allow Apple Health access for body data");
    expect(primary).toBeDefined();
    act(() => {
      primary!.props.onPress();
    });
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it("shows denied-state guidance when Apple Health body access is denied", () => {
    mockHook.mockReturnValue(buildBody());
    mockAccess.mockReturnValue({
      phase: "denied",
      authLoading: false,
      authSnapshot: { kind: "denied" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Apple Health access is off");
    expect(text).toContain("Open Settings");
  });

  it("shows granted-no-data copy on the Today card when permission is granted but no samples exist", () => {
    mockHook.mockReturnValue(buildBody());
    mockAccess.mockReturnValue({
      phase: "granted_no_data",
      authLoading: false,
      authSnapshot: { kind: "authorized" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("No body measurements yet");
  });

  it("shows the syncing banner when Apple Health body sync is in progress", () => {
    mockHook.mockReturnValue(buildBody({ isBodySyncing: true }));
    mockAccess.mockReturnValue({
      phase: "syncing",
      authLoading: false,
      authSnapshot: { kind: "authorized" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Syncing Apple Health");
  });
});
