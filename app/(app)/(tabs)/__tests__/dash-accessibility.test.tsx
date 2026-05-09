// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash Daily Energy card.

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

const mockUseBodyCompositionDashCard = jest.fn(() => ({
  loading: false,
  error: null,
  hasUser: true,
  goalsHref: "/(app)/body/settings",
  built: {
    tag: "ready" as const,
    weightPrimaryLabel: "159 lb",
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

jest.mock("@/lib/data/dash/useDailyNutritionCard", () => ({
  useDailyNutritionCard: () => ({
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
  }),
=======
const mockUseDailyEnergyCard = jest.fn();
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (...args: unknown[]) => mockUseDailyEnergyCard(...args),
>>>>>>> origin/main
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

function findPressablesWithLabel(
  root: renderer.ReactTestInstance,
  label: string
): renderer.ReactTestInstance[] {
  const pressables = root.findAllByType("Pressable");
  return pressables.filter(
    (p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel === label
  );
}

describe("Dash accessibility", () => {
  beforeEach(() => {
<<<<<<< HEAD
    mockUseTodayHealthHero.mockReset();
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
      energy: undefined,
      refetch: jest.fn(),
    });
    mockUseBodyCompositionDashCard.mockReset();
    mockUseBodyCompositionDashCard.mockReturnValue({
      loading: false,
      error: null,
      hasUser: true,
      goalsHref: "/(app)/body/settings",
      built: {
        tag: "ready" as const,
        weightPrimaryLabel: "159 lb",
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
    });
=======
    mockUseDailyEnergyCard.mockReset();
    mockUseDailyEnergyCard.mockReturnValue({
      loading: false,
      error: null,
      energy: undefined,
      refetch: jest.fn(),
    });
>>>>>>> origin/main
  });

  it("exposes accessibilityLabel on Settings button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const settings = findPressablesWithLabel(test.root, "Settings");
    expect(settings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Daily Energy card accessibility label", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const rootViews = test.root.findAll(
      (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Daily energy card",
    );
    expect(rootViews.length).toBeGreaterThanOrEqual(1);
  });

<<<<<<< HEAD
  it("renders Daily Nutrition card accessibility label", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const rootViews = test.root.findAll(
      (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Daily nutrition card",
    );
    expect(rootViews.length).toBeGreaterThanOrEqual(1);
  });

  it("removes Sleep/Recovery summary and renders Weekly Fitness above Body Composition", () => {
=======
  it("shows Dash section heading", () => {
>>>>>>> origin/main
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const textNodes = test.root.findAllByType("Text");
    const text = textNodes
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");
<<<<<<< HEAD
    /** Legacy hero is gone. */
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
    /** Body Composition card row is present. */
    expect(text).toContain("159 lb");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Weekly Fitness");
    /** Daily Energy still renders. */
    expect(text).toContain("Daily Energy");
    expect(text).toContain("Daily Nutrition");
    expect(text).not.toContain("Sleep");
    expect(text).not.toContain("Recovery");

    /** Today hero precedes Weekly Fitness; then Body Composition then Daily Energy. */
    const idxHero = text.indexOf("Good afternoon");
    const idxWeeklyFitness = text.indexOf("Weekly Fitness");
    const idxBody = text.indexOf("Body Composition");
    const idxEnergy = text.indexOf("Daily Energy");
    expect(idxHero).toBeGreaterThan(-1);
    expect(idxWeeklyFitness).toBeGreaterThan(idxHero);
    expect(idxBody).toBeGreaterThan(idxWeeklyFitness);
    expect(idxEnergy).toBeGreaterThan(idxBody);
=======
    expect(text).toContain("Dash");
    expect(text).toContain("Daily Energy");
>>>>>>> origin/main
  });

  it("keeps at least one actionable button (Settings)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const pressables = test.root.findAllByType("Pressable");
    const withRole = pressables.filter(
      (p) => (p.props as { accessibilityRole?: string }).accessibilityRole === "button"
    );
    expect(withRole.length).toBeGreaterThanOrEqual(1);
  });
});
