// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash Daily Energy card.

import React, { act } from "react";
import renderer from "react-test-renderer";

import { emptyDailySleepCardModel } from "@/lib/data/dash/buildDailySleepCardModel";

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
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
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
    mockUseTodayHealthHero.mockReset();
    mockUseTodayHealthHero.mockReturnValue({
      vm: HERO_VM_BASE,
      energyLoading: false,
      energyError: null,
      energy: undefined,
      sleepCard: emptyDailySleepCardModel("2026-05-11"),
      sleepCardLoading: false,
      sleepCardRefreshing: false,
      sleepCardError: null,
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
    /** Legacy hero is gone. */
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
    /** Body Composition card row is present. */
    expect(text).toContain("159 lb");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Weekly Fitness");
    /** Daily Energy still renders. */
    expect(text).toContain("Daily Energy");
    expect(text).toContain("Daily Nutrition");
    expect(text).toContain("Daily Sleep");
    /** Legacy hero row used plain "Sleep" / "Recovery" labels; dedicated card uses "Daily Sleep". */
    expect(text).not.toContain("Last night summary");

    /** Today hero precedes Weekly Fitness; then Body Composition, Daily Energy, Daily Sleep, Daily Nutrition. */
    const idxHero = text.indexOf("Good afternoon");
    const idxWeeklyFitness = text.indexOf("Weekly Fitness");
    const idxBody = text.indexOf("Body Composition");
    const idxEnergy = text.indexOf("Daily Energy");
    const idxSleepCard = text.indexOf("Daily Sleep");
    const idxNutrition = text.indexOf("Daily Nutrition");
    expect(idxHero).toBeGreaterThan(-1);
    expect(idxWeeklyFitness).toBeGreaterThan(idxHero);
    expect(idxBody).toBeGreaterThan(idxWeeklyFitness);
    expect(idxEnergy).toBeGreaterThan(idxBody);
    expect(idxSleepCard).toBeGreaterThan(idxEnergy);
    expect(idxNutrition).toBeGreaterThan(idxSleepCard);
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
