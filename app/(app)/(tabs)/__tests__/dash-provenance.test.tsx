// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Dash shows title, subtitle, and Daily Energy hero card.

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

jest.mock("@/lib/data/dash/useBodyCompositionDashCard", () => ({
  useBodyCompositionDashCard: () => ({
    loading: false,
    error: null,
    hasUser: true,
    goalsHref: "/(app)/body/settings",
    overviewDay: "2026-05-11",
    built: {
      tag: "ready" as const,
      weightPrimaryLabel: "159.3 lb",
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
      calorieLabel: "0 kcal",
      hasAnyNutrition: false,
      rows: [],
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
    setDashDailyMonitorFoundationEnabledForTests(false);
    setDashWeeklyProgressRelocationEnabledForTests(true);
    mockUseTodayHealthHero.mockReset();
    mockUseTodayHealthHero.mockReturnValue({
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
  });

  afterEach(() => {
    setDashWeeklyProgressRelocationEnabledForTests(null);
    setDashDailyMonitorFoundationEnabledForTests(null);
  });

  it("shows Oli Fitness tab title and Body Composition + Daily Energy sections", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli Fitness");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Daily Energy");
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
  });

  it("renders header navigation controls on Dash (hamburger icon)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    expect(countDashIconPlaceholders(test.root)).toBe(1);
    expect(
      test.root.findAll(
        (n) => (n.props as { testID?: string }).testID === "dash-manage-menu-trigger",
      ).length,
    ).toBe(1);
  });

  it("renders factor rows on Daily Energy without legacy Dash tagline", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).not.toContain("Track, understand, and improve every part of your health.");
    expect(text).toContain("Body Composition");
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
    expect(text).toContain("Cardio");
    expect(text).toContain("Strength");
    expect(text).not.toContain("Weekly Fitness");
    expect(text).not.toContain("Progress to goal");
    expect(text).toContain("Daily Nutrition");
    expect(text).toContain("Oura Readiness");
    expect(text).not.toContain("Labs");
  });

  it("renders empty-state copy when energy is unavailable", () => {
    mockUseTodayHealthHero.mockReturnValue({
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
