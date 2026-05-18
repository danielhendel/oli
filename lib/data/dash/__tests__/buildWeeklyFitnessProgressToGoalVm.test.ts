import {
  buildWeeklyFitnessActivityMetricVm,
  buildWeeklyFitnessProgressToGoalVm,
  buildWeeklyFitnessSleepMetricVm,
  formatWeeklyFitnessCardioProgressLine,
  formatWeeklyFitnessSleepProgressLine,
  formatWeeklyFitnessStrengthProgressLine,
  weeklyFitnessProgressToGoalItem,
} from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import type {
  WeeklyFitnessActivityMetrics,
  WeeklyFitnessCardioMetrics,
  WeeklyFitnessSleepMetrics,
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

function sleep(partial: Partial<WeeklyFitnessSleepMetrics>): WeeklyFitnessSleepMetrics {
  return {
    avgSleepMinutesPerNight: 0,
    goalHoursPerNight: 0,
    goalSleepMinutesPerNight: 0,
    completedNightsWithData: 0,
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

  it("returns Strength goal reached when at or above goal", () => {
    expect(
      formatWeeklyFitnessStrengthProgressLine(
        strength({ workoutsThisWeek: 5, goalWorkoutsPerWeek: 5 }),
      ),
    ).toBe("Strength goal reached");
  });
});

describe("buildWeeklyFitnessActivityMetricVm", () => {
  it("uses steps remaining and Goal avg/day support when pace is short", () => {
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
    expect(vm.primary).toBe("975 steps remaining");
    expect(vm.primary).not.toContain("needed today");
    expect(vm.support).toBe("Goal: 10,000 avg/day");
  });

  it("returns Activity goal reached when pace is met", () => {
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
    expect(vm.primary).toBe("Activity goal reached");
    expect(vm.support).toBe("Goal: 10,000 avg/day");
  });
});

describe("formatWeeklyFitnessCardioProgressLine", () => {
  it("returns miles remaining when weekly miles are short", () => {
    expect(
      formatWeeklyFitnessCardioProgressLine(
        cardio({ totalMilesThisWeek: 2.6, goalMilesPerWeek: 10 }),
      ),
    ).toBe("7.4 miles remaining");
  });
});

describe("formatWeeklyFitnessSleepProgressLine", () => {
  it("returns sleep remaining when average is below goal", () => {
    expect(
      formatWeeklyFitnessSleepProgressLine(
        sleep({
          avgSleepMinutesPerNight: 435,
          goalHoursPerNight: 8,
          goalSleepMinutesPerNight: 480,
        }),
      ),
    ).toBe("45m sleep remaining");
  });

  it("returns Sleep goal reached when average meets goal", () => {
    expect(
      formatWeeklyFitnessSleepProgressLine(
        sleep({
          avgSleepMinutesPerNight: 492,
          goalHoursPerNight: 8,
          goalSleepMinutesPerNight: 480,
        }),
      ),
    ).toBe("Sleep goal reached");
  });
});

describe("buildWeeklyFitnessSleepMetricVm", () => {
  it("uses saved goal hours on support line", () => {
    const vm = buildWeeklyFitnessSleepMetricVm(
      sleep({
        avgSleepMinutesPerNight: 435,
        goalHoursPerNight: 7.5,
        goalSleepMinutesPerNight: 450,
        completedNightsWithData: 2,
        goalProgress01: 0.97,
        valueLabel: "7h 15m avg",
        accessibilityValueLabel: "a11y",
      }),
    );
    expect(vm.support).toBe("Goal: 7h 30m/night");
  });
});

describe("buildWeeklyFitnessProgressToGoalVm", () => {
  it("builds four items with manage-hub icon keys", () => {
    const vm = buildWeeklyFitnessProgressToGoalVm({
      activity: activity({
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
      sleep: sleep({
        avgSleepMinutesPerNight: 435,
        goalHoursPerNight: 7.5,
        goalSleepMinutesPerNight: 450,
        completedNightsWithData: 3,
        goalProgress01: 0.91,
        valueLabel: "7h 15m avg",
        accessibilityValueLabel: "a11y",
      }),
    });
    expect(vm.items).toHaveLength(4);
    expect(vm.items.map((i) => i.key)).toEqual(["activity", "strength", "cardio", "sleep"]);
    expect(vm.items.map((i) => i.iconKey)).toEqual(["activity", "strength", "cardio", "sleep"]);
    expect(weeklyFitnessProgressToGoalItem(vm, "activity").primary).toBe("975 steps remaining");
    expect(weeklyFitnessProgressToGoalItem(vm, "sleep").support).toBe("Goal: 7h 30m/night");
  });
});
