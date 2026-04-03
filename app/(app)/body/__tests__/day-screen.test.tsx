import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

const mockHook = jest.fn();
jest.mock("@/lib/data/body/useBodyCompositionData", () => ({
  useBodyCompositionData: (...args: unknown[]) => mockHook(...args),
}));

const Screen = require("../day/[day]").default as React.ComponentType;

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("Body day detail screen", () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReset();
    mockHook.mockReset();
  });

  it("renders BMI, lean body mass, and RMR when present", () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "2026-03-31" });
    mockHook.mockReturnValue({
      byDay: new Map(),
      series: { status: "ready", data: { points: [], latest: null }, refetch: jest.fn() },
      dayFacts: {
        status: "ready",
        data: {
          body: {
            weightKg: 80,
            bodyFatPercent: 18.2,
            bmi: 24.2,
            leanBodyMassKg: 60,
            restingMetabolicRateKcal: 1780,
          },
        },
      },
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("Weight");
    expect(text).toContain("176.4 lb");
    expect(text).toContain("BMI");
    expect(text).toContain("24.2");
    expect(text).toContain("Lean Body Mass");
    expect(text).toContain("132.3 lb");
    expect(text).toContain("RMR");
    expect(text).toContain("1780 kcal/day");
  });

  it("shows empty state when no entries and no day facts", () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "2026-03-31" });
    mockHook.mockReturnValue({
      byDay: new Map(),
      series: { status: "ready", data: { points: [], latest: null }, refetch: jest.fn() },
      dayFacts: { status: "missing" },
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const text = collectText(tree);
    expect(text).toContain("No data for this day");
  });
});
