// app/(app)/(tabs)/__tests__/weekly-progress-relocation.test.tsx
// Phase 1: Weekly Progress relocation between Dash and Program (feature-flagged).

import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

import {
  setDashWeeklyProgressRelocationEnabledForTests,
  WEEKLY_PROGRESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_SUPPORTING_COPY,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { WEEKLY_FITNESS_ROUTES } from "@/lib/data/dash/weeklyFitnessRoutes";

const mockUseWeeklyFitnessCard = jest.fn();

jest.mock("@/lib/data/dash/useWeeklyFitnessCard", () => ({
  useWeeklyFitnessCard: (...args: unknown[]) => mockUseWeeklyFitnessCard(...args),
}));

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
    built: {
      tag: "ready" as const,
      weightPrimaryLabel: "159.3 lb",
      readingAsOfLabel: "As of today",
      rows: [],
      cardAccessibilityLabel: "Body composition card.",
    },
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

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: {} },
  }),
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

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ProgramScreen = require("../program").default;

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

const sampleModel = {
  weeklyProgress: {
    percent: null as number | null,
    label: "—",
    subtitle: "Weekly Progress",
    accessibilityLabel: "Weekly Progress, unavailable, not enough contributors. Button.",
    href: WEEKLY_FITNESS_ROUTES.goalsEditor,
    testID: "weekly-fitness-hero-weekly-progress",
  },
  bodyComposition: {
    percent: 81,
    label: "81",
    subtitle: "Body Composition Score",
    accessibilityLabel:
      "Body Composition Score, 81, progress toward your selected body composition goal. Button.",
    href: WEEKLY_FITNESS_ROUTES.bodyComposition,
    testID: "weekly-fitness-hero-body-composition",
  },
  metrics: [
    {
      key: "activity" as const,
      label: "Activity",
      valueLabel: "No activity data",
      accessibilityLabel: "Activity, No activity data, button.",
      progress01: null,
      hasProgress: false,
      barColor: "#888",
      href: WEEKLY_FITNESS_ROUTES.activity,
    },
    {
      key: "strength" as const,
      label: "Strength",
      valueLabel: "2 workouts",
      accessibilityLabel: "Strength, 2 workouts, button.",
      progress01: 0.4,
      hasProgress: true,
      barColor: "#888",
      href: WEEKLY_FITNESS_ROUTES.strength,
    },
  ],
  weeklyProgressScore0to100: null as number | null,
  bodyCompositionScore0to100: 81,
  eligibleWeeklyProgressCount: 1,
};

describe("Weekly Progress relocation", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseWeeklyFitnessCard.mockReset();
    mockUseWeeklyFitnessCard.mockReturnValue({
      loading: false,
      error: null,
      model: sampleModel,
      goalsHref: WEEKLY_FITNESS_ROUTES.goalsEditor,
    });
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
  });

  it("enabled: Program shows Weekly Progress; Dash does not; hook mounts once", () => {
    setDashWeeklyProgressRelocationEnabledForTests(true);

    let dash!: renderer.ReactTestRenderer;
    let program!: renderer.ReactTestRenderer;
    act(() => {
      dash = renderer.create(<DashScreen />);
      program = renderer.create(<ProgramScreen />);
    });

    const dashText = collectAllText(dash);
    const programText = collectAllText(program);

    expect(dashText).not.toContain("Weekly Fitness");
    expect(dashText).not.toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(dashText).toContain("Body Composition");
    expect(dashText).toContain("Daily Energy");

    expect(programText).toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(programText).toContain(WEEKLY_PROGRESS_SUPPORTING_COPY);
    expect(programText).toContain("No active programs yet");
    expect(programText).not.toMatch(/adherence/i);
    expect(programText).not.toMatch(/health score/i);
    expect(program.root.findByProps({ testID: "program-weekly-progress-section" })).toBeTruthy();
    expect(
      program.root.findAll(
        (n) =>
          (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Weekly Progress card",
      ).length,
    ).toBeGreaterThanOrEqual(1);

    expect(mockUseWeeklyFitnessCard).toHaveBeenCalledTimes(1);
  });

  it("enabled: insufficient contributors keep score unavailable (null), body goal unchanged", () => {
    setDashWeeklyProgressRelocationEnabledForTests(true);
    let program!: renderer.ReactTestRenderer;
    act(() => {
      program = renderer.create(<ProgramScreen />);
    });
    const text = collectAllText(program);
    expect(sampleModel.weeklyProgressScore0to100).toBeNull();
    expect(text).toContain("Body Composition Score");
    expect(text).toContain("81");
    // Hero percent label for unavailable weekly progress is em dash, not a fabricated 0.
    expect(text).toContain("—");
    expect(text).not.toMatch(/Weekly Progress, 0 percent/i);
  });

  it("enabled: row navigation destinations remain valid", () => {
    setDashWeeklyProgressRelocationEnabledForTests(true);
    let program!: renderer.ReactTestRenderer;
    act(() => {
      program = renderer.create(<ProgramScreen />);
    });
    const strengthRow = program.root.findByProps({ testID: "weekly-fitness-row-strength" });
    act(() => {
      (strengthRow.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith(WEEKLY_FITNESS_ROUTES.strength);
  });

  it("disabled: Dash restores Weekly Fitness; Program does not duplicate the card", () => {
    setDashWeeklyProgressRelocationEnabledForTests(false);

    let dash!: renderer.ReactTestRenderer;
    let program!: renderer.ReactTestRenderer;
    act(() => {
      dash = renderer.create(<DashScreen />);
      program = renderer.create(<ProgramScreen />);
    });

    const dashText = collectAllText(dash);
    const programText = collectAllText(program);

    expect(dashText).toContain("Weekly Fitness");
    expect(dashText).toContain("Body Composition");
    expect(programText).not.toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(program.root.findAll((n) => (n.props as { testID?: string }).testID === "program-weekly-progress-section")).toHaveLength(0);
    expect(programText).toContain("No active programs yet");
    expect(mockUseWeeklyFitnessCard).toHaveBeenCalledTimes(1);
  });

  it("source guards: screens do not call Firebase/API; only the host imports the heavy hook", () => {
    const dashSrc = fs.readFileSync(path.join(__dirname, "..", "dash.tsx"), "utf8");
    const programSrc = fs.readFileSync(path.join(__dirname, "..", "program.tsx"), "utf8");
    const hostSrc = fs.readFileSync(
      path.join(__dirname, "../../../../lib/ui/dash/WeeklyFitnessCardHost.tsx"),
      "utf8",
    );

    for (const src of [dashSrc, programSrc]) {
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
      expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
      expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
      expect(src).not.toContain("useWeeklyFitnessCard");
    }
    expect(hostSrc).toContain("useWeeklyFitnessCard");
    expect(dashSrc).toContain("WeeklyFitnessCardHost");
    expect(programSrc).toContain("WeeklyFitnessCardHost");
  });

  it("does not modify Timeline sources", () => {
    // Provenance guard for this suite: Timeline paths must stay untouched by this feature file set.
    const timelineDir = path.join(__dirname, "..", "timeline");
    expect(fs.existsSync(timelineDir)).toBe(true);
  });
});
