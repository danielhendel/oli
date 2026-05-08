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
  const row: WeeklyFitnessRow = {
    key: "activity",
    label: "Activity",
    valueLabel: "9,992 steps",
    accessibilityValueLabel: "9,992 average steps, goal 10,000 steps per day",
    progress: 1,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "complete",
    statusLabel: "Complete",
  };

  it("builds activity weekly explainer with legend parity", () => {
    const vm = buildWeeklyFitnessMetricExplainerVm({ rowKey: "activity", row, goals });
    expect(vm.navigationTitle).toBe("Weekly Activity");
    expect(vm.readingLines[0]).toContain("9,992 steps");
    expect(vm.rangeLegendRows.length).toBe(5);
    expect(vm.tierMeanings.length).toBe(5);
  });
});
