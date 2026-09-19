import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  BODY_APPLE_HEALTH_SETTINGS_HREF,
  BodyAppleHealthConnectSheet,
} from "@/lib/ui/body/BodyAppleHealthConnectSheet";
import {
  BODY_APPLE_HEALTH_ICON_COLOR_MUTED,
  BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
} from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import { UI_APPLE_HEALTH_TOGGLE_ON } from "@/lib/ui/theme/uiTokens";

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

describe("BodyAppleHealthConnectSheet", () => {
  it("healthy connected shows interactive scope toggles, settings link, Done", () => {
    const onSettings = jest.fn();
    const onToggle = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          bodyScopeConnected: true,
          metricSync: { weight: true, bodyFat: true, leanTissue: false },
          onToggleMetricSync: onToggle,
          lastSuccessfulSyncAtIso: new Date().toISOString(),
          onOpenAppleHealthSettings: onSettings,
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Connected");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Tissue");
    expect(text).toContain("Last updated");
    expect(text).toContain("Body history");
    expect(text).toContain("Apple Health settings");
    expect(text).toContain("Done");
    expect(text).not.toMatch(/Oli keeps these measurements/i);
    expect(text).not.toMatch(/Sync latest|Review access|Manage Apple Health/i);
    expect(tree.root.findAllByType("ActivityIndicator")).toHaveLength(0);

    const weightToggle = tree.root
      .findAll((n) => n.props?.testID === "body-ah-sheet-scope-weight" && n.type === "Pressable")
      .at(0);
    expect(weightToggle).toBeDefined();
    expect(weightToggle!.props.accessibilityRole).toBe("switch");
    expect(weightToggle!.props.accessibilityState.checked).toBe(true);
    expect(weightToggle!.props.accessibilityLabel).toMatch(/sync with Apple Health/i);
    expect(weightToggle!.props.accessibilityLabel).not.toMatch(/permission granted/i);

    const leanToggle = tree.root
      .findAll((n) => n.props?.testID === "body-ah-sheet-scope-lean-tissue" && n.type === "Pressable")
      .at(0);
    expect(leanToggle!.props.accessibilityState.checked).toBe(false);

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

    act(() => {
      weightToggle!.props.onPress();
    });
    expect(onToggle).toHaveBeenCalledWith("weight", false);

    const icon = tree.root.findByType("Ionicons");
    expect(icon.props.color).toBe(BODY_APPLE_HEALTH_ICON_COLOR_STRONG);
    expect(icon.props.color).not.toBe(BODY_APPLE_HEALTH_ICON_COLOR_MUTED);

    act(() => {
      tree.root.findByProps({ testID: "body-ah-sheet-settings-link" }).props.onPress();
    });
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(BODY_APPLE_HEALTH_SETTINGS_HREF).toBe("/(app)/settings/devices/apple_health");
  });

  it("explaining still shows Connect & import history", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "explaining",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
        }),
      );
    });
    expect(collectText(tree)).toContain("Connect & import history");
  });

  it("history incomplete shows Resume history", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "historyIncomplete",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          historyAttention: true,
        }),
      );
    });
    expect(collectText(tree)).toContain("Resume history");
  });
});
