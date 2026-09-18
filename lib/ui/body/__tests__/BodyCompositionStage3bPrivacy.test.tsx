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

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  Modal: "Modal",
  ScrollView: "ScrollView",
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
  useRouter: () => ({ push: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
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

const mockOnAllow = jest.fn();
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
    syncAppleHealthBodyNow: mockRunBodySync,
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

const Screen = require("../../../../app/(app)/body/index").default as React.ComponentType;

describe("Body Composition Stage 3B source privacy", () => {
  beforeEach(() => {
    mockRequestPermissions.mockClear();
    mockRunBodySync.mockClear();
    mockRunBodyBackfill.mockClear();
    mockIngest.mockClear();
    mockOnAllow.mockClear();
  });

  it("does not request HealthKit, sync, ingest, or backfill on mount", () => {
    act(() => {
      renderer.create(React.createElement(Screen));
    });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRunBodySync).not.toHaveBeenCalled();
    expect(mockRunBodyBackfill).not.toHaveBeenCalled();
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("invokes only the explicit Apple Health access path when the user taps Connect", () => {
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
    expect(mockOnAllow).toHaveBeenCalledTimes(1);
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
    expect(text).toContain("Lean Tissue");
  });
});
