import { describe, expect, it } from "@jest/globals";

import { buildWeeklyFitnessCardModel } from "@/lib/data/dash/buildWeeklyFitnessCardModel";
import { WEEKLY_FITNESS_METRIC_ORDER } from "@/lib/data/dash/weeklyFitnessRoutes";
import type { WeeklyFitnessActivityMetrics } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyFitnessStrengthMetricsFromFacts } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyFitnessCardioMetricsFromFacts } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyFitnessSleepMetrics } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyReadinessResult } from "@/lib/data/dash/ouraReadinessWeekly";
import type { WeeklyNutritionCoverageResult } from "@/lib/data/dash/weeklyNutritionCoverage";
import type { WeeklyStressCoverageResult } from "@/lib/data/dash/ouraStressWeekly";
import type { BodyCompositionGoalV1 } from "@oli/contracts";

function activity(p: Partial<WeeklyFitnessActivityMetrics> = {}): WeeklyFitnessActivityMetrics {
  return {
    avgStepsPerDay: 8000,
    goalStepsPerDay: 10000,
    elapsedDaysWithData: 5,
    elapsedCalendarDaysThroughToday: 5,
    numericWeekStepsSum: 40000,
    hasNumericStepsAllElapsedCalendarDays: true,
    goalProgress01: 0.8,
    valueLabel: "8,000 steps",
    accessibilityValueLabel: "8,000 average steps, goal 10,000 steps per day",
    ...p,
  };
}

function strength(
  p: Partial<WeeklyFitnessStrengthMetricsFromFacts> = {},
): WeeklyFitnessStrengthMetricsFromFacts {
  return {
    workoutsThisWeek: 3,
    goalWorkoutsPerWeek: 5,
    goalProgress01: 0.6,
    hasTrustedData: true,
    resolvedDayCount: 3,
    valueLabel: "3 workouts",
    accessibilityValueLabel: "3 workouts, goal 5 workouts",
    ...p,
  };
}

function cardio(
  p: Partial<WeeklyFitnessCardioMetricsFromFacts> = {},
): WeeklyFitnessCardioMetricsFromFacts {
  return {
    totalMilesThisWeek: 5,
    goalMilesPerWeek: 10,
    goalProgress01: 0.5,
    hasTrustedData: true,
    resolvedDayCount: 2,
    valueLabel: "5.0 miles",
    accessibilityValueLabel: "5.0 miles, goal 10 miles",
    ...p,
  };
}

function sleep(p: Partial<WeeklyFitnessSleepMetrics> = {}): WeeklyFitnessSleepMetrics {
  return {
    avgSleepMinutesPerNight: 480,
    goalHoursPerNight: 8,
    goalSleepMinutesPerNight: 480,
    completedNightsWithData: 4,
    goalProgress01: 1,
    valueLabel: "8h avg",
    accessibilityValueLabel: "8 hours average, goal 8 hours per night",
    ...p,
  };
}

function readiness(p: Partial<WeeklyReadinessResult> = {}): WeeklyReadinessResult {
  return {
    weeklyAverage: 84,
    resolvedDayCount: 4,
    eligibleElapsedDayCount: 5,
    progress01: 0.84,
    displayValue: "84 avg",
    accessibilityLabel: "Readiness, 84 average this week, button. Opens Readiness analytics.",
    state: "ready",
    ...p,
  };
}

function nutrition(p: Partial<WeeklyNutritionCoverageResult> = {}): WeeklyNutritionCoverageResult {
  return {
    loggedDayCount: 3,
    elapsedEligibleDayCount: 5,
    resolvedDayCount: 5,
    progress01: 0.6,
    state: "ready",
    displayValue: "3 of 5 logged",
    accessibilityLabel:
      "Nutrition, 3 of 5 elapsed days logged, logging coverage, button. Opens Nutrition analytics.",
    ...p,
  };
}

function stress(p: Partial<WeeklyStressCoverageResult> = {}): WeeklyStressCoverageResult {
  return {
    eligibleStressDayCount: 5,
    balancedDayCount: 4,
    stressfulDayCount: 1,
    restoredDayCount: 2,
    normalDayCount: 2,
    progress01: 0.8,
    displayValue: "4 of 5 balanced",
    accessibilityLabel:
      "Stress, 4 of 5 eligible days balanced, button. Opens Stress analytics.",
    ...p,
  };
}

