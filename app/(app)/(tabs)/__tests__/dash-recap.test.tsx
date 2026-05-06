// app/(app)/(tabs)/__tests__/dash-recap.test.tsx
// Dash Daily Energy hero card.

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

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

const mockUseDailyEnergyCard = jest.fn();
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (...args: unknown[]) => mockUseDailyEnergyCard(...args),
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

describe("Dash Daily Energy card", () => {
  beforeEach(() => {
    mockUseDailyEnergyCard.mockReset();
  });

  it("renders Dash heading, tagline, and Daily Energy hero", () => {
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

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    const idxDashHeading = text.indexOf("Dash");
    const idxTagline = text.indexOf("Track, understand, and improve every part of your health.");
    expect(idxDashHeading).toBeGreaterThan(-1);
    expect(idxTagline).toBeGreaterThan(-1);
    expect(idxDashHeading).toBeLessThan(idxTagline);
    expect(text).toContain("Daily Energy");
    expect(text).toContain("2,120–2,480 kcal");
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
  });

  it("shows loading copy while Daily Energy is hydrating", () => {
    mockUseDailyEnergyCard.mockReturnValue({
      loading: true,
      error: null,
      refetch: jest.fn(),
      energy: undefined,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Loading daily energy");
  });

  it("shows empty-state copy when energy is missing", () => {
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
