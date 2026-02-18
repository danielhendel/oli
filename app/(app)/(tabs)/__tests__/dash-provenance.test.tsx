// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Dash (Oli OS 1.0) shows title, subtitle, and manage-your-data cards that navigate to real routes

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
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

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
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

function findPressableWithLabel(
  root: renderer.ReactTestInstance,
  label: string
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  for (const p of pressables) {
    if ((p.props as { accessibilityLabel?: string }).accessibilityLabel === label) return p;
  }
  return null;
}

describe("Dash provenance", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("shows Oli title and manage-your-health subtitle", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli");
    expect(text).toContain("Manage your health and fitness — all in one place.");
  });

  it("shows Manage your data section label and cards", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Manage your data");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Workouts");
    expect(text).toContain("Nutrition");
    expect(text).toContain("Sleep");
    expect(text).toContain("Readiness");
    expect(text).toContain("Labs");
  });

  it("pressing Body Composition card navigates to body/weight", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const card = findPressableWithLabel(
      test.root,
      "Body Composition. Log and track weight and body metrics"
    );
    expect(card).not.toBeNull();
    act(() => {
      (card as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/weight");
  });

  it("pressing Labs card navigates to labs", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const card = findPressableWithLabel(
      test.root,
      "Labs. Lab results and biomarkers"
    );
    expect(card).not.toBeNull();
    act(() => {
      (card as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/labs");
  });
});
