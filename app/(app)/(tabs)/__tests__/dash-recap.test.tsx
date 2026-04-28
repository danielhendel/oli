// app/(app)/(tabs)/__tests__/dash-recap.test.tsx
// Dash Activity baseline card (replaces former Daily Recap slot).

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
  ActivityIndicator: "ActivityIndicator",
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

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

const mockUseActivityBaseline = jest.fn();
jest.mock("@/lib/hooks/useActivityBaseline", () => ({
  useActivityBaseline: () => mockUseActivityBaseline(),
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DashScreen = require("../dash").default;

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

function findPressableWithA11y(root: renderer.ReactTestInstance, label: string): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  for (const p of pressables) {
    if ((p.props as { accessibilityLabel?: string }).accessibilityLabel === label) return p;
  }
  return null;
}

describe("Dash Activity baseline card", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseActivityBaseline.mockReset();
  });

  it("renders Dash heading and tagline before Activity baseline when model is ready", () => {
    mockUseActivityBaseline.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      loading: false,
      error: null,
      model: {
        title: "Activity Baseline",
        compactStatsSummary: "12,130 steps",
        markerPosition01: 0.55,
      },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    const idxActivityTitle = text.indexOf("Activity");
    const idxDashHeading = text.indexOf("Dash");
    const idxTagline = text.indexOf("Track, understand, and improve every part of your health.");
    const idxSubtitle = text.indexOf("90-day average steps");
    expect(idxDashHeading).toBeGreaterThan(-1);
    expect(idxTagline).toBeGreaterThan(-1);
    expect(idxActivityTitle).toBeGreaterThan(-1);
    expect(idxSubtitle).toBeGreaterThan(-1);
    expect(idxDashHeading).toBeLessThan(idxTagline);
    expect(idxTagline).toBeLessThan(idxActivityTitle);
    expect(text).toContain("12,130");

    const vm = findPressableWithA11y(
      test.root,
      "Activity. Active. 90-day average steps 12,130. Opens Activity.",
    );
    expect(vm).not.toBeNull();
    act(() => {
      (vm as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/activity");
  });

  it("shows loading copy when baseline is loading", () => {
    mockUseActivityBaseline.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      loading: true,
      error: null,
      model: null,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Loading steps");
  });

  it("shows sign-in hint when there is no user", () => {
    mockUseActivityBaseline.mockReturnValue({
      user: null,
      initializing: false,
      loading: false,
      error: null,
      model: null,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Sign in to see your 90-day step baseline");
  });
});
