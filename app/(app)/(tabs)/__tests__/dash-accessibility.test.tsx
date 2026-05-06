// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash Daily Energy card.

import React, { act } from "react";
import renderer from "react-test-renderer";

const mockUseDailyEnergyCard = jest.fn();
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (...args: unknown[]) => mockUseDailyEnergyCard(...args),
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
  useFocusEffect: (cb: () => void) => cb(),
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
  beforeEach(() => {
    mockUseDailyEnergyCard.mockReset();
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
      energy: undefined,
      refetch: jest.fn(),
    });
  });

  it("exposes accessibilityLabel on Settings button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const settings = findPressablesWithLabel(test.root, "Settings");
    expect(settings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Daily Energy card accessibility label", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const rootViews = test.root.findAll(
      (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Daily energy card",
    );
    expect(rootViews.length).toBeGreaterThanOrEqual(1);
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
    expect(text).toContain("Daily Energy");
  });

  it("keeps at least one actionable button (Settings)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const pressables = test.root.findAllByType("Pressable");
    const withRole = pressables.filter(
      (p) => (p.props as { accessibilityRole?: string }).accessibilityRole === "button"
    );
    expect(withRole.length).toBeGreaterThanOrEqual(1);
  });
});
