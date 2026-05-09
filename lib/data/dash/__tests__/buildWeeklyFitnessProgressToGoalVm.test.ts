import {
  buildWeeklyFitnessCardioMetricVm,
  buildWeeklyFitnessActivityMetricVm,
  buildWeeklyFitnessProgressToGoalVm,
  buildWeeklyFitnessStrengthMetricVm,
  formatWeeklyFitnessCardioProgressLine,
  formatWeeklyFitnessStrengthProgressLine,
} from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import type {
  WeeklyFitnessActivityMetrics,
  WeeklyFitnessCardioMetrics,
  WeeklyFitnessStrengthMetrics,
} from "@/lib/data/dash/weeklyFitnessDashProgress";

function strength(partial: Partial<WeeklyFitnessStrengthMetrics>): WeeklyFitnessStrengthMetrics {
  return {
    workoutsThisWeek: 0,
    goalWorkoutsPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...partial,
  };
}

function activity(partial: Partial<WeeklyFitnessActivityMetrics>): WeeklyFitnessActivityMetrics {
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
    ...partial,
  };
}

function cardio(partial: Partial<WeeklyFitnessCardioMetrics>): WeeklyFitnessCardioMetrics {
  return {
    totalMilesThisWeek: 0,
    goalMilesPerWeek: 0,
    goalProgress01: 0,
    valueLabel: "",
    accessibilityValueLabel: "",
    ...partial,
  };
}

describe("formatWeeklyFitnessStrengthProgressLine", () => {
  it("returns Goal not set when weekly goal is missing", () => {
    expect(formatWeeklyFitnessStrengthProgressLine(strength({ goalWorkoutsPerWeek: 0 }))).toBe(
      "Goal not set",
    );
  });

  it("returns remaining workouts when under goal", () => {
    expect(
      formatWeeklyFitnessStrengthProgressLine(
        strength({ workoutsThisWeek: 2, goalWorkoutsPerWeek: 5 }),
      ),
    ).toBe("3 workouts remaining");
  });
});

