// app/(app)/(tabs)/__tests__/dash-recap.test.tsx
// Stage 2 Today: Daily Energy / Daily Monitor content (moved off Home).

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: jest.fn((opts: object) => ({ type: "NAVIGATE", payload: opts })),
  },
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  RefreshControl: "RefreshControl",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  ActivityIndicator: "ActivityIndicator",
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Platform: { OS: "ios", select: (v: { ios?: unknown; default?: unknown }) => v.ios ?? v.default },
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
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/today",
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

jest.mock("@/lib/hooks/useCurrentLocalDayKey", () => ({
  useCurrentLocalDayKey: () => ({ dayKey: "2026-05-05", refreshDayKey: jest.fn() }),
}));

jest.mock("@/lib/ui/calendar/dayKeyDisplayFormat", () => ({
  formatDayKeyStackNavTitle: () => "Mon May 5, 2026",
}));

const mockUseTodayHealthHero = jest.fn();
jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: (...args: unknown[]) => mockUseTodayHealthHero(...args),
}));

const mockUseDailyReadinessCard = jest.fn(() => ({
  vm: {
    status: "ready",
    day: "2026-05-05",
    model: {
      hasAnySignal: true,
      headlineValueText: "72",
      metricRows: [{ id: "rhr", label: "RHR", value: "49", isAvailable: true }],
    },
  },
  refetch: jest.fn(),
}));
jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => mockUseDailyReadinessCard(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

const mockUseBodyCompositionDashCard = jest.fn(() => ({
  loading: false,
  error: null,
  hasUser: true,
  goalsHref: "/(app)/body/settings",
  overviewDay: "2026-05-05",
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

jest.mock("@/lib/data/dash/useDailyMonitorActivityCard", () => ({
  useDailyMonitorActivityCard: () => ({
    presence: "absent_no_day_evidence",
    model: null,
    href: "/(app)/activity",
    refetch: jest.fn(),
  }),
}));
jest.mock("@/lib/data/dash/useDailyMonitorSessionCards", () => ({
  useDailyMonitorSessionCards: () => ({
    workoutPresence: "absent_no_day_evidence",
    workoutModel: null,
    workoutHref: "/(app)/workouts",
    cardioPresence: "absent_no_day_evidence",
    cardioModel: null,
    cardioHref: "/(app)/cardio",
  }),
}));
jest.mock("@/lib/data/dash/useDailyMonitorStressCard", () => ({
  useDailyMonitorStressCard: () => ({
    presence: "absent_no_day_evidence",
    model: null,
    href: "/(app)/recovery/stress",
    refetch: jest.fn(),
  }),
}));
jest.mock("@/lib/data/dash/useDailyMonitorRefresh", () => ({
  useDailyMonitorRefresh: () => ({
    refreshing: false,
    onRefresh: jest.fn(),
    refreshQuiet: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: () => 80,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TodayScreen = require("../today").default;

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

describe("Today Daily Monitor cards", () => {
  beforeEach(() => {
    mockUseTodayHealthHero.mockReset();
    mockUseDailyReadinessCard.mockReset();
    mockUseDailyReadinessCard.mockReturnValue({
      vm: {
        status: "ready",
        day: "2026-05-05",
        model: {
          hasAnySignal: true,
          headlineValueText: "72",
          metricRows: [{ id: "rhr", label: "RHR", value: "49", isAvailable: true }],
        },
      },
      refetch: jest.fn(),
    });
  });

  it("renders ready daily cards on Today (not Home)", () => {
    mockUseTodayHealthHero.mockReturnValue({
      energyLoading: false,
      energyError: null,
      refetch: jest.fn(),
      refetchSleep: jest.fn(),
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
        status: "ready",
        day: "2026-05-05",
        isRefreshing: false,
        model: {
          day: "2026-05-05",
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
      attributedSleepNight: null,
      attributedSleepResolution: null,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TodayScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Today");
    expect(text).toContain("Body Composition");
    expect(text).toContain("159.3 lb");
    expect(text).toContain("Energy Expenditure");
    expect(text).toContain("Nutrition");
    expect(text).toContain("1,850 kcal");
    expect(text).toContain("2,120–2,480 kcal");
    expect(text).toContain("Sleep");
    expect(text).not.toContain("My Health & Performance");
    expect(text).not.toContain("Weekly Fitness");
    expect(text).not.toContain("Today's Progress");
    expect(test.root.findAllByProps({ testID: "home-my-health-performance" })).toHaveLength(0);
  });

  it("shows loading presence while Daily Energy is hydrating", () => {
    mockUseTodayHealthHero.mockReturnValue({
      energyLoading: true,
      energyError: null,
      refetch: jest.fn(),
      refetchSleep: jest.fn(),
      energy: undefined,
      sleepCardVm: { status: "partial", day: "2026-05-05" },
      exactDayRestingHeartRateBpm: null,
      attributedSleepNight: null,
      attributedSleepResolution: null,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TodayScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Today");
    expect(text).toContain("Mon May 5, 2026");
    expect(text).not.toMatch(/Building your health picture/i);
    expect(text).not.toContain("Open navigation menu");
  });

  it("shows honest empty copy when no current-day evidence", () => {
    mockUseTodayHealthHero.mockReturnValue({
      energyLoading: false,
      energyError: null,
      refetch: jest.fn(),
      refetchSleep: jest.fn(),
      energy: undefined,
      sleepCardVm: {
        status: "missing",
        day: "2026-05-05",
        message: "No sleep data logged for this day.",
      },
      exactDayRestingHeartRateBpm: null,
      attributedSleepNight: null,
      attributedSleepResolution: null,
    });
    mockUseBodyCompositionDashCard.mockReturnValue({
      loading: false,
      error: null,
      hasUser: true,
      goalsHref: "/(app)/body/settings",
      overviewDay: null,
      built: { tag: "empty" as const },
    });
    mockUseDailyNutritionCard.mockReturnValue({
      model: { calorieLabel: "—", hasAnyNutrition: false, rows: [] },
      loading: false,
      error: null,
    });
    mockUseDailyReadinessCard.mockReturnValue({
      vm: { status: "missing", day: "2026-05-05", message: "No readiness" },
      refetch: jest.fn(),
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TodayScreen />);
    });
    const text = collectAllText(test);
    expect(text).toMatch(/No health data is available for today yet/i);
    expect(text).not.toMatch(/Building your health picture/i);
  });
});
