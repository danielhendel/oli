import {
  WEEKLY_FITNESS_GOAL_DEFAULTS,
  WEEKLY_FITNESS_GOAL_LIMITS,
  type Preferences,
  type WeeklyFitnessGoals,
} from "@oli/contracts";

/** Editable subset (server stamps `updatedAt`). */
export type WeeklyFitnessGoalsInput = Pick<
  WeeklyFitnessGoals,
  "activityStepsPerDayGoal" | "strengthWorkoutsPerWeekGoal" | "cardioMilesPerWeekGoal"
>;

export type WeeklyFitnessGoalsResolved = {
  activityStepsPerDayGoal: number;
  strengthWorkoutsPerWeekGoal: number;
  cardioMilesPerWeekGoal: number;
  /** True when no persisted record exists (defaults shown). */
  isDefault: boolean;
};

/**
 * Resolve effective Dash Weekly Fitness goals: persisted preferences when present, otherwise
 * Phase 1 defaults from {@link WEEKLY_FITNESS_GOAL_DEFAULTS}.
 */
export function resolveWeeklyFitnessGoals(prefs: Preferences): WeeklyFitnessGoalsResolved {
  const g = prefs.weeklyFitnessGoals;
  if (
    g &&
    typeof g.activityStepsPerDayGoal === "number" &&
    typeof g.strengthWorkoutsPerWeekGoal === "number" &&
    typeof g.cardioMilesPerWeekGoal === "number"
  ) {
    return {
      activityStepsPerDayGoal: g.activityStepsPerDayGoal,
      strengthWorkoutsPerWeekGoal: g.strengthWorkoutsPerWeekGoal,
      cardioMilesPerWeekGoal: g.cardioMilesPerWeekGoal,
      isDefault: false,
    };
  }
  return {
    activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
    strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
    cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
    isDefault: true,
  };
}

export type WeeklyFitnessGoalsValidationError =
  | { field: "activityStepsPerDayGoal"; message: string }
  | { field: "strengthWorkoutsPerWeekGoal"; message: string }
  | { field: "cardioMilesPerWeekGoal"; message: string };

/**
 * Validate a candidate input from the goals editor against {@link WEEKLY_FITNESS_GOAL_LIMITS}.
 * Returns the first error found per field (one per field).
 */
export function validateWeeklyFitnessGoalsInput(
  input: WeeklyFitnessGoalsInput,
): WeeklyFitnessGoalsValidationError[] {
  const errs: WeeklyFitnessGoalsValidationError[] = [];
  const lim = WEEKLY_FITNESS_GOAL_LIMITS;

  const a = input.activityStepsPerDayGoal;
  if (!Number.isFinite(a) || !Number.isInteger(a)) {
    errs.push({ field: "activityStepsPerDayGoal", message: "Enter a whole number of steps." });
  } else if (a < lim.activityStepsPerDayMin || a > lim.activityStepsPerDayMax) {
    errs.push({
      field: "activityStepsPerDayGoal",
      message: `Steps goal must be between ${lim.activityStepsPerDayMin.toLocaleString()} and ${lim.activityStepsPerDayMax.toLocaleString()}.`,
    });
  }

  const s = input.strengthWorkoutsPerWeekGoal;
  if (!Number.isFinite(s) || !Number.isInteger(s)) {
    errs.push({ field: "strengthWorkoutsPerWeekGoal", message: "Enter a whole number of workouts." });
  } else if (s < lim.strengthWorkoutsPerWeekMin || s > lim.strengthWorkoutsPerWeekMax) {
    errs.push({
      field: "strengthWorkoutsPerWeekGoal",
      message: `Strength goal must be between ${lim.strengthWorkoutsPerWeekMin} and ${lim.strengthWorkoutsPerWeekMax} per week.`,
    });
  }

  const c = input.cardioMilesPerWeekGoal;
  if (!Number.isFinite(c) || c < 0) {
    errs.push({ field: "cardioMilesPerWeekGoal", message: "Enter a non-negative number of miles." });
  } else if (c < lim.cardioMilesPerWeekMin || c > lim.cardioMilesPerWeekMax) {
    errs.push({
      field: "cardioMilesPerWeekGoal",
      message: `Cardio goal must be between ${lim.cardioMilesPerWeekMin} and ${lim.cardioMilesPerWeekMax} miles per week.`,
    });
  }

  return errs;
}
