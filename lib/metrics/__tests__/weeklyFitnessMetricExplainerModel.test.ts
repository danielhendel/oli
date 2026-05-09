import { describe, expect, it } from "@jest/globals";

import type { WeeklyFitnessRow } from "@/lib/data/dash/useWeeklyFitnessCard";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";
import {
  buildWeeklyFitnessMetricExplainerVm,
  parseWeeklyFitnessExplainerRow,
} from "@/lib/metrics/weeklyFitnessMetricExplainerModel";

const goals: WeeklyFitnessGoalsResolved = {
  activityStepsPerDayGoal: 10000,
  strengthWorkoutsPerWeekGoal: 5,
  cardioMilesPerWeekGoal: 10,
  isDefault: false,
};

describe("parseWeeklyFitnessExplainerRow", () => {
  it.each(["activity", "cardio", "strength"] as const)("parses %s", (row) => {
    expect(parseWeeklyFitnessExplainerRow(row)).toBe(row);
  });

  it("returns null for invalid rows", () => {
    expect(parseWeeklyFitnessExplainerRow("steps")).toBeNull();
  });
});

describe("buildWeeklyFitnessMetricExplainerVm", () => {
  const activityRow: WeeklyFitnessRow = {
    key: "activity",
    label: "Activity",
    valueLabel: "10,340 steps",
    accessibilityValueLabel: "10,340 average steps, goal 10,000 steps per day",
    progress: 1,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "complete",
    statusLabel: "Complete",
  };

  it("builds concise activity Your Reading copy with real value", () => {
    const vm = buildWeeklyFitnessMetricExplainerVm({ rowKey: "activity", row: activityRow, goals });
    expect(vm.navigationTitle).toBe("Weekly Activity");
    expect(vm.readingLines[0]).toBe("Activity: 10,340 steps");
    expect(vm.readingLines[1]).toBe("You’re above your daily movement target this week.");
    expect(vm.readingLines.join(" ")).not.toContain("momentum matters more than perfection");
    expect(vm.readingLines).toHaveLength(2);
    expect(vm.rangeLegendRows.length).toBe(5);
    expect(vm.tierMeanings.length).toBe(5);
    expect(vm.structuredSection?.whatThisMeansTitle).toBe("What this means");
    expect(vm.structuredSection?.rangesTitle).toBe("Activity ranges");
    expect(vm.structuredSection?.howToUseTitle).toBe("How to use this");
    expect(vm.structuredSection?.whatThisMeansBody.join(" ")).not.toContain("one sleepy Wednesday");
  });

  it("builds concise strength Your Reading copy", () => {
    const row: WeeklyFitnessRow = {
      key: "strength",
      label: "Strength",
      valueLabel: "4 workouts",
      accessibilityValueLabel: "4 workouts, goal 5 workouts",
      progress: 0.8,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "onTrack",
      statusLabel: "On track",
    };
    const vm = buildWeeklyFitnessMetricExplainerVm({ rowKey: "strength", row, goals });
    expect(vm.readingLines[0]).toBe("Strength: 4 workouts");
    expect(vm.readingLines[1]).toBe("You’re building toward your weekly strength target this week.");
    expect(vm.readingLines[1].split(/\s+/).length).toBeLessThanOrEqual(22);
  });

  it("builds concise cardio Your Reading copy", () => {
    const row: WeeklyFitnessRow = {
      key: "cardio",
      label: "Cardio",
      valueLabel: "2.6 miles",
      accessibilityValueLabel: "2.6 miles, goal 10 miles",
      progress: 0.26,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "behind",
      statusLabel: "Behind",
    };
    const vm = buildWeeklyFitnessMetricExplainerVm({ rowKey: "cardio", row, goals });
    expect(vm.readingLines[0]).toBe("Cardio: 2.6 miles");
    expect(vm.readingLines[1]).toBe(
      "You’re below your weekly cardio target this week; this is the clearest area to build.",
    );
    expect(vm.structuredSection?.rangesTitle).toBe("Cardio ranges");
    expect(vm.structuredSection?.whatThisMeansBody.length).toBeGreaterThanOrEqual(1);
  });

  it("uses no-data fallback copy", () => {
    const activityNoData: WeeklyFitnessRow = {
      key: "activity",
      label: "Activity",
      valueLabel: "0 steps",
      accessibilityValueLabel: "0 average steps, goal 10,000 steps per day",
      progress: 0,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "behind",
      statusLabel: "Behind",
    };
    const strengthNoData: WeeklyFitnessRow = {
      key: "strength",
      label: "Strength",
      valueLabel: "0 workouts",
      accessibilityValueLabel: "0 workouts, goal 5 workouts",
      progress: 0,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "behind",
      statusLabel: "Behind",
    };
    const cardioNoData: WeeklyFitnessRow = {
      key: "cardio",
      label: "Cardio",
      valueLabel: "0.0 miles",
      accessibilityValueLabel: "0.0 miles, goal 10 miles",
      progress: 0,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "behind",
      statusLabel: "Behind",
    };
    expect(
      buildWeeklyFitnessMetricExplainerVm({ rowKey: "activity", row: activityNoData, goals }).readingLines[1],
    ).toBe("No weekly activity data yet.");
    expect(
      buildWeeklyFitnessMetricExplainerVm({ rowKey: "strength", row: strengthNoData, goals }).readingLines[1],
    ).toBe("No strength workouts logged this week.");
    expect(
      buildWeeklyFitnessMetricExplainerVm({ rowKey: "cardio", row: cardioNoData, goals }).readingLines[1],
    ).toBe("No cardio logged this week.");
  });

  it("does not mention goals when goal is missing", () => {
    const goalsMissing: WeeklyFitnessGoalsResolved = {
      activityStepsPerDayGoal: 0,
      strengthWorkoutsPerWeekGoal: 0,
      cardioMilesPerWeekGoal: 0,
      isDefault: false,
    };
    const vm = buildWeeklyFitnessMetricExplainerVm({
      rowKey: "activity",
      row: {
        ...activityRow,
        valueLabel: "8,250 steps",
        hasGoal: false,
        accessibilityValueLabel: "8,250 average steps, no goal set",
      },
      goals: goalsMissing,
    });
    expect(vm.readingLines[1].toLowerCase()).not.toContain("goal");
    expect(vm.readingLines.join(" ")).not.toContain("Goals you’ve set:");
  });
});
