import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyAppleHealthConnectSheet } from "@/lib/ui/body/BodyAppleHealthConnectSheet";

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
    expect(text).toContain("Connect Apple Health");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Tissue");
    expect(text).toContain("Connect & import history");
    expect(text).toContain("Not now");
    expect(text).not.toMatch(/Backfill/i);
    act(() => {
      tree.root.findByProps({ testID: "body-ah-sheet-primary" }).props.onPress();
    });
    expect(onPrimary).toHaveBeenCalledTimes(1);
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
    expect(collectText(tree)).toMatch(/Importing earlier Body history/i);
    expect(tree.root.findAllByProps({ testID: "body-ah-sheet-primary" })).toHaveLength(0);
  });
});
