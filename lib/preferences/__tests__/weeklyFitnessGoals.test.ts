import { describe, expect, it } from "@jest/globals";

import {
  formatWeeklyFitnessGoalDisplay,
  formatWeeklyFitnessGoalsResolvedForDisplay,
  parseWeeklyFitnessGoalText,
  resolveWeeklyFitnessGoals,
  validateWeeklyFitnessGoalsInput,
  weeklyFitnessGoalsInputFromFieldTexts,
} from "@/lib/preferences/weeklyFitnessGoals";
import { defaultPreferences } from "@oli/contracts";

describe("formatWeeklyFitnessGoalDisplay", () => {
  it("formats integer goals with grouping separators", () => {
    expect(formatWeeklyFitnessGoalDisplay("activityStepsPerDayGoal", 10_000)).toBe("10,000");
    expect(formatWeeklyFitnessGoalDisplay("strengthWorkoutsPerWeekGoal", 5)).toBe("5");
  });

  it("formats cardio miles with one decimal when needed", () => {
    expect(formatWeeklyFitnessGoalDisplay("cardioMilesPerWeekGoal", 10)).toBe("10");
    expect(formatWeeklyFitnessGoalDisplay("cardioMilesPerWeekGoal", 8.5)).toBe("8.5");
  });

  it("formats sleep hours with one decimal when needed", () => {
    expect(formatWeeklyFitnessGoalDisplay("sleepHoursPerNightGoal", 8)).toBe("8");
    expect(formatWeeklyFitnessGoalDisplay("sleepHoursPerNightGoal", 7.5)).toBe("7.5");
  });
});

describe("parseWeeklyFitnessGoalText", () => {
  it("strips commas before parsing", () => {
    expect(parseWeeklyFitnessGoalText("10,000")).toBe(10_000);
    expect(parseWeeklyFitnessGoalText("  12,345  ")).toBe(12_345);
  });

  it("returns NaN for empty input", () => {
    expect(Number.isNaN(parseWeeklyFitnessGoalText(""))).toBe(true);
    expect(Number.isNaN(parseWeeklyFitnessGoalText("   "))).toBe(true);
  });
});

describe("weeklyFitnessGoalsInputFromFieldTexts", () => {
  it("maps all three fields through parseWeeklyFitnessGoalText", () => {
    expect(
      weeklyFitnessGoalsInputFromFieldTexts({
        activityStepsPerDayGoal: "12,000",
        strengthWorkoutsPerWeekGoal: "4",
        cardioMilesPerWeekGoal: "8.5",
        sleepHoursPerNightGoal: "7.5",
      }),
    ).toEqual({
      activityStepsPerDayGoal: 12_000,
      strengthWorkoutsPerWeekGoal: 4,
      cardioMilesPerWeekGoal: 8.5,
      sleepHoursPerNightGoal: 7.5,
    });
  });
});

describe("formatWeeklyFitnessGoalsResolvedForDisplay", () => {
  it("formats resolved defaults for the editor", () => {
    const resolved = resolveWeeklyFitnessGoals(defaultPreferences());
    expect(formatWeeklyFitnessGoalsResolvedForDisplay(resolved)).toEqual({
      activityStepsPerDayGoal: "10,000",
      strengthWorkoutsPerWeekGoal: "5",
      cardioMilesPerWeekGoal: "10",
      sleepHoursPerNightGoal: "8",
    });
  });
});

describe("validateWeeklyFitnessGoalsInput", () => {
  it("rejects NaN and out-of-range values", () => {
    expect(
      validateWeeklyFitnessGoalsInput({
        activityStepsPerDayGoal: Number.NaN,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 10,
      }).some((e) => e.field === "activityStepsPerDayGoal"),
    ).toBe(true);

    expect(
      validateWeeklyFitnessGoalsInput({
        activityStepsPerDayGoal: 10_000,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 250,
      }).some((e) => e.field === "cardioMilesPerWeekGoal"),
    ).toBe(true);
  });
});
