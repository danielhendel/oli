// app/(app)/(tabs)/__tests__/dash-composition.test.tsx
// Stage 2 Home: domain map only — Daily Monitor lives on Today.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: jest.fn((opts: object) => ({ type: "NAVIGATE", payload: opts })),
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Platform: { OS: "ios", select: (v: { ios?: unknown; default?: unknown }) => v.ios ?? v.default },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dash",
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

describe("Home composition (Stage 2 domain map)", () => {
  it("shows Oli header, seven categories, and no Daily Monitor content", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);

    expect(text).toContain("Oli");
    expect(text).toContain("My Health & Performance");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Strength");
    expect(text).toContain("Cardio Fitness");
    expect(text).toContain("Nutrition");
    expect(text).toContain("Sleep");
    expect(text).toContain("Recovery");
    expect(text).toContain("Health");

    expect(text).not.toContain("Daily Energy");
    expect(text).not.toContain("Daily Sleep");
    expect(text).not.toContain("Oura Readiness");
    expect(text).not.toContain("Daily Nutrition");
    expect(text).not.toContain("Weekly Fitness");
    expect(text).not.toContain("Weekly Progress");
    expect(text).not.toContain("Today's Progress");
    expect(text).not.toContain("Building your health picture");
    expect(text).not.toContain("Where am I?");

    expect(test.root.findAllByProps({ testID: "daily-monitor-host" })).toHaveLength(0);
    expect(test.root.findAllByProps({ testID: "home-category-card-body_composition" })).toHaveLength(1);
    expect(test.root.findAllByProps({ testID: "home-category-card-health" })).toHaveLength(1);
  });
});
