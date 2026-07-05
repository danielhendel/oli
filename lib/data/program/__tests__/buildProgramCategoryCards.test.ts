import { buildProgramCategoryCards } from "@/lib/data/program/buildProgramCategoryCards";
import { WEEKLY_FITNESS_GOAL_DEFAULTS } from "@oli/contracts";

describe("buildProgramCategoryCards", () => {
  it("returns five category cards with target summaries", () => {
    const cards = buildProgramCategoryCards({
      activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
      strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
      cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
      sleepHoursPerNightGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
      isDefault: true,
    });
    expect(cards).toHaveLength(5);
    expect(cards.map((c) => c.id)).toEqual(["weight", "activity", "workout", "cardio", "nutrition"]);
    expect(cards[1]?.targetSummary).toContain("10,000");
  });
});
