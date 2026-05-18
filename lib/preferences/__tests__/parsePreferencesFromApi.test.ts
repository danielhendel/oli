import { describe, expect, it } from "@jest/globals";

import { parsePreferencesFromApi } from "@/lib/preferences/parsePreferencesFromApi";

describe("parsePreferencesFromApi", () => {
  it("coerces legacy weeklyFitnessGoals without sleep field", () => {
    const p = parsePreferencesFromApi({
      units: { mass: "lb" },
      timezone: { mode: "recorded" },
      selectedGymId: null,
      weeklyFitnessGoals: {
        activityStepsPerDayGoal: 10_000,
        strengthWorkoutsPerWeekGoal: 5,
        cardioMilesPerWeekGoal: 10,
        updatedAt: "2026-05-01T12:00:00.000Z",
      },
    });
    expect(p.weeklyFitnessGoals?.sleepHoursPerNightGoal).toBe(8);
  });
});
