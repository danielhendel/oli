// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Dash shows title, subtitle, and Daily Energy hero card.

import React, { act } from "react";
import renderer from "react-test-renderer";

<<<<<<< HEAD
const mockUseTodayHealthHero = jest.fn();
jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: (...args: unknown[]) => mockUseTodayHealthHero(...args),
}));

const HERO_VM_BASE = {
  greetingPhrase: "Good afternoon",
  firstName: null as string | null,
  dateLine: "Wednesday, May 7",
  loading: false,
  sleepRecovery: {
    sleepDisplay: "\u2014",
    recoveryDisplay: "\u2014",
    footerLabel: "Last night",
    loading: false,
    accessibilityLabel:
      "Last night summary. Sleep not available. Recovery not available.",
  },
};

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/dash/useBodyCompositionDashCard", () => ({
  useBodyCompositionDashCard: () => ({
    loading: false,
    error: null,
    hasUser: true,
    goalsHref: "/(app)/body/settings",
    built: {
      tag: "ready" as const,
      weightPrimaryLabel: "159 lb",
      readingAsOfLabel: "As of today",
      rows: [],
      cardAccessibilityLabel: "bc",
    },
  }),
}));

jest.mock("@/lib/data/dash/useWeeklyFitnessCard", () => ({
  useWeeklyFitnessCard: () => ({
    loading: false,
    error: null,
    rows: [],
    combined: { progress: 0, percent: 0, enabledCategoryCount: 0 },
    progressToGoalVm: {
      strength: { primary: "Goal not set", support: "" },
      activity: { primary: "Goal not set", support: "" },
      cardio: { primary: "Goal not set", support: "" },
      accessibilityLabel: "Progress to goal. Goal not set. Goal not set. Goal not set.",
    },
    goals: {
      activityStepsPerDayGoal: 10000,
      strengthWorkoutsPerWeekGoal: 5,
      cardioMilesPerWeekGoal: 10,
      isDefault: true,
    },
    goalsHref: "/(app)/fitness-goals",
  }),
}));

=======
const mockUseDailyEnergyCard = jest.fn();
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (...args: unknown[]) => mockUseDailyEnergyCard(...args),
}));

>>>>>>> origin/main
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
    inOut: (fn: (t: number) => number) => fn,
    quad: (t: number) => t * t,
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
    sequence: () => ({ start: jest.fn() }),
    loop: () => ({ start: jest.fn(), stop: jest.fn() }),
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

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Circle: "Circle",
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
<<<<<<< HEAD
    mockUseTodayHealthHero.mockReset();
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
=======
    mockUseDailyEnergyCard.mockReset();
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
>>>>>>> origin/main
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

  it("shows Oli tab title and Body Composition + Daily Energy sections", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli");
<<<<<<< HEAD
    expect(text).toContain("Body Composition");
    expect(text).toContain("Daily Energy");
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
=======
    expect(text).toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("Daily Energy");
>>>>>>> origin/main
  });

  it("renders only non-chevron vector icons on Dash (e.g. Settings gear)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    expect(countDashIconPlaceholders(test.root)).toBe(1);
  });

<<<<<<< HEAD
  it("renders factor rows on Daily Energy without legacy Dash tagline", () => {
=======
  it("shows Dash section heading, tagline, and energy factors", () => {
>>>>>>> origin/main
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
<<<<<<< HEAD
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("Body Composition");
=======
    expect(text).toContain("Dash");
    expect(text).toContain("Track, understand, and improve every part of your health.");
>>>>>>> origin/main
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
    expect(text).toContain("Cardio");
    expect(text).toContain("Strength");
<<<<<<< HEAD
    expect(text).toContain("Weekly Fitness");
    expect(text).toContain("Progress to goal");
    expect(text).toContain("Daily Nutrition");
=======
    expect(text).not.toContain("Body Composition");
    expect(text).not.toContain("Nutrition");
>>>>>>> origin/main
    expect(text).not.toContain("Readiness");
    expect(text).not.toContain("Labs");
  });

  it("renders empty-state copy when energy is unavailable", () => {
<<<<<<< HEAD
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
=======
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
>>>>>>> origin/main
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
