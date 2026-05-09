import React from "react";
import renderer, { act } from "react-test-renderer";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSetOptions = jest.fn();

let mockRowParam: "activity" | "strength" | "cardio" = "activity";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ row: mockRowParam }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

jest.mock("@/lib/ui/activity/ActivityHistorySummaryCard", () => ({
  ActivityHistorySummaryCard: ({ model, onPressViewMore }: { model: { rows: { label: string }[] }; onPressViewMore?: () => void }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "activity-baseline-card" },
      ReactLocal.createElement("Text", null, `Activity Baseline ${model.rows.map((r) => r.label).join("|")}`),
      ReactLocal.createElement("Pressable", { testID: "activity-history-summary-view-more", onPress: onPressViewMore }),
    );
  },
}));

jest.mock("@/lib/ui/workouts/StrengthHistorySummaryCard", () => ({
  StrengthHistorySummaryCard: ({ model, onPressViewMore }: { model: { rows: { label: string }[] }; onPressViewMore?: () => void }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "strength-baseline-card" },
      ReactLocal.createElement("Text", null, `Strength Baseline ${model.rows.map((r) => r.label).join("|")}`),
      ReactLocal.createElement("Pressable", { testID: "strength-history-summary-view-more", onPress: onPressViewMore }),
    );
  },
}));

jest.mock("@/lib/ui/workouts/CardioHistorySummaryCard", () => ({
  CardioHistorySummaryCard: ({ model, onPressViewMore }: { model: { rows: { label: string }[] }; onPressViewMore?: () => void }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "cardio-baseline-card" },
      ReactLocal.createElement("Text", null, `Cardio Baseline ${model.rows.map((r) => r.label).join("|")}`),
      ReactLocal.createElement("Pressable", { testID: "cardio-history-summary-view-more", onPress: onPressViewMore }),
    );
  },
}));

jest.mock("@/lib/data/dash/useWeeklyFitnessCard", () => ({
  useWeeklyFitnessCard: () => ({
    loading: false,
    error: null,
    rows: [
      {
        key: "activity",
        label: "Activity",
        valueLabel: "9,900 avg steps",
        accessibilityValueLabel: "9,900 average steps",
        progress: 0.99,
        hasGoal: true,
        barColor: "#00AA66",
        status: "onTrack",
        statusLabel: "On track",
      },
      {
        key: "strength",
        label: "Strength",
        valueLabel: "3 workouts",
        accessibilityValueLabel: "3 workouts",
        progress: 0.6,
        hasGoal: true,
        barColor: "#00AA66",
        status: "onTrack",
        statusLabel: "On track",
      },
      {
        key: "cardio",
        label: "Cardio",
        valueLabel: "10.0 miles",
        accessibilityValueLabel: "10 miles",
        progress: 1,
        hasGoal: true,
        barColor: "#00AA66",
        status: "complete",
        statusLabel: "Complete",
      },
    ],
    combined: { progress: 0.8, percent: 80, enabledCategoryCount: 3 },
    progressToGoalVm: {
      strength: { primary: "2 workouts remaining", support: "Goal: 5 workouts" },
      activity: {
        primary: "100 steps needed today",
        support: "To reach 10,000 avg/day",
      },
      cardio: { primary: "Goal hit", support: "Goal: 10 mi" },
      accessibilityLabel:
        "Progress to goal. 2 workouts remaining. Goal: 5 workouts. 100 steps needed today. To reach 10,000 avg/day. Goal hit. Goal: 10 mi.",
    },
    goals: {
      activityStepsPerDayGoal: 10000,
      strengthWorkoutsPerWeekGoal: 5,
      cardioMilesPerWeekGoal: 10,
      isDefault: false,
    },
    goalsHref: "/(app)/fitness-goals",
    baselineSource: {
      todayDayKey: "2026-05-08",
      rollupByDay: {},
      strengthCalendarDays: [],
      cardioCalendarDays: [],
      availableRangeStart: "2025-05-09",
      availableRangeEnd: "2026-05-08",
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const WeeklyFitnessMetricExplainerModal = require("../weekly-fitness-metric-explainer").default;

function collectAllText(tree: renderer.ReactTestRenderer): string {
  const nodes = tree.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("Weekly fitness metric explainer baseline cards", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockSetOptions.mockReset();
  });

  it("renders Activity cohesive cards below Baseline", () => {
    mockRowParam = "activity";
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(WeeklyFitnessMetricExplainerModal));
    });
    const text = collectAllText(tree);
    expect(text).toContain("Your reading");
    expect(text).toContain("Activity Baseline 7 Day|30 Day|90 Day|YTD|12 Month");
    expect(text).toContain("What this means");
    expect(text).toContain("Activity ranges");
    expect(text).toContain("How to use this");
    expect(text).not.toContain("one sleepy Wednesday");
    expect(text.indexOf("Your reading")).toBeLessThan(text.indexOf("Activity Baseline"));
    expect(text.indexOf("Activity Baseline")).toBeLessThan(text.indexOf("What this means"));
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-explainer-activity-what-this-means-card" }).length).toBe(1);
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-explainer-activity-ranges-card" }).length).toBe(1);
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-explainer-activity-how-to-use-card" }).length).toBe(1);
  });

  it("renders Strength cohesive cards and safe View More replace inside popup", () => {
    mockRowParam = "strength";
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(WeeklyFitnessMetricExplainerModal));
    });
    const text = collectAllText(tree);
    expect(text).toContain("Strength Baseline 7 Day|30 Day|90 Day|YTD|12 Month");
    expect(text).toContain("What this means");
    expect(text).toContain("Strength ranges");
    expect(text).toContain("How to use this");
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-explainer-strength-ranges-card" }).length).toBe(1);
    act(() => {
      tree.root.findByProps({ testID: "strength-history-summary-view-more" }).props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith("/(app)/workouts/analytics-detail");
  });

  it("renders Cardio cohesive cards and safe View More replace inside popup", () => {
    mockRowParam = "cardio";
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(WeeklyFitnessMetricExplainerModal));
    });
    const text = collectAllText(tree);
    expect(text).toContain("Cardio Baseline 7 Day|30 Day|90 Day|YTD|12 Month");
    expect(text).toContain("What this means");
    expect(text).toContain("Cardio ranges");
    expect(text).toContain("How to use this");
    expect(text).not.toContain("one sleepy Wednesday");
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-explainer-cardio-ranges-card" }).length).toBe(1);
    act(() => {
      tree.root.findByProps({ testID: "cardio-history-summary-view-more" }).props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith("/(app)/cardio/analytics-detail");
  });
});
