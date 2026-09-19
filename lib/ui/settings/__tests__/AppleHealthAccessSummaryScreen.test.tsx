import React from "react";
import renderer, { act } from "react-test-renderer";

import { AppleHealthAccessSummaryScreen } from "@/lib/ui/settings/AppleHealthAccessSummaryScreen";
import { UI_APPLE_HEALTH_TOGGLE_ON } from "@/lib/ui/theme/uiTokens";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const mockGetIdToken = jest.fn(async () => "tok");
const mockUser = { uid: "u1" };

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn(async () => ({
    ok: true,
    json: { connected: true, lastSyncAt: "2026-09-19T12:00:00.000Z" },
  })),
}));

jest.mock("@/lib/integrations/appleHealth/resolveAppleHealthDeviceConnected", () => ({
  resolveAppleHealthDeviceConnected: jest.fn(async () => true),
}));

const mockSetMetric = jest.fn(async () => ({ ok: true as const }));
const mockResolveMap = jest.fn(async () => ({
  weight: true,
  bodyFat: true,
  leanTissue: true,
  steps: true,
  distance: true,
  activeEnergy: true,
  exerciseMinutes: true,
  workouts: true,
  heartRate: true,
  restingHeartRate: true,
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyLastCheckedAt: jest.fn(async () => "2026-09-19T12:00:00.000Z"),
  getAppleHealthConnected: jest.fn(async () => true),
  getAppleHealthDomainScopes: jest.fn(async () => ({
    version: 1,
    body: true,
    activity: true,
    workouts: true,
    cardioVitals: true,
  })),
}));

jest.mock("@/lib/integrations/appleHealth/appleHealthMetricSyncController", () => ({
  enableAllAppleHealthMetricSyncScopes: jest.fn(),
  resolveMetricSyncMap: (...a: unknown[]) => mockResolveMap(...a),
  setAppleHealthMetricSyncEnabled: (...a: unknown[]) => mockSetMetric(...a),
}));

jest.mock("@/lib/onboarding/appleHealthOnboardingConnect", () => ({
  connectAppleHealthForOnboarding: jest.fn(),
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("AppleHealthAccessSummaryScreen", () => {
  beforeEach(() => {
    mockSetMetric.mockClear();
    mockResolveMap.mockClear();
  });

  it("renders grouped metric toggles without backfill controls", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(AppleHealthAccessSummaryScreen));
      await Promise.resolve();
      await Promise.resolve();
    });
    const text = collectText(tree);
    expect(text).toContain("Apple Health");
    expect(text).toContain("BODY COMPOSITION");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat Percentage");
    expect(text).toContain("Lean Body Mass");
    expect(text).toContain("ACTIVITY");
    expect(text).toContain("Steps");
    expect(text).toContain("WORKOUTS");
    expect(text).toContain("Heart Rate");
    expect(text).toContain("CONNECTION");
    expect(text).not.toMatch(/Backfill|RawEvent|Anchor|Repair/i);
    expect(text).not.toMatch(/DATA OLI USES/i);
    expect(tree.root.findAllByProps({ testID: "apple-health-connect-all" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "apple-health-metric-toggle-weight" })).toBeDefined();
    const weightToggle = tree.root
      .findAll(
        (n) => n.props?.testID === "apple-health-metric-toggle-weight" && n.type === "Pressable",
      )
      .at(0);
    expect(weightToggle!.props.accessibilityRole).toBe("switch");

    const onTrack = tree.root
      .findAllByType("View")
      .some(
        (n) =>
          Array.isArray(n.props.style) &&
          n.props.style.some(
            (s: { backgroundColor?: string } | null) =>
              s != null && s.backgroundColor === UI_APPLE_HEALTH_TOGGLE_ON,
          ),
      );
    expect(onTrack).toBe(true);

    const icon = tree.root.findByType("Ionicons");
    expect(icon.props.color).toBe("#FF2D55");
    expect(icon.props.name).toBe("heart");
  });

  it("toggling a metric updates Oli sync scope", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(AppleHealthAccessSummaryScreen));
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      tree.root
        .findAll(
          (n) => n.props?.testID === "apple-health-metric-toggle-steps" && n.type === "Pressable",
        )
        .at(0)!
        .props.onPress();
      await Promise.resolve();
    });
    expect(mockSetMetric).toHaveBeenCalledWith({
      uid: "u1",
      metricId: "steps",
      enabled: false,
    });
  });
});
