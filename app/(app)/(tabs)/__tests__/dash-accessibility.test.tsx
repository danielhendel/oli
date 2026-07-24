// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// UX Integrity: accessibility labels and roles on Dash Daily Energy card.

import React, { act } from "react";
import renderer from "react-test-renderer";

import { setDashWeeklyProgressRelocationEnabledForTests } from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { setDashDailyMonitorFoundationEnabledForTests } from "@/lib/data/dash/dashDailyMonitorFoundation";

const mockUseTodayHealthHero = jest.fn();
jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: (...args: unknown[]) => mockUseTodayHealthHero(...args),
}));

jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => ({
    vm: { status: "missing", day: "2026-05-11", message: "Waiting for Oura readiness data." },
    refetch: jest.fn(),
  }),
}));

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
    overviewDay: "2026-05-11",
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
    model: null,
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
    setDashDailyMonitorFoundationEnabledForTests(false);
    setDashWeeklyProgressRelocationEnabledForTests(true);
    mockUseTodayHealthHero.mockReset();
    mockUseTodayHealthHero.mockReturnValue({
      energyLoading: false,
      energyError: null,
      energy: undefined,
      sleepCardVm: {
        status: "missing",
        day: "2026-05-11",
        message: "No sleep data logged for this day.",
      },
      refetch: jest.fn(),
    });
    mockUseBodyCompositionDashCard.mockReset();
    mockUseBodyCompositionDashCard.mockReturnValue({
      loading: false,
      error: null,
      hasUser: true,
      goalsHref: "/(app)/body/settings",
    overviewDay: "2026-05-11",
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
    });
  });

  afterEach(() => {
    setDashWeeklyProgressRelocationEnabledForTests(null);
    setDashDailyMonitorFoundationEnabledForTests(null);
  });

  it("exposes accessibilityLabel on settings initial button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const settings = findPressablesWithLabel(test.root, "Open settings");
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

  it("removes Sleep/Recovery summary; Body Composition is first when relocation is enabled", () => {
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
    expect(text).not.toContain("Good afternoon");
    expect(text).not.toContain("Today's Progress");
    /** Body Composition card row is present. */
    expect(text).toContain("159.3 lb");
    expect(text).toContain("Body Composition");
    expect(text).not.toContain("Weekly Fitness");
    /** Daily Energy still renders. */
    expect(text).toContain("Daily Energy");
    expect(text).toContain("Daily Nutrition");
    expect(text).toContain("Daily Sleep");
    expect(text).toContain("Oura Readiness");
    /** Legacy hero row used plain "Sleep" / "Recovery" labels; dedicated card uses "Daily Sleep". */
    expect(text).not.toContain("Last night summary");

    /** Body first when Weekly Progress is relocated; then Energy, Sleep, Readiness, Nutrition. */
    const idxBody = text.indexOf("Body Composition");
    const idxEnergy = text.indexOf("Daily Energy");
    const idxSleepCard = text.indexOf("Daily Sleep");
    const idxReadiness = text.indexOf("Oura Readiness");
    const idxNutrition = text.indexOf("Daily Nutrition");
    expect(idxBody).toBeGreaterThan(-1);
    expect(idxEnergy).toBeGreaterThan(idxBody);
    expect(idxSleepCard).toBeGreaterThan(idxEnergy);
    expect(idxReadiness).toBeGreaterThan(idxSleepCard);
    expect(idxNutrition).toBeGreaterThan(idxReadiness);
  });

  it("keeps at least one actionable header button", () => {
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
