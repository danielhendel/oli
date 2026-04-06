// app/(app)/(tabs)/__tests__/dash-recap.test.tsx
import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
  ActivityIndicator: "ActivityIndicator",
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

const mockUseDashRecapData = jest.fn();
jest.mock("@/lib/data/dash/useDashRecapData", () => ({
  useDashRecapData: () => mockUseDashRecapData(),
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

describe("Dash Recap card", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseDashRecapData.mockReset();
  });

  it("renders Daily Recap before Stacks and tagline when model is ready", () => {
    mockUseDashRecapData.mockReturnValue({
      kind: "ready",
      dayKey: "2026-04-05",
      rows: [
        {
          id: "weight",
          label: "Weight",
          valueText: "176.4 lb",
          isPlaceholder: false,
          bar: { kind: "none" },
        },
        {
          id: "cardioSessions",
          label: "Cardio Sessions",
          valueText: "2",
          isPlaceholder: false,
          bar: { kind: "placement", markerPosition01: 0.33 },
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    const idxRecap = text.indexOf("Daily Recap");
    const idxStacks = text.indexOf("Stacks");
    const idxTagline = text.indexOf("Optimize your health and fitness — all in one place.");
    expect(idxRecap).toBeGreaterThan(-1);
    expect(text).toContain("View More");
    expect(idxStacks).toBeGreaterThan(-1);
    expect(idxTagline).toBeGreaterThan(-1);
    expect(idxStacks).toBeGreaterThan(idxRecap);
    expect(idxTagline).toBeGreaterThan(idxStacks);
    expect(text).toContain("176.4 lb");
    expect(text).toContain("Cardio Sessions");
    expect(text).toContain("2");

    const vm = findPressableWithA11y(test.root, "View more daily recap");
    expect(vm).not.toBeNull();
    act(() => {
      (vm as renderer.ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/dash/daily-recap");
  });

  it("shows loading copy when recap model is loading", () => {
    mockUseDashRecapData.mockReturnValue({ kind: "loading" });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Daily Recap");
    expect(text).toContain("Loading yesterday's summary");
  });

  it("shows missing-doc hint when model is missing_doc", () => {
    mockUseDashRecapData.mockReturnValue({
      kind: "missing_doc",
      dayKey: "2026-04-05",
      rows: [
        { id: "weight", label: "Weight", valueText: "—", isPlaceholder: true, bar: { kind: "none" } },
        { id: "sleep", label: "Sleep", valueText: "—", isPlaceholder: true, bar: { kind: "none" } },
        { id: "steps", label: "Steps", valueText: "—", isPlaceholder: true, bar: { kind: "none" } },
        {
          id: "strengthWorkouts",
          label: "Strength Workouts",
          valueText: "—",
          isPlaceholder: true,
          bar: { kind: "none" },
        },
        { id: "cardioSessions", label: "Cardio Sessions", valueText: "—", isPlaceholder: true, bar: { kind: "none" } },
        { id: "calories", label: "Calories", valueText: "—", isPlaceholder: true, bar: { kind: "none" } },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("No daily rollup for yesterday yet");
  });
});
