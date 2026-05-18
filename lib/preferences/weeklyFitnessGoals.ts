import {
  WEEKLY_FITNESS_GOAL_DEFAULTS,
  WEEKLY_FITNESS_GOAL_LIMITS,
  type Preferences,
  type WeeklyFitnessGoals,
} from "@oli/contracts";

/** Editable subset (server stamps `updatedAt`). */
export type WeeklyFitnessGoalsInput = Pick<
  WeeklyFitnessGoals,
  | "activityStepsPerDayGoal"
  | "strengthWorkoutsPerWeekGoal"
  | "cardioMilesPerWeekGoal"
  | "sleepHoursPerNightGoal"
>;

export type WeeklyFitnessGoalField = keyof WeeklyFitnessGoalsInput;

const GOAL_FIELD_ORDER: readonly WeeklyFitnessGoalField[] = [
  "activityStepsPerDayGoal",
  "strengthWorkoutsPerWeekGoal",
  "cardioMilesPerWeekGoal",
  "sleepHoursPerNightGoal",
] as const;

/**
 * User-facing goal value for the goals editor (comma-separated integers; cardio keeps one decimal).
 */
export function formatWeeklyFitnessGoalDisplay(field: WeeklyFitnessGoalField, value: number): string {
  if (!Number.isFinite(value)) return "";
  if (field === "cardioMilesPerWeekGoal" || field === "sleepHoursPerNightGoal") {
    const rounded = Math.round(value * 10) / 10;
    if (Number.isInteger(rounded)) return rounded.toLocaleString();
    return String(rounded);
  }
  return Math.round(value).toLocaleString();
}

/** Map resolved goals to display strings for all editor fields. */
export function formatWeeklyFitnessGoalsResolvedForDisplay(
  resolved: Pick<
    WeeklyFitnessGoalsResolved,
    | "activityStepsPerDayGoal"
    | "strengthWorkoutsPerWeekGoal"
    | "cardioMilesPerWeekGoal"
    | "sleepHoursPerNightGoal"
  >,
): Record<WeeklyFitnessGoalField, string> {
  return {
    activityStepsPerDayGoal: formatWeeklyFitnessGoalDisplay(
      "activityStepsPerDayGoal",
      resolved.activityStepsPerDayGoal,
    ),
    strengthWorkoutsPerWeekGoal: formatWeeklyFitnessGoalDisplay(
      "strengthWorkoutsPerWeekGoal",
      resolved.strengthWorkoutsPerWeekGoal,
    ),
    cardioMilesPerWeekGoal: formatWeeklyFitnessGoalDisplay(
      "cardioMilesPerWeekGoal",
      resolved.cardioMilesPerWeekGoal,
    ),
    sleepHoursPerNightGoal: formatWeeklyFitnessGoalDisplay(
      "sleepHoursPerNightGoal",
      resolved.sleepHoursPerNightGoal,
    ),
  };
}

/** Parse editor text (strips commas) into a number; empty → NaN. */
export function parseWeeklyFitnessGoalText(text: string): number {
  const t = text.trim().replace(/,/g, "");
  if (!t) return Number.NaN;
  return Number(t);
}

/** Build candidate goals from the three editor field strings. */
export function weeklyFitnessGoalsInputFromFieldTexts(texts: Record<WeeklyFitnessGoalField, string>): WeeklyFitnessGoalsInput {
  const out = {} as WeeklyFitnessGoalsInput;
  for (const field of GOAL_FIELD_ORDER) {
    out[field] = parseWeeklyFitnessGoalText(texts[field]);
  }
  return out;
}

export type WeeklyFitnessGoalsResolved = {
  activityStepsPerDayGoal: number;
  strengthWorkoutsPerWeekGoal: number;
  cardioMilesPerWeekGoal: number;
  sleepHoursPerNightGoal: number;
  /** True when no persisted record exists (defaults shown). */
  isDefault: boolean;
};

/**
 * Resolve effective Dash Weekly Fitness goals: persisted preferences when present, otherwise
 * Phase 1 defaults from {@link WEEKLY_FITNESS_GOAL_DEFAULTS}.
 */
/**
 * After PUT /preferences, keep the goals the user just saved on the client even when the
 * response body omits additive fields (e.g. legacy weeklyFitnessGoals without sleep).
 */
export function applySubmittedWeeklyFitnessGoalsToPreferences(
  preferences: Preferences,
  submitted: WeeklyFitnessGoalsInput,
  updatedAt: string,
): Preferences {
  return {
    ...preferences,
    weeklyFitnessGoals: {
      ...submitted,
      updatedAt,
    },
  };
}

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
      sleepHoursPerNightGoal:
        typeof g.sleepHoursPerNightGoal === "number"
          ? g.sleepHoursPerNightGoal
          : WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
      isDefault: false,
    };
  }
  return {
    activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
    strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
    cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
    sleepHoursPerNightGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
    isDefault: true,
  };
}

export type WeeklyFitnessGoalsValidationError =
  | { field: "activityStepsPerDayGoal"; message: string }
  | { field: "strengthWorkoutsPerWeekGoal"; message: string }
  | { field: "cardioMilesPerWeekGoal"; message: string }
  | { field: "sleepHoursPerNightGoal"; message: string };

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

  const sl = input.sleepHoursPerNightGoal;
  if (!Number.isFinite(sl) || sl <= 0) {
    errs.push({ field: "sleepHoursPerNightGoal", message: "Enter a positive number of hours." });
  } else if (sl < lim.sleepHoursPerNightMin || sl > lim.sleepHoursPerNightMax) {
    errs.push({
      field: "sleepHoursPerNightGoal",
      message: `Sleep goal must be between ${lim.sleepHoursPerNightMin} and ${lim.sleepHoursPerNightMax} hours per night.`,
    });
  }

  return errs;
}
