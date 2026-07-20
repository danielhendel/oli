// app/(app)/(tabs)/__tests__/dash-composition.test.tsx
// Command Center clean baseline: Today progress removed; state cards retained on Dash.
// Weekly Fitness is on Dash only when relocation is disabled (rollback).

import React, { act } from "react";
import renderer from "react-test-renderer";

import { setDashDailyMonitorFoundationEnabledForTests } from "@/lib/data/dash/dashDailyMonitorFoundation";
import { setDashWeeklyProgressRelocationEnabledForTests } from "@/lib/data/dash/dashWeeklyProgressRelocation";

const mockUseTodayHealthHero = jest.fn();
jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: (...args: unknown[]) => mockUseTodayHealthHero(...args),
}));

jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => ({
    vm: { status: "missing", day: "2026-05-11", message: "No current-day readiness signal is available yet." },
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
      cardAccessibilityLabel: "Body composition card.",
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

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) return count;
    count += 1;
    idx = found + needle.length;
  }
}

describe("Dash composition clean baseline", () => {
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
      exactDayRestingHeartRateBpm: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    setDashWeeklyProgressRelocationEnabledForTests(null);
    setDashDailyMonitorFoundationEnabledForTests(null);
  });

  it("removes Today progress hero/card and keeps state cards in order (relocation enabled)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);

    expect(text).not.toContain("Today's Progress");
    expect(text).not.toContain("My Program");
    expect(text).not.toContain("Good afternoon");
    expect(text).not.toContain("separate from today's plan");
    expect(test.root.findAll((n) => (n.props as { testID?: string }).testID === "dash-weekly-section")).toHaveLength(0);
    expect(test.root.findAll((n) => (n.props as { testID?: string }).testID === "today-command-section")).toHaveLength(0);
    expect(test.root.findAll((n) => (n.props as { testID?: string }).testID === "today-semi-circle-progress")).toHaveLength(0);
    expect(test.root.findAll((n) => (n.props as { testID?: string }).testID === "today-progress-card")).toHaveLength(0);
    expect(test.root.findAll((n) => (n.props as { testID?: string }).testID === "today-health-hero")).toHaveLength(0);

    expect(text).not.toContain("Weekly Fitness");
    expect(text).not.toContain("Weekly Progress");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Daily Energy");
    expect(text).toContain("Daily Sleep");
    expect(text).toContain("Oura Readiness");
    expect(text).toContain("Daily Nutrition");

    expect(countOccurrences(text, "Body Composition")).toBe(1);
    expect(countOccurrences(text, "Daily Energy")).toBe(1);
    expect(countOccurrences(text, "Daily Sleep")).toBe(1);
    expect(countOccurrences(text, "Oura Readiness")).toBe(1);
    expect(countOccurrences(text, "Daily Nutrition")).toBe(1);

    const idxBody = text.indexOf("Body Composition");
    const idxEnergy = text.indexOf("Daily Energy");
    const idxSleep = text.indexOf("Daily Sleep");
    const idxReadiness = text.indexOf("Oura Readiness");
    const idxNutrition = text.indexOf("Daily Nutrition");
    expect(idxBody).toBeGreaterThan(-1);
    expect(idxEnergy).toBeGreaterThan(idxBody);
    expect(idxSleep).toBeGreaterThan(idxEnergy);
    expect(idxReadiness).toBeGreaterThan(idxSleep);
    expect(idxNutrition).toBeGreaterThan(idxReadiness);
  });

  it("rollback: restores Weekly Fitness as first Dash card when relocation is disabled", () => {
    setDashWeeklyProgressRelocationEnabledForTests(false);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Weekly Fitness");
    const idxWeekly = text.indexOf("Weekly Fitness");
    const idxBody = text.indexOf("Body Composition");
    expect(idxWeekly).toBeGreaterThan(-1);
    expect(idxBody).toBeGreaterThan(idxWeekly);
  });

  it("sleep hero can show score without duplicating readiness card", () => {
    mockUseTodayHealthHero.mockReturnValue({
      energyLoading: false,
      energyError: null,
      energy: undefined,
      sleepCardVm: {
        status: "ready",
        day: "2026-05-11",
        isRefreshing: false,
        model: {
          day: "2026-05-11",
          headlineValueText: "88",
          scoreUnavailable: false,
          scoreUnavailableLabel: null,
          scoreValueText: "88",
          durationValueText: "8h",
          ratingLabel: "Optimal",
          ratingTone: "optimal",
          summarySentence: "Strong overall sleep quality for this day.",
          metricRows: [
            {
              id: "sleep_duration",
              label: "Duration",
              value: "8h",
              accessibilityValue: "8h",
              isAvailable: true,
              detail: { title: "Duration", value: "8h", body: "x" },
            },
          ],
          hasAnySignal: true,
          emptyStateTitle: null,
          emptyStateSubtitle: null,
          lastNightSubtitle: "Last night’s sleep",
        },
      },
      exactDayRestingHeartRateBpm: 49,
      refetch: jest.fn(),
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("88");
    expect(text).toContain("Duration");
    expect(countOccurrences(text, "Oura Readiness")).toBe(1);
    expect(countOccurrences(text, "Daily Sleep")).toBe(1);
    expect(text).not.toContain("Today's Progress");
  });
});
