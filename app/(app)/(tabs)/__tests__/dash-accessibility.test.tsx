// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash (Oli OS 1.0 — manage your data cards)

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@/lib/hooks/useActivityBaseline", () => ({
  useActivityBaseline: () => ({
    user: { uid: "u1" },
    initializing: false,
    loading: true,
    error: null,
    model: null,
  }),
}));

jest.mock("@/lib/hooks/useStrengthBaseline", () => ({
  useStrengthBaseline: () => ({
    user: { uid: "u1" },
    initializing: false,
    loading: true,
    error: null,
    model: null,
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s },
  Easing: {
    out: (e: (t: number) => number) => e,
    cubic: (t: number) => t * t * t,
  },
  Animated: {
    View: "Animated.View",
    Value: function (initial: number) {
      return {
        _value: initial,
        interpolate: () => "0%",
        setValue: jest.fn(),
      };
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

  it("exposes Activity baseline loading label with navigation intent", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const activity = findPressablesWithLabel(
      test.root,
      "Activity. Loading 90-day average steps. Opens Activity.",
    );
    expect(activity.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Body Composition card", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const body = findPressablesWithLabel(
      test.root,
      "Body Composition. Log and track weight and body metrics. Opens Body Composition.",
    );
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Strength baseline and Cardio cards", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const strength = findPressablesWithLabel(
      test.root,
      "Strength. Loading 90-day average workouts per week. Opens Strength.",
    );
    expect(strength.length).toBeGreaterThanOrEqual(1);
    const cardio = findPressablesWithLabel(
      test.root,
      "Cardio. Runs, rides, and Apple Health sessions. Opens Cardio.",
    );
    expect(cardio.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Dash section heading", () => {
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
    expect(text).toContain("Dash");
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
