// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Dash (Oli OS 1.0) shows title, subtitle, and manage-your-data cards that navigate to real routes

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@/lib/hooks/useActivityBaseline", () => ({
  useActivityBaseline: () => ({
    user: { uid: "test-user" },
    initializing: false,
    loading: false,
    error: null,
    model: {
      title: "Activity Baseline",
      compactStatsSummary: "8,432 steps",
      markerPosition01: 0.42,
    },
  }),
}));

jest.mock("@/lib/hooks/useStrengthBaseline", () => {
  const { buildStrengthBaselineCardModel } =
    jest.requireActual<typeof import("@/lib/data/workouts/strengthBaselineCardModel")>(
      "@/lib/data/workouts/strengthBaselineCardModel",
    );
  const model = buildStrengthBaselineCardModel({
    strengthCalendarDays: [],
    todayDayKey: "2026-04-14",
  });
  return {
    useStrengthBaseline: () => ({
      user: { uid: "test-user" },
      initializing: false,
      loading: false,
      error: null,
      model,
    }),
  };
});

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

function countDashIconPlaceholders(root: renderer.ReactTestInstance): number {
  return root.findAll(
    (n) => (n.props as { "data-testid"?: string } | undefined)?.["data-testid"] === "icon",
  ).length;
}

describe("Dash provenance", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("shows Oli title and Dash section tagline", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli");
    expect(text).toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("90-day average steps");
  });

  it("renders only non-chevron vector icons on Dash (e.g. Settings gear)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    expect(countDashIconPlaceholders(test.root)).toBe(1);
  });

  it("shows Dash section heading, tagline, and cards", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Dash");
    expect(text).toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Activity");
    expect(text).toContain("Moderately Active");
    expect(text).toContain("Strength");
    expect(text).toContain("90-day average workouts per week");
    expect(text).not.toContain("/wk");
    expect(text).toContain("Cardio");
    expect(text).toContain("Nutrition");
    expect(text).toContain("Sleep");
    expect(text).toContain("Readiness");
    expect(text).toContain("Labs");
  });

  it("orders Activity baseline before Body Composition in reading order", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    const activityIdx = text.indexOf("Activity");
    const bodyIdx = text.indexOf("Body Composition");
    expect(activityIdx).not.toBe(-1);
    expect(bodyIdx).not.toBe(-1);
    expect(activityIdx).toBeLessThan(bodyIdx);
  });

  it("pressing Activity baseline card navigates to activity overview", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const card = findPressableWithLabel(
      test.root,
      "Activity. Moderately Active. 90-day average steps 8,432. Opens Activity.",
    );
    expect(card).not.toBeNull();
    act(() => {
      (card as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/activity");
  });

  it("pressing Strength baseline card navigates to workouts overview", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const { buildStrengthBaselineCardModel } =
      jest.requireActual<typeof import("@/lib/data/workouts/strengthBaselineCardModel")>(
        "@/lib/data/workouts/strengthBaselineCardModel",
      );
    const model = buildStrengthBaselineCardModel({
      strengthCalendarDays: [],
      todayDayKey: "2026-04-14",
    });
    const label = `Strength. ${model.ratingLabel}. 90-day average workouts per week ${model.avgWorkoutsPerWeek.toFixed(1)}. Opens Strength.`;
    const card = findPressableWithLabel(test.root, label);
    expect(card).not.toBeNull();
    act(() => {
      (card as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts");
  });

  it("pressing Body Composition card navigates to body/weight", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const card = findPressableWithLabel(
      test.root,
      "Body Composition. Log and track weight and body metrics. Opens Body Composition.",
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
      "Labs. Lab results and biomarkers. Opens Labs.",
    );
    expect(card).not.toBeNull();
    act(() => {
      (card as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/labs");
  });
});
