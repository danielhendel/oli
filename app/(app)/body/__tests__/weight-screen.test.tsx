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
  StyleSheet: { create: (s: unknown) => s },
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
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: jest.fn(() => "2026-04-06"),
  };
});

const mockHook = jest.fn();
jest.mock("@/lib/data/body/useBodyOverviewData", () => ({
  useBodyOverviewData: (...args: unknown[]) => mockHook(...args),
}));

jest.mock("@/lib/data/body/useBodyCompositionInterpretation", () => {
  const { buildBodyOverviewInterpretations } = require("@/lib/body/bodyCompositionInterpretation");
  const { defaultUserProfileMain } = require("@oli/contracts");
  return {
    useBodyCompositionInterpretation: (overview: unknown) =>
      buildBodyOverviewInterpretations(defaultUserProfileMain(), overview, { massDisplayUnit: "lb" }),
  };
});

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

function buildPoint(dayKey: string, observedAt = `${dayKey}T07:00:00.000Z`): WeightPoint {
  return { dayKey, observedAt, weightKg: 80, sourceId: "healthkit" };
}

function weightBaselineReadyMaintaining(kg: number) {
  return {
    status: "ready" as const,
    model: {
      kind: "ready" as const,
      currentWeightKg: kg,
      referenceWeightKg: kg,
      ninetyDayLowKg: kg,
      ninetyDayHighKg: kg,
      changeFromReferenceKg: 0,
      classification: "maintaining" as const,
      markerFill01: 0.5,
    },
  };
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

  it("renders Body Composition empty state card when all metrics absent", () => {
    mockHook.mockReturnValue(buildBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Weight Baseline");
    expect(text.indexOf("Weight Baseline")).toBeLessThan(text.indexOf("Body Composition"));
    expect(text).toContain("Body Composition");
    expect(text).not.toContain("Overview");
    expect(text).toContain("No overview data yet");
    expect(text).not.toContain("Recent");
  });

  it("shows As of label when overview snapshot day is known", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        overview: {
          overviewDay: day,
          weightKg: 80,
          bodyFatPercent: null,
          bmi: null,
          leanBodyMassKg: null,
          restingMetabolicRateKcal: null,
          hasAnyMetric: true,
        },
        byDay: new Map([[day, [buildPoint(day)]]]),
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        weightBaseline: weightBaselineReadyMaintaining(80),
        series: {
          status: "ready",
          data: { points: [buildPoint(day)], latest: buildPoint(day) },
          refetch: jest.fn(),
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("As of Tue 3/31");
  });

  it("routes to weight metric detail when Weight row is pressed", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        overview: {
          overviewDay: day,
          weightKg: 80,
          bodyFatPercent: null,
          bmi: null,
          leanBodyMassKg: null,
          restingMetabolicRateKcal: null,
          hasAnyMetric: true,
        },
        byDay: new Map([[day, [buildPoint(day)]]]),
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        weightBaseline: weightBaselineReadyMaintaining(80),
        series: {
          status: "ready",
          data: { points: [buildPoint(day)], latest: buildPoint(day) },
          refetch: jest.fn(),
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const weightRow = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.startsWith("Open weight details"),
      );
    expect(weightRow).toBeDefined();
    act(() => {
      weightRow!.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith(BODY_METRIC_DETAIL_HREFS.weight);
  });

  it("routes to BMI and body fat metric pages from overview rows", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        overview: {
          overviewDay: day,
          weightKg: 80,
          bodyFatPercent: 18,
          bmi: 24.2,
          leanBodyMassKg: 60,
          restingMetabolicRateKcal: 1700,
          hasAnyMetric: true,
        },
        byDay: new Map([[day, [buildPoint(day)]]]),
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        weightBaseline: weightBaselineReadyMaintaining(80),
        series: {
          status: "ready",
          data: { points: [buildPoint(day)], latest: buildPoint(day) },
          refetch: jest.fn(),
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const bmiRow = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" && p.props.accessibilityLabel.startsWith("Open BMI details"),
      );
    act(() => {
      bmiRow!.props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(BODY_METRIC_DETAIL_HREFS.bmi);
    mockPush.mockClear();
    const bfRow = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.startsWith("Open body fat details"),
      );
    act(() => {
      bfRow!.props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(BODY_METRIC_DETAIL_HREFS.bodyFat);
  });

  it("renders BMI and lean body mass on overview when present (RMR not on overview card)", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        today: day,
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        markedDays: new Set<string>([day]),
        byDay: new Map([[day, [buildPoint(day)]]]),
        recent: [{ day, latest: buildPoint(day) }],
        overview: {
          overviewDay: day,
          weightKg: 80,
          bodyFatPercent: 18.2,
          bmi: 24.2,
          leanBodyMassKg: 60,
          restingMetabolicRateKcal: 1780,
          hasAnyMetric: true,
        },
        series: { status: "ready", data: { points: [buildPoint(day)], latest: buildPoint(day) }, refetch: jest.fn() },
        weightBaseline: weightBaselineReadyMaintaining(80),
        dayFacts: {
          status: "ready",
          data: {
            body: {
              bodyFatPercent: 18.2,
              bmi: 24.2,
              leanBodyMassKg: 60,
              restingMetabolicRateKcal: 1780,
            },
          },
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("BMI");
    expect(text).toContain("24.2");
    expect(text).toContain("Lean Body Mass");
    expect(text).toContain("132.3 lb");
    expect(text).not.toContain("RMR");
    expect(text).not.toContain("1780 kcal/day");
    expect(text).toMatch(/Fair|Good|Optimal|Out of range|No data/);
    expect(text).not.toMatch(/\bWHO\b/);
  });

  it("does not render long interpretation subtitle paragraphs as visible overview copy", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        overview: {
          overviewDay: day,
          weightKg: 80,
          bodyFatPercent: 18.2,
          bmi: 24.2,
          leanBodyMassKg: 60,
          restingMetabolicRateKcal: 1780,
          hasAnyMetric: true,
        },
        byDay: new Map([[day, [buildPoint(day)]]]),
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        weightBaseline: weightBaselineReadyMaintaining(80),
        series: { status: "ready", data: { points: [buildPoint(day)], latest: buildPoint(day) }, refetch: jest.fn() },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toMatch(/Mifflin/i);
    expect(text).not.toMatch(/World Health Organization/i);
    const weightRow = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.startsWith("Open weight details"),
      );
    expect(weightRow).toBeDefined();
    expect(String(weightRow!.props.accessibilityLabel)).toContain("interpretation");
  });

  it("routes to body day from weekly strip tap", () => {
    const day = "2026-03-31";
    mockHook.mockReturnValue(
      buildBody({
        today: day,
        weekDays: [{ day, meta: { hasMeasurement: true } }],
        markedDays: new Set<string>([day]),
        byDay: new Map([[day, [buildPoint(day)]]]),
        weightBaseline: weightBaselineReadyMaintaining(80),
        series: { status: "ready", data: { points: [buildPoint(day)], latest: buildPoint(day) }, refetch: jest.fn() },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const pressables = tree.root.findAllByType("Pressable");
    const stripDayPressable = pressables.find(
      (p) => p.props.accessibilityLabel === `${day}, has body measurement`,
    );
    expect(stripDayPressable).toBeDefined();
    act(() => {
      stripDayPressable!.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/body/day/[day]",
      params: { day },
    });
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

  it("shows granted-no-data copy on overview when permission is granted but Oli has no body samples", () => {
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
    expect(text).not.toContain("No trend data yet");
  });

  it("shows syncing banner when Apple Health body sync is in progress", () => {
    mockHook.mockReturnValue(
      buildBody({
        isBodySyncing: true,
      }),
    );
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
