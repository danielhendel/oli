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
  RefreshControl: "RefreshControl",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFillObject: {} },
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
const mockSetMassUnit = jest.fn();
let mockMassUnit: "lb" | "kg" = "lb";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: mockMassUnit } } },
    setMassUnit: (...args: unknown[]) => mockSetMassUnit(...args),
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

const mockConnectSheet = {
  visible: false,
  activeMetric: null as null | "weight" | "bodyFat" | "leanTissue",
  phase: "explaining" as const,
  historyAttention: false,
  lastSuccessfulSyncAtIso: null as string | null,
  historyLabel: "Not yet",
  statusChipLabel: null as string | null,
  bodyScopeConnected: false,
  scopesLoaded: true,
  metricSync: { weight: true, bodyFat: true, leanTissue: true },
  cardActionsByMetric: {
    weight: {
      kind: "connected" as const,
      label: "Connected",
      chipLabel: "Connected",
      accessibilityLabel: "Apple Health connected for Weight",
    },
    bodyFat: {
      kind: "connected" as const,
      label: "Connected",
      chipLabel: "Connected",
      accessibilityLabel: "Apple Health connected for Body Fat",
    },
    leanTissue: {
      kind: "connected" as const,
      label: "Connected",
      chipLabel: "Connected",
      accessibilityLabel: "Apple Health connected for Lean Mass",
    },
  },
  openForMetric: jest.fn(),
  close: jest.fn(),
  onPrimary: jest.fn(),
  onPressCardConnection: jest.fn(),
  onToggleMetricSync: jest.fn(),
  refreshLastUpdatedFromStorage: jest.fn(),
};
jest.mock("@/lib/data/body/useAppleHealthBodyConnectSheet", () => ({
  useAppleHealthBodyConnectSheet: () => mockConnectSheet,
}));