describe("buildWeeklyFitnessStrengthMetricVm", () => {
  it("includes goal workouts on the support line when a goal exists", () => {
    const vm = buildWeeklyFitnessStrengthMetricVm(
      strength({
        workoutsThisWeek: 3,
        goalWorkoutsPerWeek: 5,
        goalProgress01: 0.6,
        valueLabel: "3 workouts",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("2 workouts remaining");
    expect(vm.support).toBe("Goal: 5 workouts");
  });

  it("omits support when goal is not set", () => {
    const vm = buildWeeklyFitnessStrengthMetricVm(
      strength({
        workoutsThisWeek: 1,
        goalWorkoutsPerWeek: 0,
        goalProgress01: 0,
        valueLabel: "No goal set",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("Goal not set");
    expect(vm.support).toBe("");
  });

  it("uses singular workout on support line when goal is 1", () => {
    const vm = buildWeeklyFitnessStrengthMetricVm(
      strength({
        workoutsThisWeek: 0,
        goalWorkoutsPerWeek: 1,
        goalProgress01: 0,
        valueLabel: "0 workouts",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.support).toBe("Goal: 1 workout");
  });
});

describe("buildWeeklyFitnessActivityMetricVm", () => {
  it("never uses vague On track today", () => {
    const vm = buildWeeklyFitnessActivityMetricVm(
      activity({
        goalStepsPerDay: 10_000,
        elapsedCalendarDaysThroughToday: 5,
        numericWeekStepsSum: 50_000,
        hasNumericStepsAllElapsedCalendarDays: true,
        avgStepsPerDay: 10_000,
        elapsedDaysWithData: 5,
        goalProgress01: 1,
        valueLabel: "10,000 steps",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("Average goal reached");
    expect(vm.primary).not.toMatch(/on track/i);
    expect(vm.support).toBe("10,000 avg/day");
    expect(vm.support).toMatch(/avg\/day/);
  });

  it("uses steps needed today with To reach support when pace is short", () => {
    const vm = buildWeeklyFitnessActivityMetricVm(
      activity({
        goalStepsPerDay: 10_000,
        elapsedCalendarDaysThroughToday: 7,
        numericWeekStepsSum: 69_025,
        hasNumericStepsAllElapsedCalendarDays: true,
        avgStepsPerDay: 9858,
        elapsedDaysWithData: 7,
        goalProgress01: 0.9858,
        valueLabel: "9,858 steps",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("975 steps needed today");
    expect(vm.support).toBe("To reach 10,000 avg/day");
  });

  it("labels average-gap fallback with To reach support when under average", () => {
    const vm = buildWeeklyFitnessActivityMetricVm(
      activity({
        goalStepsPerDay: 8000,
        avgStepsPerDay: 7200,
        elapsedDaysWithData: 3,
        hasNumericStepsAllElapsedCalendarDays: false,
        goalProgress01: 0.9,
        valueLabel: "7,200 steps",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("800 steps below daily average");
    expect(vm.support).toBe("To reach 8,000 avg/day");
  });
});

describe("formatWeeklyFitnessCardioProgressLine", () => {
  it("returns Goal not set when weekly miles goal is missing", () => {
    expect(formatWeeklyFitnessCardioProgressLine(cardio({ goalMilesPerWeek: 0 }))).toBe(
      "Goal not set",
    );
  });

  it("returns under goal when weekly miles are short", () => {
    expect(
      formatWeeklyFitnessCardioProgressLine(
        cardio({ totalMilesThisWeek: 2.6, goalMilesPerWeek: 10 }),
      ),
    ).toBe("7.4 mi under goal");
  });
});

describe("buildWeeklyFitnessCardioMetricVm", () => {
  it("includes Goal: X mi on support when goal is set", () => {
    const vm = buildWeeklyFitnessCardioMetricVm(
      cardio({
        totalMilesThisWeek: 2.6,
        goalMilesPerWeek: 10,
        goalProgress01: 0.26,
        valueLabel: "2.6 miles",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("7.4 mi under goal");
    expect(vm.support).toBe("Goal: 10 mi");
  });

  it("omits support when cardio goal is not set", () => {
    const vm = buildWeeklyFitnessCardioMetricVm(
      cardio({
        totalMilesThisWeek: 2,
        goalMilesPerWeek: 0,
        goalProgress01: 0,
        valueLabel: "No goal set",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.primary).toBe("Goal not set");
    expect(vm.support).toBe("");
  });
});

describe("buildWeeklyFitnessProgressToGoalVm", () => {
  it("builds accessibility label from primaries and supports", () => {
    const vm = buildWeeklyFitnessProgressToGoalVm({
      activity: activity({
        goalStepsPerDay: 8000,
        elapsedCalendarDaysThroughToday: 1,
        numericWeekStepsSum: 8400,
        hasNumericStepsAllElapsedCalendarDays: true,
        avgStepsPerDay: 8400,
        elapsedDaysWithData: 1,
        goalProgress01: 1,
        valueLabel: "8,400 steps",
        accessibilityValueLabel: "a11y",
      }),
      strength: strength({
        workoutsThisWeek: 4,
        goalWorkoutsPerWeek: 5,
        goalProgress01: 0.8,
        valueLabel: "4 workouts",
        accessibilityValueLabel: "a11y",
      }),
      cardio: cardio({
        totalMilesThisWeek: 2.6,
        goalMilesPerWeek: 10,
        goalProgress01: 0.26,
        valueLabel: "2.6 miles",
        accessibilityValueLabel: "a11y",
      }),
    });
    expect(vm.strength.primary).toBe("1 workout remaining");
    expect(vm.strength.support).toBe("Goal: 5 workouts");
    expect(vm.activity.primary).toBe("Average goal reached");
    expect(vm.activity.support).toMatch(/avg\/day/);
    expect(vm.cardio.primary).toBe("7.4 mi under goal");
    expect(vm.cardio.support).toBe("Goal: 10 mi");
    expect(vm.accessibilityLabel).toContain("Progress to goal");
    expect(vm.accessibilityLabel).not.toMatch(/on track/i);
  });
});
