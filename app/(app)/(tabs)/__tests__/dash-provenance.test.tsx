// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Dash shows title, subtitle, and Daily Energy hero card.

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

function countDashIconPlaceholders(root: renderer.ReactTestInstance): number {
  return root.findAll(
    (n) => (n.props as { "data-testid"?: string } | undefined)?.["data-testid"] === "icon",
  ).length;
}

describe("Dash provenance", () => {
  beforeEach(() => {
    mockUseDailyEnergyCard.mockReset();
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
      refetch: jest.fn(),
      energy: {
        modelVersion: "daily_energy_v3",
        computedAt: "2026-05-05T12:00:00.000Z",
        day: "2026-05-05",
        estimatedKcal: { low: 2120, high: 2480, midpoint: 2300 },
        variancePct: 0.081,
        confidence: "moderate",
        factors: {
          baseline: { kcal: 1680 },
          steps: { kcal: 320 },
          cardio: { kcal: 180 },
          strength: { kcalLow: 90, kcalHigh: 180 },
        },
        missingRequiredInputs: [],
      },
    });
  });

  it("shows Oli title and Dash section tagline", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli");
    expect(text).toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("Daily Energy");
  });

  it("renders only non-chevron vector icons on Dash (e.g. Settings gear)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    expect(countDashIconPlaceholders(test.root)).toBe(1);
  });

  it("shows Dash section heading, tagline, and energy factors", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Dash");
    expect(text).toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
    expect(text).toContain("Cardio");
    expect(text).toContain("Strength");
    expect(text).not.toContain("Body Composition");
    expect(text).not.toContain("Nutrition");
    expect(text).not.toContain("Readiness");
    expect(text).not.toContain("Labs");
  });

  it("renders empty-state copy when energy is unavailable", () => {
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
      refetch: jest.fn(),
      energy: undefined,
    });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Not enough data yet to estimate energy.");
  });
});
