// app/(app)/body/__tests__/weight-screen.test.tsx
// Weight Page v1: no-data state, range selector, manual log CTA when not connected.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready",
      preferences: { units: { mass: "lb" } },
    },
  }),
}));

jest.mock("@/lib/data/useWithingsPresence", () => ({
  useWithingsPresence: () => ({
    status: "ready",
    data: {
      connected: false,
      lastMeasurementAt: null,
      hasRecentData: false,
    },
    refetch: jest.fn(),
  }),
}));

const emptyViewModel = {
  points: [],
  latest: null,
  avg7Kg: null,
  weeklyDeltaKg: null,
  rolling7: [],
  insights: {
    change30dKg: null,
    weeklyRateKg: null,
    consistency: "medium" as const,
    volatilityKg: null,
    streakDays: 0,
    trendNote: "Not enough data",
  },
};

jest.mock("@/lib/data/useWeightSeries", () => ({
  useWeightSeries: () => ({
    status: "ready",
    data: emptyViewModel,
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BodyWeightScreen = require("../weight").default;

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
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  for (const p of pressables) {
    if ((p.props as { accessibilityLabel?: string }).accessibilityLabel === label) return p;
  }
  return null;
}

describe("Weight screen", () => {
  it("renders in no-data state without crashing", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Weight");
    expect(text).toContain("Daily weigh-ins & trends");
    expect(text).toContain("No recent trend yet");
  });

  it("renders range selector with 7D, 30D, 90D, 1Y, All", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("7D");
    expect(text).toContain("30D");
    expect(text).toContain("90D");
    expect(text).toContain("1Y");
    expect(text).toContain("All");
  });

  it("shows Log your weight button when not connected", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const btn = findPressableWithLabel(test.root, "Log your weight");
    expect(btn).not.toBeNull();
  });

  it("shows No scale connected and Connect Withings when not connected", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("No scale connected");
    expect(text).toContain("Connect a device to auto-sync weight.");
    const connectBtn = findPressableWithLabel(test.root, "Connect Withings");
    expect(connectBtn).not.toBeNull();
  });
});