jest.mock("@/lib/ui/body/BodyAppleHealthConnectSheet", () => ({
  BODY_APPLE_HEALTH_SETTINGS_HREF: "/(app)/settings/devices/apple_health",
  BodyAppleHealthConnectSheet: () => null,
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
    isPullRefreshing: false,
    pullRefreshError: null as string | null,
    syncAppleHealthBodyNow: jest.fn(),
    onPullToRefresh: jest.fn(),
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
  const syncNowActions = {
    weight: {
      kind: "sync_now" as const,
      label: "Sync now",
      chipLabel: "Not Connected",
      accessibilityLabel: "Connect Weight to Apple Health",
    },
    bodyFat: {
      kind: "sync_now" as const,
      label: "Sync now",
      chipLabel: "Not Connected",
      accessibilityLabel: "Connect Body Fat to Apple Health",
    },
    leanTissue: {
      kind: "sync_now" as const,
      label: "Sync now",
      chipLabel: "Not Connected",
      accessibilityLabel: "Connect Lean Mass to Apple Health",
    },
  };

  beforeEach(() => {
    mockPush.mockClear();
    mockSetMassUnit.mockClear();
    mockMassUnit = "lb";
    mockConnectSheet.visible = false;
    mockConnectSheet.phase = "explaining";
    mockConnectSheet.cardActionsByMetric = {
      weight: {
        kind: "connected",
        label: "Connected",
        chipLabel: "Connected",
        accessibilityLabel: "Apple Health connected for Weight",
      },
      bodyFat: {
        kind: "connected",
        label: "Connected",
        chipLabel: "Connected",
        accessibilityLabel: "Apple Health connected for Body Fat",
      },
      leanTissue: {
        kind: "connected",
        label: "Connected",
        chipLabel: "Connected",
        accessibilityLabel: "Apple Health connected for Lean Mass",
      },
    };
    mockConnectSheet.openForMetric.mockClear();
    mockConnectSheet.close.mockClear();
    mockConnectSheet.onPrimary.mockClear();
    mockConnectSheet.onPressCardConnection.mockClear();
    mockAccess.mockReturnValue({
      phase: "ready",
      authLoading: false,
      authSnapshot: { kind: "authorized" },
      refreshAuth: jest.fn(),
      onAllowAppleHealthBodyAccess: jest.fn(),
      onOpenAppSettings: jest.fn(),
    });
  });

  it("renders Total Mass → Weight and Components → Body Fat / Lean Mass hierarchy", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toContain("Track weight, body fat, and lean tissue.");
    expect(tree.root.findByProps({ testID: "body-composition-heading-total-mass" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-heading-components" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-weight" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-leanTissue" })).toBeDefined();
    expect(text.indexOf("Total Mass")).toBeLessThan(text.indexOf("Weight"));
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Components"));
    expect(text.indexOf("Components")).toBeLessThan(text.indexOf("Body Fat"));
    expect(text.indexOf("Body Fat")).toBeLessThan(text.indexOf("Lean Mass"));
    expect(text).not.toContain("Add or connect measurements");
    expect(tree.root.findAllByProps({ testID: "body-composition-actions" })).toHaveLength(0);
  });

  it("does not render the previous dense educational landing", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).not.toContain("Health Protection");
    expect(text).not.toContain("Performance Support");
    expect(text).not.toContain("Evidence levels");
    expect(text).not.toContain("Central Adiposity");
    expect(text).not.toMatch(/Body score|Optimized|Excellence/i);
    expect(text).not.toContain("Educational reference");
    expect(text).not.toContain("Population, method, and evidence");
  });

  it("shows populated values with CDC/WHO Weight chart and composition-share BF/Lean graphs", () => {
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
    expect(tree.root.findAllByProps({ testID: "body-metric-educational-bodyFat" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-educational-leanTissue" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-share-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-share-leanTissue" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-scaffold-bodyFat" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-scaffold-leanTissue" })).toHaveLength(0);
    expect(text).toContain("Share of total mass");
    expect(text).not.toContain("Educational reference");
    expect(text).not.toContain("Lower adiposity context");
    expect(text).not.toContain("Mid-range lean-mass context");
    expect(text).toContain("Connected");
    expect(text).toContain("Add measurement");
  });

  it("routes Connected to the in-context status sheet rather than full Apple Health page", () => {
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
    expect(mockConnectSheet.onPressCardConnection).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith("/(app)/settings/devices/apple_health");
  });

  it("shows Sync now when Apple Health is not yet connected for this account", () => {
    mockConnectSheet.cardActionsByMetric = syncNowActions;
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
    expect(collectText(tree)).not.toContain("Connected");
    const connection = tree.root.findByProps({ testID: "body-metric-connection-weight" });
    expect(connection.props.accessibilityLabel).toMatch(/Apple Health/i);
  });

  it("opens Body connect sheet from Sync now without pushing full Apple Health route", () => {
    mockConnectSheet.cardActionsByMetric = syncNowActions;
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
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockConnectSheet.onPressCardConnection).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith("/(app)/settings/devices/apple_health");
    expect(onAllow).not.toHaveBeenCalled();
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

  it("opens Weight Apple Health sheet from Sync now without requesting permissions on that tap", () => {
    mockConnectSheet.cardActionsByMetric = syncNowActions;
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
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockConnectSheet.onPressCardConnection).toHaveBeenCalledWith("weight");
    expect(mockPush).not.toHaveBeenCalledWith("/(app)/settings/devices/apple_health");
    expect(onAllow).not.toHaveBeenCalled();
  });

  it("toggles Weight mass|BMI view without opening detail or mutating mass preference", () => {
    mockHook.mockReturnValue(buildPopulatedBody());
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-view-weight-bmi" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockPush).not.toHaveBeenCalledWith(BODY_METRIC_DETAIL_HREFS.weight);
    expect(mockSetMassUnit).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "body-metric-view-weight-bmi" })).toBeDefined();
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
