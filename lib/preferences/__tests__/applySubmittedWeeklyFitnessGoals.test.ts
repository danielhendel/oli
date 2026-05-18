import { describe, expect, it } from "@jest/globals";

import { defaultPreferences } from "@oli/contracts";

import {
  applySubmittedWeeklyFitnessGoalsToPreferences,
  resolveWeeklyFitnessGoals,
} from "@/lib/preferences/weeklyFitnessGoals";

describe("applySubmittedWeeklyFitnessGoalsToPreferences", () => {
  it("preserves submitted sleep goal when API response omits sleepHoursPerNightGoal", () => {
    const submitted = {
      activityStepsPerDayGoal: 10_000,
      strengthWorkoutsPerWeekGoal: 5,
      cardioMilesPerWeekGoal: 10,
      sleepHoursPerNightGoal: 7.5,
    };
    const apiPrefs = {
      ...defaultPreferences(),
      weeklyFitnessGoals: {
        activityStepsPerDayGoal: 10_000,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 10,
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    };
    const merged = applySubmittedWeeklyFitnessGoalsToPreferences(
      apiPrefs,
      submitted,
      "2026-05-18T12:00:00.000Z",
    );
    expect(resolveWeeklyFitnessGoals(merged).sleepHoursPerNightGoal).toBe(7.5);
    expect(merged.weeklyFitnessGoals?.sleepHoursPerNightGoal).toBe(7.5);
  });
});
