import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import {
  buildWeeklyFitnessProgressToGoalVm,
  weeklyFitnessProgressToGoalItem,
} from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import type {
  WeeklyFitnessActivityMetrics,
  WeeklyFitnessCardioMetrics,
  WeeklyFitnessSleepMetrics,
  WeeklyFitnessStrengthMetrics,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type {
  UseWeeklyFitnessCardResult,
  WeeklyFitnessRow,
} from "@/lib/data/dash/useWeeklyFitnessCard";
import { WEEKLY_FITNESS_ROUTES } from "@/lib/data/dash/weeklyFitnessRoutes";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Circle: "Circle",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const sampleRows: WeeklyFitnessRow[] = [
  {
    key: "activity",
    label: "Activity",
    valueLabel: "9,998 steps",
    accessibilityValueLabel: "9,998 average steps, goal 10,000 steps per day",
    progress: 1,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "complete",
    statusLabel: "Complete",
  },
  {
    key: "strength",
    label: "Strength",
    valueLabel: "3 workouts",
    accessibilityValueLabel: "3 workouts, goal 5 workouts",
    progress: 0.6,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "onTrack",
    statusLabel: "On track",
  },
  {
    key: "cardio",
    label: "Cardio",
    valueLabel: "2.6 miles",
    accessibilityValueLabel: "2.6 miles, goal 10 miles",
    progress: 0.26,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "behind",
    statusLabel: "Behind",
  },
];

const goalsHref = "/(app)/fitness-goals";
const sampleCombined: UseWeeklyFitnessCardResult["combined"] = {
  progress: (1 + 0.6 + 0.26) / 3,
  percent: 62,
  enabledCategoryCount: 3,
};

function fullActivity(p: Partial<WeeklyFitnessActivityMetrics>): WeeklyFitnessActivityMetrics {
  return {
    avgStepsPerDay: 0,
    goalStepsPerDay: 0,
    elapsedDaysWithData: 0,
    elapsedCalendarDaysThroughToday: 0,
    numericWeekStepsSum: 0,
    hasNumericStepsAllElapsedCalendarDays: false,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...p,
  };
}

function fullStrength(p: Partial<WeeklyFitnessStrengthMetrics>): WeeklyFitnessStrengthMetrics {
  return {
    workoutsThisWeek: 0,
    goalWorkoutsPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...p,
  };
}

function fullCardio(p: Partial<WeeklyFitnessCardioMetrics>): WeeklyFitnessCardioMetrics {
  return {
    totalMilesThisWeek: 0,
    goalMilesPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...p,
  };
}

function fullSleep(p: Partial<WeeklyFitnessSleepMetrics>): WeeklyFitnessSleepMetrics {
  return {
    avgSleepMinutesPerNight: 0,
    goalHoursPerNight: 0,
    goalSleepMinutesPerNight: 0,
    completedNightsWithData: 0,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...p,
  };
}

const defaultSleepForProgressVm = fullSleep({
  avgSleepMinutesPerNight: 499,
  goalHoursPerNight: 8,
  goalSleepMinutesPerNight: 480,
  completedNightsWithData: 1,
  goalProgress01: 1,
  valueLabel: "8h 19m avg",
  accessibilityValueLabel: "8 hours 19 minutes average, goal 8 hours per night",
});

const sampleProgressToGoalVm = buildWeeklyFitnessProgressToGoalVm({
  activity: fullActivity({
    avgStepsPerDay: 9998,
    goalStepsPerDay: 10000,
    elapsedDaysWithData: 5,
    elapsedCalendarDaysThroughToday: 5,
    numericWeekStepsSum: 49992,
    hasNumericStepsAllElapsedCalendarDays: true,
    goalProgress01: 0.9998,
    valueLabel: "9,998 steps",
    accessibilityValueLabel: "9,998 average steps, goal 10,000 steps per day",
  }),
  strength: fullStrength({
    workoutsThisWeek: 3,
    goalWorkoutsPerWeek: 5,
    goalProgress01: 0.6,
    valueLabel: "3 workouts",
    accessibilityValueLabel: "3 workouts, goal 5 workouts",
  }),
  cardio: fullCardio({
    totalMilesThisWeek: 2.6,
    goalMilesPerWeek: 10,
    goalProgress01: 0.26,
    valueLabel: "2.6 miles",
    accessibilityValueLabel: "2.6 miles, goal 10 miles",
  }),
  sleep: defaultSleepForProgressVm,
});

const progressNoGoalsVm = buildWeeklyFitnessProgressToGoalVm({
  activity: fullActivity({
    avgStepsPerDay: 0,
    goalStepsPerDay: 0,
    elapsedDaysWithData: 0,
    elapsedCalendarDaysThroughToday: 0,
    numericWeekStepsSum: 0,
    hasNumericStepsAllElapsedCalendarDays: false,
    goalProgress01: 0,
    valueLabel: "No goal set",
    accessibilityValueLabel: "0 average steps, no goal set",
  }),
  strength: fullStrength({
    workoutsThisWeek: 0,
    goalWorkoutsPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "No goal set",
    accessibilityValueLabel: "0 workouts, no goal set",
  }),
  cardio: fullCardio({
    totalMilesThisWeek: 0,
    goalMilesPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "No goal set",
    accessibilityValueLabel: "0.0 miles, no goal set",
  }),
  sleep: fullSleep({
    avgSleepMinutesPerNight: 0,
    goalHoursPerNight: 0,
    goalSleepMinutesPerNight: 0,
    completedNightsWithData: 0,
    goalProgress01: 0,
    valueLabel: "No goal set",
    accessibilityValueLabel: "0 hours average, no goal set",
  }),
});

const progressActivityExcellentVm = buildWeeklyFitnessProgressToGoalVm({
  activity: fullActivity({
    avgStepsPerDay: 20000,
    goalStepsPerDay: 10000,
    elapsedDaysWithData: 1,
    elapsedCalendarDaysThroughToday: 1,
    numericWeekStepsSum: 20000,
    hasNumericStepsAllElapsedCalendarDays: true,
    goalProgress01: 1,
    valueLabel: "20,000 steps",
    accessibilityValueLabel: "20,000 average steps, goal 10,000 steps per day",
  }),
  strength: fullStrength({
    workoutsThisWeek: 0,
    goalWorkoutsPerWeek: 5,
    goalProgress01: 0,
    valueLabel: "0 workouts",
    accessibilityValueLabel: "0 workouts, goal 5 workouts",
  }),
  cardio: fullCardio({
    totalMilesThisWeek: 0,
    goalMilesPerWeek: 10,
    goalProgress01: 0,
    valueLabel: "0.0 miles",
    accessibilityValueLabel: "0.0 miles, goal 10 miles",
  }),
  sleep: defaultSleepForProgressVm,
});

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

function findBarFillView(
  tree: renderer.ReactTestRenderer,
  rowKey: string,
): renderer.ReactTestInstance | undefined {
  const bar = tree.root.findByProps({ testID: `weekly-fitness-bar-${rowKey}` });
  return bar.findAllByType("View").find((v) => {
    const style = (v.props as { style?: unknown }).style;
    const arr = Array.isArray(style) ? style : [style];
    return arr.some(
      (s) => s && typeof s === "object" && "width" in (s as Record<string, unknown>),
    );
  });
}

function findBarFillStyle(
  tree: renderer.ReactTestRenderer,
  rowKey: string,
): { width: string; backgroundColor: string } | undefined {
  const innerView = findBarFillView(tree, rowKey);
  if (!innerView) return undefined;
  const styleArr = Array.isArray(innerView.props.style)
    ? innerView.props.style
    : [innerView.props.style];
  const merged: Record<string, unknown> = {};
  for (const s of styleArr) {
    if (s && typeof s === "object") Object.assign(merged, s);
  }
  return { width: String(merged.width ?? ""), backgroundColor: String(merged.backgroundColor ?? "") };
}

function findBarFillWidth(tree: renderer.ReactTestRenderer, rowKey: string): string {
  return findBarFillStyle(tree, rowKey)?.width ?? "";
}

describe("WeeklyFitnessCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders combined score in a larger left-aligned progress ring and progress-to-goal summary on the right", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-combined-ring-section" }).length).toBe(1);
    const percent = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-label" });
    const text = (percent.children as (string | number)[])
      .filter((c) => typeof c === "string" || typeof c === "number")
      .join("");
    expect(text).toBe("62%");

    const allText = collectAllText(tree);
    expect(allText).toContain("Weekly Fitness");
    expect(allText).toContain("My goal");
    expect(allText).toContain("This week’s results");
    expect(allText).toContain("62%");

    const combinedRing = tree.root.findByProps({ testID: "weekly-fitness-combined-ring" });
    expect(combinedRing.props.accessibilityLabel).toBe("Weekly Fitness score 62 percent.");

    const progressBlock = tree.root.findByProps({ testID: "weekly-fitness-progress-to-goal-block" });
    expect(progressBlock).toBeDefined();
    const blob = collectAllText(tree);
    expect(blob).not.toContain("Progress to goal");
    expect(blob).not.toContain("Consistency");
    expect(blob).not.toContain("On track today");
    expect(blob).toContain("2 workouts remaining");
    expect(blob).toContain("Goal: 5 workouts");
    expect(blob).toContain("8 steps remaining");
    expect(blob).toContain("Goal: 10,000 avg/day");
    expect(blob).toContain("7.4 miles remaining");
    expect(blob).toContain("Goal: 10 miles");
    expect(blob).toContain("Sleep goal reached");
    expect(blob).toContain("Goal: 8h/night");
    expect(blob).toContain("9,998 steps");
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-progress-to-goal-sleep-primary" }).length).toBe(1);
    expect(sampleProgressToGoalVm.items).toHaveLength(4);
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-progress-to-goal-row-sleep" }).length).toBe(1);
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-progress-to-goal-row-activity" }).length).toBe(1);
    expect(tree.root.findAllByType("Ionicons").length).toBe(0);
  });

  it("uses enlarged Weekly Fitness ring dimensions, stroke, score text, and progress-to-goal type sizes", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const svg = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-svg" });
    expect(svg.props.width).toBe(156);
    expect(svg.props.height).toBe(156);
    const arc = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-progress" });
    expect(arc.props.strokeWidth).toBe(9);
    const scoreLabel = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-label" });
    const scoreStyles = Array.isArray(scoreLabel.props.style)
      ? scoreLabel.props.style
      : [scoreLabel.props.style];
    const scoreMerged: Record<string, unknown> = {};
    for (const s of scoreStyles) {
      if (s && typeof s === "object") Object.assign(scoreMerged, s);
    }
    expect(scoreMerged.fontSize).toBe(40);
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-progress-to-goal-eyebrow" }).length).toBe(0);
    const activityLine = tree.root.findByProps({
      testID: "weekly-fitness-progress-to-goal-activity-primary",
    });
    const lineStyles = Array.isArray(activityLine.props.style)
      ? activityLine.props.style
      : [activityLine.props.style];
    const lineMerged: Record<string, unknown> = {};
    for (const s of lineStyles) {
      if (s && typeof s === "object") Object.assign(lineMerged, s);
    }
    expect(lineMerged.fontSize).toBe(12);
  });

  it("progress summary reflects strength under goal, activity ahead of daily pace, and cardio under goal", () => {
    const vm = buildWeeklyFitnessProgressToGoalVm({
      activity: fullActivity({
        avgStepsPerDay: 10_300,
        goalStepsPerDay: 10_000,
        elapsedDaysWithData: 5,
        elapsedCalendarDaysThroughToday: 5,
        numericWeekStepsSum: 51_500,
        hasNumericStepsAllElapsedCalendarDays: true,
        goalProgress01: 1,
        valueLabel: "10,300 steps",
        accessibilityValueLabel: "a11y",
      }),
      strength: fullStrength({
        workoutsThisWeek: 4,
        goalWorkoutsPerWeek: 5,
        goalProgress01: 0.8,
        valueLabel: "4 workouts",
        accessibilityValueLabel: "a11y",
      }),
      cardio: fullCardio({
        totalMilesThisWeek: 2.6,
        goalMilesPerWeek: 10,
        goalProgress01: 0.26,
        valueLabel: "2.6 miles",
        accessibilityValueLabel: "a11y",
      }),
      sleep: defaultSleepForProgressVm,
    });
    expect(weeklyFitnessProgressToGoalItem(vm, "strength").primary).toBe("1 workout remaining");
    expect(weeklyFitnessProgressToGoalItem(vm, "strength").support).toBe("Goal: 5 workouts");
    expect(weeklyFitnessProgressToGoalItem(vm, "activity").primary).toBe("Activity goal reached");
    expect(weeklyFitnessProgressToGoalItem(vm, "activity").support).toBe("Goal: 10,000 avg/day");
    expect(weeklyFitnessProgressToGoalItem(vm, "cardio").primary).toBe("7.4 miles remaining");
    expect(weeklyFitnessProgressToGoalItem(vm, "cardio").support).toBe("Goal: 10 miles");

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={{ progress: 0.69, percent: 69, enabledCategoryCount: 3 }}
          progressToGoalVm={vm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const blob = collectAllText(tree);
    expect(blob).toContain("1 workout remaining");
    expect(blob).toContain("Goal: 5 workouts");
    expect(blob).toContain("Activity goal reached");
    expect(blob).toContain("Goal: 10,000 avg/day");
    expect(blob).toContain("7.4 miles remaining");
    expect(blob).toContain("Goal: 10 miles");
    expect(blob).not.toContain("On track today");
    expect(blob).not.toContain("Consistency");
    expect(blob).not.toContain("mi under goal");
  });

  it("renders a combined circular ring and removes horizontal score bar", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const combinedRing = tree.root.findByProps({ testID: "weekly-fitness-combined-ring" });
    expect(combinedRing).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-combined-bar" }).length).toBe(0);
    const progressArc = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-progress" });
    expect(progressArc.props.stroke).toBe(WEEKLY_FITNESS_BAR_FILL_COLOR);
  });

  it("rows show actual-only values (no 'avg' word, no '/ goal' pairs)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const text = collectAllText(tree);
    expect(text).toContain("9,998 steps");
    expect(text).toContain("3 workouts");
    expect(text).toContain("2.6 miles");
    expect(text).not.toContain("9,992 avg");
    expect(text).not.toContain(" / 10,000");
    expect(text).not.toContain("/ 5 workouts");
    expect(text).not.toContain(" / 10 mi");
  });

  it("uses the same green fill color for Activity / Strength / Cardio progress bars", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const colors = ["activity", "strength", "cardio"].map(
      (k) => findBarFillStyle(tree, k)?.backgroundColor,
    );
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).toBe(WEEKLY_FITNESS_BAR_FILL_COLOR);
  });

  it("renders a decorative chevron after each row's value (hidden from screen readers)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    for (const k of ["activity", "strength", "cardio"]) {
      const chevron = tree.root.findByProps({ testID: `weekly-fitness-row-chevron-${k}` });
      const text = (chevron.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join("");
      expect(text).toBe("\u203A");
      expect(chevron.props.accessibilityElementsHidden).toBe(true);
      expect(chevron.props.importantForAccessibility).toBe("no");
    }
    const activity = tree.root.findByProps({ testID: "weekly-fitness-row-activity" });
    expect(activity.props.accessibilityLabel).not.toContain("\u203A");
  });

  it("progress bars still use goal completion (100% / 60% / 26%)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(findBarFillWidth(tree, "activity")).toBe("100%");
    expect(findBarFillWidth(tree, "strength")).toBe("60%");
    expect(findBarFillWidth(tree, "cardio")).toBe("26%");
  });

  it("renders a divider before metric rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const rowsWrap = tree.root.findByProps({ testID: "weekly-fitness-rows-wrap" });
    const style = (rowsWrap.props as { style?: unknown }).style;
    const styleArr = Array.isArray(style) ? style : [style];
    const merged: Record<string, unknown> = {};
    for (const s of styleArr) {
      if (s && typeof s === "object") Object.assign(merged, s);
    }
    expect(merged.borderTopWidth).toBe(1);
    expect(merged.paddingTop).toBe(4);
  });

  it("accessibility labels include goals, percent of goal, and ring score", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const activity = tree.root.findByProps({ testID: "weekly-fitness-row-activity" });
    expect(activity.props.accessibilityLabel).toBe(
      "Activity, 9,998 average steps, goal 10,000 steps per day, 100 percent of goal. Open Activity",
    );

    const strength = tree.root.findByProps({ testID: "weekly-fitness-row-strength" });
    expect(strength.props.accessibilityLabel).toBe(
      "Strength, 3 workouts, goal 5 workouts, 60 percent of goal. Open Strength",
    );

    const cardio = tree.root.findByProps({ testID: "weekly-fitness-row-cardio" });
    expect(cardio.props.accessibilityLabel).toBe(
      "Cardio, 2.6 miles, goal 10 miles, 26 percent of goal. Open Cardio",
    );

    const ring = tree.root.findByProps({ testID: "weekly-fitness-combined-ring" });
    expect(ring.props.accessibilityLabel).toBe("Weekly Fitness score 62 percent.");
  });

  it("zero-goal row shows 'No goal set' and an empty bar fill", () => {
    const noGoalRows: WeeklyFitnessRow[] = [
      {
        key: "cardio",
        label: "Cardio",
        valueLabel: "No goal set",
        accessibilityValueLabel: "0.0 miles, no goal set",
        progress: 0,
        hasGoal: false,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: "behind",
        statusLabel: "Behind",
      },
    ];
    const combinedNoCardio: UseWeeklyFitnessCardResult["combined"] = {
      progress: 0.5,
      percent: 50,
      enabledCategoryCount: 2,
    };
    const progressVm = buildWeeklyFitnessProgressToGoalVm({
      activity: fullActivity({
        avgStepsPerDay: 6000,
        goalStepsPerDay: 8000,
        elapsedDaysWithData: 4,
        elapsedCalendarDaysThroughToday: 4,
        numericWeekStepsSum: 24000,
        hasNumericStepsAllElapsedCalendarDays: false,
        goalProgress01: 0.75,
        valueLabel: "6,000 steps",
        accessibilityValueLabel: "a11y",
      }),
      strength: fullStrength({
        workoutsThisWeek: 4,
        goalWorkoutsPerWeek: 5,
        goalProgress01: 0.8,
        valueLabel: "4 workouts",
        accessibilityValueLabel: "a11y",
      }),
      cardio: fullCardio({
        totalMilesThisWeek: 0,
        goalMilesPerWeek: 0,
        goalProgress01: 0,
        valueLabel: "No goal set",
        accessibilityValueLabel: "0.0 miles, no goal set",
      }),
      sleep: fullSleep({
        avgSleepMinutesPerNight: 420,
        goalHoursPerNight: 8,
        goalSleepMinutesPerNight: 480,
        completedNightsWithData: 2,
        goalProgress01: 0.875,
        valueLabel: "7h 0m avg",
        accessibilityValueLabel: "a11y",
      }),
    });
    expect(weeklyFitnessProgressToGoalItem(progressVm, "cardio").primary).toBe("Goal not set");
    expect(weeklyFitnessProgressToGoalItem(progressVm, "cardio").support).toBe("");
    expect(progressVm.items).toHaveLength(4);

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={noGoalRows}
          combined={combinedNoCardio}
          progressToGoalVm={progressVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(tree)).toContain("No goal set");
    expect(collectAllText(tree)).toContain("Goal not set");
    expect(findBarFillWidth(tree, "cardio")).toBe("0%");

    const cardio = tree.root.findByProps({ testID: "weekly-fitness-row-cardio" });
    expect(cardio.props.accessibilityLabel).toBe("Cardio, 0.0 miles, no goal set. Open Cardio");
    expect(cardio.props.accessibilityLabel).not.toContain("percent of goal");
  });

  it("shows neutral ring fallback when no category has a goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          progressToGoalVm={progressNoGoalsVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const ring = tree.root.findByProps({ testID: "weekly-fitness-combined-ring" });
    expect(ring.props.accessibilityLabel).toBe("Weekly Fitness score unavailable.");
    const label = tree.root.findByProps({ testID: "weekly-fitness-combined-ring-label" });
    const text = (label.children as (string | number)[])
      .filter((c) => typeof c === "string" || typeof c === "number")
      .join("");
    expect(text).toBe("—");
  });

  it("clamps over-goal visual progress to 100%", () => {
    const overRow: WeeklyFitnessRow = {
      key: "activity",
      label: "Activity",
      valueLabel: "20,000 steps",
      accessibilityValueLabel: "20,000 average steps, goal 10,000 steps per day",
      progress: 2,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "complete",
      statusLabel: "Complete",
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[overRow]}
          combined={{ progress: 1, percent: 100, enabledCategoryCount: 1 }}
          progressToGoalVm={progressActivityExcellentVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(findBarFillWidth(tree, "activity")).toBe("100%");
    const bar = tree.root.findByProps({ testID: "weekly-fitness-bar-activity" });
    expect((bar.props as { accessibilityValue?: { now?: number } }).accessibilityValue?.now).toBe(100);
    expect(collectAllText(tree)).toContain("Activity goal reached");
    expect(collectAllText(tree)).toContain("Goal: 10,000 avg/day");
    expect(collectAllText(tree)).not.toContain("On track today");
  });

  it("clamps ring score to 0 and 100 edge cases", () => {
    let lowTree!: renderer.ReactTestRenderer;
    act(() => {
      lowTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={{ progress: -1, percent: -20, enabledCategoryCount: 3 }}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const lowLabel = lowTree.root.findByProps({ testID: "weekly-fitness-combined-ring-label" });
    const lowText = (lowLabel.children as (string | number)[])
      .filter((c) => typeof c === "string" || typeof c === "number")
      .join("");
    expect(lowText).toBe("0%");

    let highTree!: renderer.ReactTestRenderer;
    act(() => {
      highTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={{ progress: 3, percent: 140, enabledCategoryCount: 3 }}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const highLabel = highTree.root.findByProps({ testID: "weekly-fitness-combined-ring-label" });
    const highText = (highLabel.children as (string | number)[])
      .filter((c) => typeof c === "string" || typeof c === "number")
      .join("");
    expect(highText).toBe("100%");
  });

  it("opens Activity, Strength, and Cardio module pages on row press and goals editor on My goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-activity" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(WEEKLY_FITNESS_ROUTES.activity);

    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-strength" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(WEEKLY_FITNESS_ROUTES.strength);

    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-cardio" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(WEEKLY_FITNESS_ROUTES.cardio);
    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-my-goal" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(goalsHref);
  });

  it("shows loading / error / signed-out states without the percent number", () => {
    let loadingTree!: renderer.ReactTestRenderer;
    act(() => {
      loadingTree = renderer.create(
        <WeeklyFitnessCard
          loading
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          progressToGoalVm={progressNoGoalsVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(loadingTree)).toContain("Loading this week’s results");
    expect(loadingTree.root.findAllByProps({ testID: "weekly-fitness-combined-ring" }).length).toBe(0);

    let errorTree!: renderer.ReactTestRenderer;
    act(() => {
      errorTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error="Network failed"
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(errorTree)).toContain("Network failed");
    expect(errorTree.root.findAllByProps({ testID: "weekly-fitness-combined-ring" }).length).toBe(0);

    let signedOutTree!: renderer.ReactTestRenderer;
    act(() => {
      signedOutTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          progressToGoalVm={progressNoGoalsVm}
          goalsHref={goalsHref}
          hasUser={false}
        />,
      );
    });
    expect(collectAllText(signedOutTree)).toContain("Sign in");
    expect(signedOutTree.root.findAllByProps({ testID: "weekly-fitness-combined-ring" }).length).toBe(0);
  });

  it("cardio above goal and strength goal hit copy", () => {
    const vm = buildWeeklyFitnessProgressToGoalVm({
      activity: fullActivity({
        avgStepsPerDay: 8000,
        goalStepsPerDay: 8000,
        elapsedDaysWithData: 2,
        elapsedCalendarDaysThroughToday: 2,
        numericWeekStepsSum: 16000,
        hasNumericStepsAllElapsedCalendarDays: true,
        goalProgress01: 1,
        valueLabel: "8,000 steps",
        accessibilityValueLabel: "a11y",
      }),
      strength: fullStrength({
        workoutsThisWeek: 5,
        goalWorkoutsPerWeek: 5,
        goalProgress01: 1,
        valueLabel: "5 workouts",
        accessibilityValueLabel: "a11y",
      }),
      cardio: fullCardio({
        totalMilesThisWeek: 11.2,
        goalMilesPerWeek: 10,
        goalProgress01: 1,
        valueLabel: "11.2 miles",
        accessibilityValueLabel: "a11y",
      }),
      sleep: defaultSleepForProgressVm,
    });
    expect(weeklyFitnessProgressToGoalItem(vm, "strength").primary).toBe("Strength goal reached");
    expect(weeklyFitnessProgressToGoalItem(vm, "strength").support).toBe("Goal: 5 workouts");
    expect(weeklyFitnessProgressToGoalItem(vm, "activity").primary).toBe("Activity goal reached");
    expect(weeklyFitnessProgressToGoalItem(vm, "activity").support).toBe("Goal: 8,000 avg/day");
    expect(weeklyFitnessProgressToGoalItem(vm, "cardio").primary).toBe("Cardio goal reached");
    expect(weeklyFitnessProgressToGoalItem(vm, "cardio").support).toBe("Goal: 10 miles");
  });

  it("progress-to-goal section uses text only (no image nodes)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          progressToGoalVm={sampleProgressToGoalVm}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(tree.root.findAllByType("Image").length).toBe(0);
  });
});
