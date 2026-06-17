/**
 * Nutrition overview: thin screen renders core sections when hook is ready.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("t"),
  }),
}));

const mockRefetch = jest.fn();

jest.mock("@/lib/hooks/useNutritionOverviewScreenData", () => ({
  useNutritionOverviewScreenData: () => ({
    todayKey: "2026-03-12",
    weekDays: [
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
      "2026-03-15",
    ],
    todayCard: {
      rows: [
        { key: "kcal", label: "Calories", valueLabel: "—", progress: 0, available: false, currentValue: null, targetValue: 2000, unit: "kcal", amountLabel: "— / 2,000 kcal", percentLabel: "—" },
        { key: "protein", label: "Protein", valueLabel: "—", progress: 0, available: false, currentValue: null, targetValue: 150, unit: "g", amountLabel: "— / 150 g", percentLabel: "—" },
        { key: "carbs", label: "Carbs", valueLabel: "—", progress: 0, available: false, currentValue: null, targetValue: 250, unit: "g", amountLabel: "— / 250 g", percentLabel: "—" },
        { key: "fat", label: "Fat", valueLabel: "—", progress: 0, available: false, currentValue: null, targetValue: 65, unit: "g", amountLabel: "— / 65 g", percentLabel: "—" },
      ],
      calorieValueLabel: "—",
      calorieGoalLabel: "Goal 2,000 kcal",
    },
    weeklyStripDays: [
      { day: "2026-03-09", meta: { hasNutrition: false } },
      { day: "2026-03-10", meta: { hasNutrition: true } },
      { day: "2026-03-11", meta: { hasNutrition: false } },
      { day: "2026-03-12", meta: { hasNutrition: false } },
      { day: "2026-03-13", meta: { hasNutrition: false } },
      { day: "2026-03-14", meta: { hasNutrition: false } },
      { day: "2026-03-15", meta: { hasNutrition: false } },
    ],
    recentCard: { rows: [] },
    hasDayRollup: false,
    recentRaw: { readiness: "ready" as const, isLoading: false },
    weeklyInsights: { insights: [], fallbackMessage: "Log nutrition on more days to see week-over-week patterns." },
    thisWeekCard: {
      weekRangeLabel: "Mar 9–15",
      avgKcalLabel: "—",
      avgProteinLabel: "—",
      daysLogged: 0,
      daysInWeek: 7,
      rows: [],
      emptyMessage: "No nutrition logged this week",
      hasData: false,
    },
    baselineModel: {
      rows: [
        { key: "thisWeek", label: "7 Day", hasEnoughData: false, avgKcalPerDay: null, avgDaysLoggedPerWeek: null, displayValue: "—" },
      ],
      personalizedExplainer: "Your nutrition baseline shows your typical calories",
    },
    yearlyCardModel: {
      year: 2026,
      title: "2026 Nutrition",
      rangeLabel: "2026",
      isCurrentYear: true,
      hasData: false,
      totalDaysLogged: 0,
      totalDisplay: "0",
      totalQualifier: "days logged",
      months: [],
      chartMaxScale: 5,
      todayMonthKey: "2026-03",
      isEmpty: true,
    },
    selectedWeekAnchorDay: "2026-03-12",
    setSelectedWeekAnchorDay: jest.fn(),
    selectedNutritionYear: 2026,
    setSelectedNutritionYear: jest.fn(),
    canGoPreviousWeek: true,
    canGoNextWeek: false,
    canGoPreviousYear: true,
    canGoNextYear: false,
    factsRollupLoading: false,
    todayFacts: { readiness: "ready" as const, isLoading: false },
    events: { readiness: "ready" as const, isLoading: false },
    refetch: mockRefetch,
    refetchTodayFacts: mockRefetch,
    refetchEvents: mockRefetch,
  }),
}));

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

import NutritionOverviewScreen from "../overview";

describe("NutritionOverviewScreen", () => {
  it("renders weekly strip with today selected", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionOverviewScreen />);
    });
    const json = tree!.toJSON();
    expect(json).toBeTruthy();
  });

  it("renders Strength-parity cards and View Food CTA (no Log More button)", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionOverviewScreen />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("nutrition-today-card");
    expect(flat).toContain("nutrition-today-view-food-cta");
    expect(flat).toContain("View Food");
    expect(flat).not.toContain("nutrition-today-log-cta");
    expect(flat).not.toContain("Log More");
    expect(flat).toContain("nutrition-this-week-card");
    expect(flat).toContain("nutrition-baseline-card");
    expect(flat).toContain("nutrition-yearly-card");
  });

  it("navigates macro rows to the macro detail page with the selected day", async () => {
    mockPush.mockClear();
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionOverviewScreen />);
    });
    const proteinRow = tree!.root.findByProps({ testID: "nutrition-today-macro-protein" });
    await act(async () => {
      proteinRow.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    const call = mockPush.mock.calls[0]![0] as {
      pathname: string;
      params: { macro: string; day: string };
    };
    expect(call.pathname).toBe("/(app)/nutrition/macro/[macro]");
    expect(call.params.macro).toBe("protein");
    expect(call.params.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