const bodyGoal: BodyCompositionGoalV1 = {
  version: 1,
  primaryMetric: "weight",
  baselineValue: 80,
  targetValue: 75,
  unit: "kg",
  baselineAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("buildWeeklyFitnessCardModel", () => {
  it("orders metrics exactly sleep→…→stress", () => {
    const m = buildWeeklyFitnessCardModel({
      activity: activity(),
      strength: strength(),
      cardio: cardio(),
      sleep: sleep(),
      readiness: readiness(),
      nutrition: nutrition(),
      stress: stress(),
      bodyGoal: null,
      latestTrusted: { metric: null, value: null, unit: null, measuredAt: null },
    });
    expect(m.metrics.map((r) => r.key)).toEqual([...WEEKLY_FITNESS_METRIC_ORDER]);
  });

  it("excludes readiness/nutrition/stress/body from Weekly Progress", () => {
    const m = buildWeeklyFitnessCardModel({
      activity: activity({ goalProgress01: 1, elapsedDaysWithData: 1 }),
      strength: strength({ goalProgress01: 1 }),
      cardio: cardio({ hasTrustedData: false, goalProgress01: null, valueLabel: "\u2014" }),
      sleep: sleep({ completedNightsWithData: 0, goalProgress01: 0 }),
      readiness: readiness({ progress01: 1, weeklyAverage: 100 }),
      nutrition: nutrition({ progress01: 1 }),
      stress: stress({ progress01: 1 }),
      bodyGoal,
      latestTrusted: {
        metric: "weight",
        value: 75,
        unit: "kg",
        measuredAt: "2026-07-10T00:00:00.000Z",
      },
    });
    // Only activity + strength eligible → 2 contributors → score available
    expect(m.eligibleWeeklyProgressCount).toBe(2);
    expect(m.weeklyProgressScore0to100).toBe(100);
    // Body score available but must not affect weekly progress count
    expect(m.bodyCompositionScore0to100).toBe(100);
    expect(m.bodyComposition.label).toBe("100");
    expect(m.bodyComposition.label.includes("%")).toBe(false);
    expect(m.weeklyProgress.label).toContain("%");
  });

  it("treats missing strength as excluded, trusted zero as included", () => {
    const missing = buildWeeklyFitnessCardModel({
      activity: activity({ goalProgress01: 1, elapsedDaysWithData: 1 }),
      strength: strength({
        hasTrustedData: false,
        goalProgress01: null,
        workoutsThisWeek: null,
        valueLabel: "\u2014",
      }),
      cardio: cardio({ hasTrustedData: false, goalProgress01: null, valueLabel: "\u2014" }),
      sleep: sleep({ completedNightsWithData: 0 }),
      readiness: readiness({ state: "no_data", progress01: null, displayValue: "No data" }),
      nutrition: nutrition({ progress01: null, displayValue: "\u2014" }),
      stress: { ...stress(), progress01: null, displayValue: "No data", eligibleStressDayCount: 0 },
      bodyGoal: null,
      latestTrusted: { metric: null, value: null, unit: null, measuredAt: null },
    });
    expect(missing.eligibleWeeklyProgressCount).toBe(1);
    expect(missing.weeklyProgressScore0to100).toBeNull();
    expect(missing.metrics.find((r) => r.key === "strength")?.valueLabel).toBe("\u2014");

    const zero = buildWeeklyFitnessCardModel({
      activity: activity({ goalProgress01: 1, elapsedDaysWithData: 1 }),
      strength: strength({
        hasTrustedData: true,
        goalProgress01: 0,
        workoutsThisWeek: 0,
        valueLabel: "0 workouts",
      }),
      cardio: cardio({ hasTrustedData: false, goalProgress01: null, valueLabel: "\u2014" }),
      sleep: sleep({ completedNightsWithData: 0 }),
      readiness: readiness({ state: "no_data", progress01: null, displayValue: "No data" }),
      nutrition: nutrition({ progress01: null, displayValue: "\u2014" }),
      stress: { ...stress(), progress01: null, displayValue: "No data", eligibleStressDayCount: 0 },
      bodyGoal: null,
      latestTrusted: { metric: null, value: null, unit: null, measuredAt: null },
    });
    expect(zero.eligibleWeeklyProgressCount).toBe(2);
    expect(zero.weeklyProgressScore0to100).toBe(50);
  });

  it("shows Connect Oura for readiness disconnect without inventing progress", () => {
    const m = buildWeeklyFitnessCardModel({
      activity: activity(),
      strength: strength(),
      cardio: cardio(),
      sleep: sleep(),
      readiness: readiness({
        state: "connect_oura",
        progress01: null,
        displayValue: "Connect Oura",
        accessibilityLabel: "Readiness, connect Oura, button. Opens Oura connection settings.",
      }),
      nutrition: nutrition(),
      stress: {
        ...stress(),
        progress01: null,
        displayValue: "Connect Oura",
        state: "connect_oura",
      } as WeeklyStressCoverageResult & { state: "connect_oura" },
      bodyGoal: null,
      latestTrusted: { metric: null, value: null, unit: null, measuredAt: null },
    });
    expect(m.metrics.find((r) => r.key === "readiness")?.valueLabel).toBe("Connect Oura");
    expect(m.metrics.find((r) => r.key === "readiness")?.hasProgress).toBe(false);
    expect(m.metrics.find((r) => r.key === "stress")?.valueLabel).toBe("Connect Oura");
  });
});
