// app/(app)/(tabs)/__tests__/dash-recap.test.tsx
// Dash Daily Energy hero card.

import React, { act } from "react";
import renderer from "react-test-renderer";


jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
  ActivityIndicator: "ActivityIndicator",
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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

const mockUseTodayHealthHero = jest.fn();
jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: (...args: unknown[]) => mockUseTodayHealthHero(...args),
}));

jest.mock("@/lib/hooks/useTodayCommand", () => ({
  useTodayCommand: () => ({
    model: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => ({
    vm: { status: "missing", day: "2026-05-11", message: "Waiting for Oura readiness data." },
    refetch: jest.fn(),
  }),
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

jest.mock("@/components/navigation/ManageNavigationContext", () => ({
  useManageNavigation: () => ({
    manageVisible: false,
    menuAnchor: null,
    openManage: jest.fn(),
    closeManage: jest.fn(),
  }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

const mockUseBodyCompositionDashCard = jest.fn(() => ({
  loading: false,
  error: null,
  hasUser: true,
  goalsHref: "/(app)/body/settings",
  refresh: jest.fn(),
  built: {
    tag: "ready" as const,
    weightPrimaryLabel: "159.3 lb",
    readingAsOfLabel: "As of today",
    rows: [
      {
        key: "bmi" as const,
        label: "BMI",
        valueLabel: "23.1",
        bar: { marker01: 0.72, zone: "good", displayLabel: "Good", hasValue: true },
        accessibilityLabel: "a11y",
      },
      {
        key: "bodyFat" as const,
        label: "Body Fat",
        valueLabel: "18.0%",
        bar: { marker01: 0.65, zone: "fair", displayLabel: "Fair", hasValue: true },
        accessibilityLabel: "a11y",
      },
      {
        key: "leanMass" as const,
        label: "Lean Mass",
        valueLabel: "130.4 lb",
        bar: { marker01: 0.8, zone: "optimal", displayLabel: "Optimal", hasValue: true },
        accessibilityLabel: "a11y",
      },
    ],
    cardAccessibilityLabel: "Body composition card.",
  },
}));
jest.mock("@/lib/data/dash/useBodyCompositionDashCard", () => ({
  useBodyCompositionDashCard: (...args: unknown[]) => mockUseBodyCompositionDashCard(...args),
}));

jest.mock("@/lib/data/dash/useWeeklyFitnessCard", () => ({
  useWeeklyFitnessCard: () => ({
    loading: false,
    error: null,
    rows: [],
    combined: { progress: 0, percent: 0, enabledCategoryCount: 0 },
    progressToGoalVm: {
      items: [
        { key: "activity", iconKey: "activity", primary: "Goal not set", support: "" },
        { key: "strength", iconKey: "strength", primary: "Goal not set", support: "" },
        { key: "cardio", iconKey: "cardio", primary: "Goal not set", support: "" },
        { key: "sleep", iconKey: "sleep", primary: "Goal not set", support: "" },
      ],
      accessibilityLabel: "Progress to goal. Goal not set. Goal not set. Goal not set. Goal not set.",
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

const mockUseDailyNutritionCard = jest.fn(() => ({
  model: {
    calorieLabel: "1,850 kcal",
    hasAnyNutrition: true,
    rows: [
      { key: "protein", label: "Protein", valueLabel: "142 g" },
      { key: "carbs", label: "Carbs", valueLabel: "210 g" },
      { key: "fat", label: "Fat", valueLabel: "64 g" },
    ] as const,
  },
  loading: false,
  error: null,
}));
jest.mock("@/lib/data/dash/useDailyNutritionCard", () => ({
  useDailyNutritionCard: (...args: unknown[]) => mockUseDailyNutritionCard(...args),
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
    mockUseTodayHealthHero.mockReset();
  });

  it("renders Weekly Fitness first and removes Sleep/Recovery summary", () => {
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
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
      sleepCardVm: {
        status: "missing",
        day: "2026-05-05",
        message: "No sleep data logged for this day.",
      },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    /** Legacy title + tagline must be gone (audit-driven removal). */
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
    /** Weekly Fitness + remaining cards. */
    expect(text).toContain("Weekly Fitness");
    expect(text).toContain("Body Composition");
    expect(text).toContain("159.3 lb");
    expect(text).toContain("BMI");
    expect(text).toContain("Lean Mass");
    expect(text).toContain("Daily Energy");
    expect(text).toContain("Daily Nutrition");
    expect(text).toContain("1,850 kcal");
    expect(text).toContain("Protein");
    expect(text).toContain("142 g");
    expect(text).toContain("2,120–2,480 kcal");
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
    expect(text).toContain("Confidence");
    expect(text).toContain("Daily Sleep");

    /** Today hero precedes Weekly Fitness; then Body Composition, Daily Energy, Daily Sleep, Daily Nutrition. */
    const idxHero = text.indexOf("Good afternoon");
    const idxWeeklyFitness = text.indexOf("Weekly Fitness");
    const idxBody = text.indexOf("Body Composition");
    const idxEnergy = text.indexOf("Daily Energy");
    const idxSleep = text.indexOf("Daily Sleep");
    const idxNutrition = text.indexOf("Daily Nutrition");
    expect(idxHero).toBeGreaterThan(-1);
    expect(idxWeeklyFitness).toBeGreaterThan(idxHero);
    expect(idxBody).toBeGreaterThan(idxWeeklyFitness);
    expect(idxEnergy).toBeGreaterThan(idxBody);
    expect(idxSleep).toBeGreaterThan(idxEnergy);
    expect(idxNutrition).toBeGreaterThan(idxSleep);
  });

  it("shows loading copy while Daily Energy is hydrating", () => {
    mockUseTodayHealthHero.mockReturnValue({
      vm: {
        ...HERO_VM_BASE,
        loading: true,
        sleepRecovery: { ...HERO_VM_BASE.sleepRecovery, loading: true },
      },
      energyLoading: true,
      energyError: null,
      refetch: jest.fn(),
      energy: undefined,
      sleepCardVm: { status: "partial", day: "2026-05-05" },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Loading daily energy");
    expect(text).toContain("Daily Sleep");
    expect(text).toContain("Loading daily sleep");
  });

  it("shows empty-state copy when energy is missing", () => {
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
      refetch: jest.fn(),
      energy: undefined,
      sleepCardVm: {
        status: "missing",
        day: "2026-05-05",
        message: "No sleep data logged for this day.",
      },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Not enough data yet to estimate energy.");
  });
});
