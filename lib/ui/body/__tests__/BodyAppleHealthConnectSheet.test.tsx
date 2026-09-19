import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyAppleHealthConnectSheet } from "@/lib/ui/body/BodyAppleHealthConnectSheet";
import { BODY_APPLE_HEALTH_ICON_COLOR } from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import { UI_APPLE_HEALTH_HEART, UI_DASH_CATEGORY_CARD_RADIUS } from "@/lib/ui/theme/uiTokens";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  RefreshControl: "RefreshControl",
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
  it("renders explaining state with metrics and Connect & import history", () => {
    const onPrimary = jest.fn();
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "explaining",
          onClose,
          onPrimary,
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Apple Health");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Tissue");
    expect(text).toContain("Connect & import history");
    expect(text).toContain("Not now");
    expect(text).not.toMatch(/Backfill|Sync latest|Manage Apple Health/i);
    act(() => {
      tree.root.findByProps({ testID: "body-ah-sheet-primary" }).props.onPress();
    });
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("healthy connected shows Last updated, Body history, Done — no Sync/Review/Manage", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          lastSuccessfulSyncAtIso: new Date().toISOString(),
          onRefreshLatest: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Connected");
    expect(text).toContain("Last updated");
    expect(text).toContain("Body history");
    expect(text).toContain("Done");
    expect(text).not.toMatch(/Sync latest/i);
    expect(text).not.toMatch(/Review access/i);
    expect(text).not.toMatch(/Manage Apple Health/i);
    expect(tree.root.findByProps({ testID: "body-ah-sheet-source-title-row" })).toBeDefined();
    const heart = tree.root.findByProps({ testID: "body-apple-health-heart-icon" });
    expect(heart).toBeDefined();
    const icon = tree.root.findByType("Ionicons");
    expect(icon.props.color).toBe(UI_APPLE_HEALTH_HEART);
    expect(icon.props.color).toBe(BODY_APPLE_HEALTH_ICON_COLOR);
    expect(icon.props.name).toBe("heart");
    const sheet = tree.root.findByProps({ testID: "body-apple-health-connect-sheet" });
    expect(sheet).toBeDefined();
    expect(UI_DASH_CATEGORY_CARD_RADIUS).toBeGreaterThan(0);
  });

  it("history incomplete shows Resume history without Review access", () => {
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
    const text = collectText(tree);
    expect(text).toContain("Connected");
    expect(text).toContain("Resume history");
    expect(text).toContain("Incomplete");
    expect(text).not.toMatch(/Review access/i);
    expect(text).not.toMatch(/Manage Apple Health/i);
  });

  it("pull-to-refresh wires RefreshControl for connected status", () => {
    const onRefresh = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedStatus",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
          onRefreshLatest: onRefresh,
          refreshing: false,
        }),
      );
    });
    const scroll = tree.root.findByType("ScrollView");
    expect(scroll.props.refreshControl).toBeTruthy();
    act(() => {
      scroll.props.refreshControl.props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows Importing progress without primary submit", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "importingEarlier",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
        }),
      );
    });
    expect(collectText(tree)).toMatch(/Importing earlier history/i);
    expect(tree.root.findAllByProps({ testID: "body-ah-sheet-primary" })).toHaveLength(0);
  });

  it("connectedNoData does not claim permission denial", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyAppleHealthConnectSheet, {
          visible: true,
          phase: "connectedNoData",
          onClose: jest.fn(),
          onPrimary: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toMatch(/No Body measurements were found yet/i);
    expect(text).not.toMatch(/permission denied|access blocked|Review access/i);
  });
});
