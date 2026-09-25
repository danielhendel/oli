/**
 * Stage 3B source-privacy: mounting the educational shell must not invoke HealthKit,
 * body sync, ingest, backfill, or Oura OAuth. Explicit Apple Health action remains gated.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";

const mockRequestPermissions = jest.fn();
const mockRunBodySync = jest.fn();
const mockRunBodyBackfill = jest.fn();
const mockIngest = jest.fn();
const mockPush = jest.fn();
const mockSetMassUnit = jest.fn();
const mockOnAllow = jest.fn();
const mockOpenForConnect = jest.fn();
const mockOpenForMetric = jest.fn();
const mockOnPressCardConnection = jest.fn();

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFillObject: {} },
  Modal: "Modal",
  ScrollView: "ScrollView",
  RefreshControl: "RefreshControl",
  ActivityIndicator: "ActivityIndicator",
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

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
    setMassUnit: (...args: unknown[]) => mockSetMassUnit(...args),
  }),
}));

jest.mock("@/lib/ui/body/BodyMetricManualEntrySheet", () => ({
  BodyMetricManualEntrySheet: () => null,
}));

jest.mock("@/lib/ui/WeightLogModal", () => ({
  WeightLogModal: () => null,
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

jest.mock("@/lib/data/body/useBodyOverviewData", () => ({
  useBodyOverviewData: () => ({
    today: "2026-09-18",
    peek: { status: "ready", items: [], refetch: jest.fn() },
    snapshotDayPeek: { status: "ready", items: [], refetch: jest.fn() },
    weightBaseline: {
      status: "ready",
      model: { kind: "insufficient_data", reason: "no_samples_in_window" },
    },
    series: {
      status: "ready",
      data: { points: [], latest: null },
      refetch: jest.fn(),
    },
    dayFacts: { status: "missing" },
    isBodySyncing: false,
    isPullRefreshing: false,
    pullRefreshError: null,
    syncAppleHealthBodyNow: mockRunBodySync,
    onPullToRefresh: jest.fn(),
    hasSuccessfulBodySync: false,
    weekDays: [],
    markedDays: new Set(),
    byDay: new Map(),
    recent: [],
    stats: { changeKg: null, avgKg: null, highKg: null, lowKg: null },
    weightSamples: [],
    overview: {
      overviewDay: null,
      weightKg: null,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
      hasAnyMetric: false,
    },
  }),
}));

jest.mock("@/lib/data/body/useAppleHealthBodyAccessState", () => ({
  useAppleHealthBodyAccessState: () => ({
    phase: "not_determined",
    authLoading: false,
    authSnapshot: { kind: "not_determined" },
    refreshAuth: jest.fn(),
    onAllowAppleHealthBodyAccess: mockOnAllow,
    onOpenAppSettings: jest.fn(),
  }),
}));

jest.mock("@/lib/data/body/useAppleHealthBodyConnectSheet", () => ({
  useAppleHealthBodyConnectSheet: () => ({
    visible: false,
    phase: "explaining",
    historyAttention: false,
    lastSuccessfulSyncAtIso: null,
    bodyScopeConnected: false,
    openForConnect: mockOpenForConnect,
    openForMetric: mockOpenForMetric,
    close: jest.fn(),
    onPrimary: jest.fn(),
    onPressCardConnection: mockOnPressCardConnection,
    onToggleMetricSync: jest.fn(),
    metricSync: { weight: false, bodyFat: false, leanTissue: false },
    cardActionsByMetric: {
      weight: { kind: "sync_now", label: "Sync now", chipLabel: "Not Connected", accessibilityLabel: "Connect Weight" },
      bodyFat: { kind: "sync_now", label: "Sync now", chipLabel: "Not Connected", accessibilityLabel: "Connect Body Fat" },
      leanTissue: { kind: "sync_now", label: "Sync now", chipLabel: "Not Connected", accessibilityLabel: "Connect Lean Mass" },
    },
    activeMetric: null,
    historyLabel: "Not yet",
    statusChipLabel: null,
    scopesLoaded: true,
    refreshLastUpdatedFromStorage: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/body/BodyAppleHealthConnectSheet", () => ({
  BODY_APPLE_HEALTH_SETTINGS_HREF: "/(app)/settings/devices/apple_health",
  BodyAppleHealthConnectSheet: () => null,
}));

jest.mock("@/lib/data/body/useAppleHealthBodyBackfill", () => ({
  useAppleHealthBodyBackfill: () => ({
    state: { status: "idle", message: null, summary: null },
    start: mockRunBodyBackfill,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWeight: (...args: unknown[]) => mockIngest(...args),
}));

jest.mock("@/lib/data/body-scans/useBodyScans", () => ({
  useBodyScans: () => ({
    status: "ready",
    data: { ok: true, items: [], nextCursor: null },
    refetch: jest.fn(),
  }),
}));

const Screen = require("../../../../app/(app)/body/index").default as React.ComponentType;

describe("Body Composition Stage 3B source privacy", () => {
  beforeEach(() => {
    mockRequestPermissions.mockClear();
    mockRunBodySync.mockClear();
    mockRunBodyBackfill.mockClear();
    mockIngest.mockClear();
    mockOnAllow.mockClear();
    mockPush.mockClear();
    mockSetMassUnit.mockClear();
    mockOpenForConnect.mockClear();
    mockOpenForMetric.mockClear();
    mockOnPressCardConnection.mockClear();
  });

  it("does not request HealthKit, sync, ingest, or backfill on mount", () => {
    act(() => {
      renderer.create(React.createElement(Screen));
    });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRunBodySync).not.toHaveBeenCalled();
    expect(mockRunBodyBackfill).not.toHaveBeenCalled();
    expect(mockIngest).not.toHaveBeenCalled();
    expect(mockOnAllow).not.toHaveBeenCalled();
  });

  it("opens the Body sheet from Sync now without HealthKit/sync yet", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockOnPressCardConnection).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith("/(app)/settings/devices/apple_health");
    expect(mockOnAllow).not.toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRunBodySync).not.toHaveBeenCalled();
  });

  it("does not trigger HealthKit or sync when toggling Weight BMI view", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-view-weight-bmi" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockSetMassUnit).not.toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRunBodySync).not.toHaveBeenCalled();
    expect(mockRunBodyBackfill).not.toHaveBeenCalled();
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("does not present Oura as a Body Composition measurement source", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x) => typeof x === "string")
      .join(" ");
    expect(text).not.toMatch(/Oura/);
    expect(text).not.toContain("Track weight, body fat, and lean tissue.");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Mass");
    expect(text).not.toContain("Add or connect measurements");
  });
});
