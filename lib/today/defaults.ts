import {
  NUTRITION_KCAL_GOAL,
  NUTRITION_PROTEIN_G_GOAL,
} from "@/lib/data/nutrition/nutritionGoals";
import { WEEKLY_FITNESS_GOAL_DEFAULTS } from "@oli/contracts";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";

/** Typed daily target defaults — never scatter magic numbers in UI. */
export const TODAY_TARGET_DEFAULTS = {
  activityStepsPerDay: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
  strengthWorkoutsPerWeek: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
  cardioMilesPerWeek: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
  calorieIntakeKcal: NUTRITION_KCAL_GOAL,
  proteinG: NUTRITION_PROTEIN_G_GOAL,
} as const;

const METERS_PER_MILE = 1609.344;

export function dailyCardioMilesTargetFromWeekly(weeklyMiles: number): number | null {
  if (!(weeklyMiles > 0)) return null;
  return Math.round((weeklyMiles / 7) * 10) / 10;
}

export function metersToMiles(meters: number): number {
  return Math.round((meters / METERS_PER_MILE) * 10) / 10;
}

export function resolveTodayActivityStepsTarget(goals: WeeklyFitnessGoalsResolved): {
  target: number | null;
  usesDefault: boolean;
} {
  if (goals.activityStepsPerDayGoal > 0) {
    return { target: goals.activityStepsPerDayGoal, usesDefault: goals.isDefault };
  }
  return { target: null, usesDefault: goals.isDefault };
}

/** Weekly strength preference only — no daily workout schedule model exists yet. */
export function resolveTodayWorkoutWeeklyGoal(goals: WeeklyFitnessGoalsResolved): {
  weeklyGoal: number;
  usesDefault: boolean;
  hasWeeklyGoal: boolean;
} {
  const weeklyGoal = goals.strengthWorkoutsPerWeekGoal;
  return {
    weeklyGoal,
    usesDefault: goals.isDefault,
    hasWeeklyGoal: weeklyGoal > 0,
  };
}

export function resolveTodayCardioMilesTarget(goals: WeeklyFitnessGoalsResolved): {
  target: number | null;
  usesDefault: boolean;
} {
  const daily = dailyCardioMilesTargetFromWeekly(goals.cardioMilesPerWeekGoal);
  return { target: daily, usesDefault: goals.isDefault };
}
