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

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: {
      status: "ready",
      profile: {
        identity: { dateOfBirth: "1990-01-15", sexAtBirth: "female" },
        body: { heightCm: 170 },
      },
    },
    refresh: jest.fn(),
    patch: jest.fn(),
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/ui/WeightLogModal", () => ({
  WeightLogModal: () => null,
}));

const Screen = require("../index").default as React.ComponentType;

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
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
      latestObservedAtIso: null as string | null,
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
      latestObservedAtIso: "2026-03-31T08:00:00.000Z",
    },
  });
}

describe("Body Composition simplified main screen", () => {
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

  it("renders three primary metric cards before Apple Health actions", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toContain("Track weight, body fat, and lean tissue.");
    expect(tree.root.findByProps({ testID: "body-metric-card-weight" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-leanTissue" })).toBeDefined();
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Body Fat"));
    expect(text.indexOf("Body Fat")).toBeLessThan(text.indexOf("Lean Tissue"));
    expect(text.indexOf("Lean Tissue")).toBeLessThan(text.indexOf("Add or connect measurements"));
  });

  it("does not render the previous dense educational landing", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toContain("Educational reference");
    expect(text).not.toContain("Health Protection");
    expect(text).not.toContain("Performance Support");
    expect(text).not.toContain("Evidence levels");
    expect(text).not.toContain("Central Adiposity");
    expect(text).not.toMatch(/Body score|Optimized|Excellence/i);
    // Weight may show a CDC/WHO screening marker; Body Fat / Lean must not invent markers.
  });

  it("shows populated values with CDC/WHO Weight chart and no BF/Lean classification graph", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("176.4");
    expect(text).toContain("18.0");
    expect(text).toContain("132.3");
    expect(text).toContain("Underweight");
    expect(text).toContain("Healthy Weight");
    expect(text).toContain("Overweight");
    expect(text).toContain("Obesity");
    expect(text).not.toContain("BMI SCREENING");
    expect(text).not.toContain("cdc-who-adult-bmi-screening");
    expect(text).not.toContain("No measurement yet");
    expect(text).not.toMatch(/\bBelow\b|\bAbove\b/);
    expect(tree.root.findByProps({ testID: "body-metric-chart-weight" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-chart-bodyFat" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-chart-leanTissue" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-scaffold-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-scaffold-leanTissue" })).toBeDefined();
    expect(text).toContain("Connected");
    expect(text).toContain("Add measurement");
  });

  it("routes Connected to Apple Health management rather than syncing on tap", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings/devices/apple_health");
  });

  it("shows Sync now when Apple Health is not yet connected for this account", () => {
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
    expect(collectText(tree)).toContain("Sync now");
    expect(tree.root.findByProps({ testID: "body-metric-connection-weight" })).toBeDefined();
  });

  it("routes Weight card to weight metric detail", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    act(() => {
      tree.root.findByProps({ testID: "body-metric-card-weight" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith(BODY_METRIC_DETAIL_HREFS.weight);
  });

  it("shows Apple Health connect after metric cards when access is not determined", () => {
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
    expect(text).toContain("Connect Apple Health");
    expect(text).toContain("transport");
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Connect Apple Health"));
  });

  it("invokes onAllowAppleHealthBodyAccess only after explicit tap", () => {
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

  it("keeps cards visible when measurement series errors", () => {
    mockHook.mockReturnValue(
      buildBody({
        series: {
          status: "error",
          error: "network",
          requestId: "req_1",
          refetch: jest.fn(),
          data: { points: [], latest: null },
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    expect(tree.root.findByProps({ testID: "body-composition-summary-screen" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-measurement-error" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-weight" })).toBeDefined();
  });

  it("hides the horizontal weekday/date calendar strip", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    expect(tree.root.findAllByProps({ testID: "body-weekly-ring-2026-03-31" })).toHaveLength(0);
  });
});
