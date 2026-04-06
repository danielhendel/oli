// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash (Oli OS 1.0 — manage your data cards)

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@/lib/data/dash/useDashRecapData", () => ({
  useDashRecapData: () => ({ kind: "loading" as const }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s },
  Animated: {
    View: "Animated.View",
    Value: function (initial: number) {
      return { _value: initial };
    },
    timing: function () {
      return { start: jest.fn() };
    },
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DashScreen = require("../dash").default;

function findPressablesWithLabel(
  root: renderer.ReactTestInstance,
  label: string
): renderer.ReactTestInstance[] {
  const pressables = root.findAllByType("Pressable");
  return pressables.filter(
    (p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel === label
  );
}

describe("Dash accessibility", () => {
  it("exposes accessibilityLabel on Settings button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const settings = findPressablesWithLabel(test.root, "Settings");
    expect(settings.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Body Composition card", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const body = findPressablesWithLabel(
      test.root,
      "Body Composition. Log and track weight and body metrics"
    );
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Strength and Cardio cards", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const strength = findPressablesWithLabel(
      test.root,
      "Strength. Lift, log sessions, and review training"
    );
    expect(strength.length).toBeGreaterThanOrEqual(1);
    const cardio = findPressablesWithLabel(
      test.root,
      "Cardio. Runs, rides, and Apple Health sessions"
    );
    expect(cardio.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Stacks section heading", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const textNodes = test.root.findAllByType("Text");
    const text = textNodes
      .map((n) =>
        (n.children as (string | number)[]).filter((c) => typeof c === "string" || typeof c === "number").join("")
      )
      .join(" ");
    expect(text).toContain("Stacks");
  });

  it("exposes accessibilityRole button on Settings and all cards", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const pressables = test.root.findAllByType("Pressable");
    const withRole = pressables.filter(
      (p) => (p.props as { accessibilityRole?: string }).accessibilityRole === "button"
    );
    expect(withRole.length).toBeGreaterThanOrEqual(8);
  });
});
