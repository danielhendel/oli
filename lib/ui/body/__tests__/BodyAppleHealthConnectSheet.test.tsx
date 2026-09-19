import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  BODY_APPLE_HEALTH_SETTINGS_HREF,
  BodyAppleHealthConnectSheet,
} from "@/lib/ui/body/BodyAppleHealthConnectSheet";
import { BODY_APPLE_HEALTH_ICON_COLOR_STRONG } from "@/lib/ui/body/BodyAppleHealthSourceIcon";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFillObject: {} },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("BodyAppleHealthConnectSheet — metric-specific", () => {
  it("Weight popup shows Weight only", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          activeMetric: "weight",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          statusChipLabel: "Connected",
          historyLabel: "Up to date",
          metricSync: { weight: true, bodyFat: true, leanTissue: true },
          onToggleMetricSync: jest.fn(),
          onOpenAppleHealthSettings: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Weight");
    expect(text).not.toMatch(/Body Fat/);
    expect(text).not.toMatch(/Lean Tissue/);
    expect(text).toContain("History");
    expect(text).toContain("Done");
    expect(tree.root.findByProps({ testID: "body-ah-sheet-metric-row-weight" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-ah-sheet-metric-row-bodyFat" })).toHaveLength(
      0,
    );
    expect(tree.root.findByType("Ionicons").props.color).toBe(BODY_APPLE_HEALTH_ICON_COLOR_STRONG);
  });

  it("Body Fat popup shows Body Fat only", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          activeMetric: "bodyFat",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          statusChipLabel: "Sync Off",
          metricSync: { weight: true, bodyFat: false, leanTissue: true },
          onToggleMetricSync: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Body Fat");
    expect(text).not.toMatch(/\bWeight\b/);
    expect(text).not.toMatch(/Lean Tissue/);
    expect(tree.root.findByProps({ testID: "body-ah-sheet-status-chip" }).props.accessibilityLabel).toMatch(
      /Sync Off/,
    );
  });

  it("Lean Tissue popup shows Lean Tissue only and settings href is canonical", () => {
    const onSettings = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          activeMetric: "leanTissue",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          metricSync: { weight: false, bodyFat: false, leanTissue: true },
          onToggleMetricSync: jest.fn(),
          onOpenAppleHealthSettings: onSettings,
        }),
      );
    });
    expect(collectText(tree)).toContain("Lean Tissue");
    expect(collectText(tree)).not.toMatch(/\bWeight\b/);
    expect(collectText(tree)).not.toMatch(/Body Fat/);
    act(() => {
      tree.root.findByProps({ testID: "body-ah-sheet-settings-link" }).props.onPress();
    });
    expect(onSettings).toHaveBeenCalled();
    expect(BODY_APPLE_HEALTH_SETTINGS_HREF).toBe("/(app)/settings/devices/apple_health");
  });
});
