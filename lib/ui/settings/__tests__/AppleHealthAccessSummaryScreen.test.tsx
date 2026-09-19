import React from "react";
import renderer, { act } from "react-test-renderer";

import { AppleHealthAccessSummaryScreen } from "@/lib/ui/settings/AppleHealthAccessSummaryScreen";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn(async () => "tok"),
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
  it("renders simple access summary without backfill controls", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(AppleHealthAccessSummaryScreen));
      await Promise.resolve();
      await Promise.resolve();
    });
    const text = collectText(tree);
    expect(text).toContain("Apple Health");
    expect(text).toContain("DATA OLI USES");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Weight, Body Fat, Lean Tissue");
    expect(text).toContain("Activity");
    expect(text).toContain("CONNECTION");
    expect(text).not.toMatch(/Backfill|RawEvent|Anchor|Repair/i);
    expect(text).not.toMatch(/Supported categories/i);
    expect(tree.root.findAllByProps({ testID: "apple-health-connect-all" })).toHaveLength(0);
    const icon = tree.root.findByType("Ionicons");
    expect(icon.props.color).toBe("#FF2D55");
    expect(icon.props.name).toBe("heart");
  });
});
