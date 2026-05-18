import { describe, expect, it } from "@jest/globals";

import {
  coerceWeeklyFitnessGoals,
  mergeStoredPreferences,
  WEEKLY_FITNESS_GOAL_DEFAULTS,
  preferencesSchema,
} from "@oli/contracts";

describe("coerceWeeklyFitnessGoals", () => {
  it("fills sleepHoursPerNightGoal when missing on legacy stored goals", () => {
    const coerced = coerceWeeklyFitnessGoals({
      activityStepsPerDayGoal: 10_000,
      strengthWorkoutsPerWeekGoal: 5,
      cardioMilesPerWeekGoal: 10,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(coerced?.sleepHoursPerNightGoal).toBe(WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal);
  });

  it("mergeStoredPreferences validates after sleep backfill", () => {
    const merged = mergeStoredPreferences({
      units: { mass: "lb" },
      timezone: { mode: "recorded" },
      selectedGymId: null,
      weeklyFitnessGoals: {
        activityStepsPerDayGoal: 10_000,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 10,
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    const parsed = preferencesSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.weeklyFitnessGoals?.sleepHoursPerNightGoal).toBe(8);
  });
});
