import type {
  WeeklyFitnessActivityMetrics,
  WeeklyFitnessCardioMetrics,
  WeeklyFitnessStrengthMetrics,
} from "@/lib/data/dash/weeklyFitnessDashProgress";

/** One domain in the Weekly Fitness “Progress to goal” column: primary headline + optional goal context. */
export type WeeklyFitnessProgressMetricVm = {
  primary: string;
  /** Goal context line; empty → UI omits the supporting row (e.g. no goal set). */
  support: string;
};

export type WeeklyFitnessProgressToGoalVm = {
  strength: WeeklyFitnessProgressMetricVm;
  activity: WeeklyFitnessProgressMetricVm;
  cardio: WeeklyFitnessProgressMetricVm;
  accessibilityLabel: string;
};

const GOAL_NOT_SET = "Goal not set";

function formatMiDelta(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return "0";
  return miles.toFixed(1).replace(/\.0$/, "");
}

function formatCardioGoalSupportLine(goalMilesPerWeek: number): string {
  const g = Math.max(0, goalMilesPerWeek);
  if (g <= 0) return "";
  const goalText = g % 1 === 0 ? g.toFixed(0) : g.toFixed(1);
  return `Goal: ${goalText} mi`;
}

function formatStrengthGoalSupportLine(goalWorkoutsPerWeek: number): string {
  const g = Math.max(0, Math.round(goalWorkoutsPerWeek));
  if (g <= 0) return "";
  return g === 1 ? "Goal: 1 workout" : `Goal: ${g} workouts`;
}

export function formatWeeklyFitnessStrengthProgressLine(
  metrics: Pick<WeeklyFitnessStrengthMetrics, "workoutsThisWeek" | "goalWorkoutsPerWeek">,
): string {
  const goal = Math.max(0, Math.round(metrics.goalWorkoutsPerWeek));
  if (goal <= 0) return GOAL_NOT_SET;
  const total = Math.max(0, Math.round(metrics.workoutsThisWeek));
  if (total >= goal) {
    if (total === goal) return "Goal hit";
    const over = total - goal;
    return over === 1 ? "1 workout above goal" : `${over} workouts above goal`;
  }
  const rem = goal - total;
  return rem === 1 ? "1 workout remaining" : `${rem} workouts remaining`;
}

export function buildWeeklyFitnessStrengthMetricVm(
  metrics: WeeklyFitnessStrengthMetrics,
): WeeklyFitnessProgressMetricVm {
  const primary = formatWeeklyFitnessStrengthProgressLine(metrics);
  const support = formatStrengthGoalSupportLine(metrics.goalWorkoutsPerWeek);
  return { primary, support };
}

/**
 * Activity: pace line uses cumulative steps vs goal×elapsed days when rollup is complete;
 * otherwise labeled average-gap primaries. Supporting line always states the step goal in avg/day terms when goal &gt; 0.
 */
export function buildWeeklyFitnessActivityMetricVm(
  metrics: WeeklyFitnessActivityMetrics,
): WeeklyFitnessProgressMetricVm {
  const goal = Math.max(0, Math.round(metrics.goalStepsPerDay));
  if (goal <= 0) {
    return { primary: GOAL_NOT_SET, support: "" };
  }

  const goalSupportPlain = `${goal.toLocaleString()} avg/day`;
  const goalSupportToReach = `To reach ${goal.toLocaleString()} avg/day`;

  if (
    metrics.hasNumericStepsAllElapsedCalendarDays &&
    metrics.elapsedCalendarDaysThroughToday > 0
  ) {
    const requiredTotalThroughToday = goal * metrics.elapsedCalendarDaysThroughToday;
    const stepsNeededToday = Math.max(0, requiredTotalThroughToday - metrics.numericWeekStepsSum);
    if (stepsNeededToday === 0) {
      return {
        primary: "Average goal reached",
        support: goalSupportPlain,
      };
    }
    return {
      primary:
        stepsNeededToday === 1
          ? "1 step needed today"
          : `${stepsNeededToday.toLocaleString()} steps needed today`,
      support: goalSupportToReach,
    };
  }

  if (metrics.elapsedDaysWithData <= 0) {
    return {
      primary: "No daily average yet",
      support: goalSupportToReach,
    };
  }

  const avg = Math.max(0, Math.round(metrics.avgStepsPerDay));
  if (avg > goal) {
    const over = avg - goal;
    return {
      primary:
        over === 1
          ? "1 step above daily average"
          : `${over.toLocaleString()} steps above daily average`,
      support: goalSupportPlain,
    };
  }
  if (avg < goal) {
    const short = goal - avg;
    return {
      primary:
        short === 1
          ? "1 step below daily average"
          : `${short.toLocaleString()} steps below daily average`,
      support: goalSupportToReach,
    };
  }
  return {
    primary: "Average goal reached",
    support: goalSupportPlain,
  };
}

export function formatWeeklyFitnessCardioProgressLine(
  metrics: Pick<WeeklyFitnessCardioMetrics, "totalMilesThisWeek" | "goalMilesPerWeek">,
): string {
  const goal = Math.max(0, metrics.goalMilesPerWeek);
  if (goal <= 0) return GOAL_NOT_SET;
  const total = Math.max(0, metrics.totalMilesThisWeek);
  const CARDIO_HIT_EPS = 0.05;
  if (Math.abs(total - goal) < CARDIO_HIT_EPS) return "Goal hit";
  if (total > goal) {
    const over = total - goal;
    return `${formatMiDelta(over)} mi above goal`;
  }
  const under = goal - total;
  return `${formatMiDelta(under)} mi under goal`;
}

export function buildWeeklyFitnessCardioMetricVm(
  metrics: WeeklyFitnessCardioMetrics,
): WeeklyFitnessProgressMetricVm {
  const primary = formatWeeklyFitnessCardioProgressLine(metrics);
  const support = formatCardioGoalSupportLine(metrics.goalMilesPerWeek);
  return { primary, support };
}

export function buildWeeklyFitnessProgressToGoalVm(input: {
  activity: WeeklyFitnessActivityMetrics;
  strength: WeeklyFitnessStrengthMetrics;
  cardio: WeeklyFitnessCardioMetrics;
}): WeeklyFitnessProgressToGoalVm {
  const strength = buildWeeklyFitnessStrengthMetricVm(input.strength);
  const activity = buildWeeklyFitnessActivityMetricVm(input.activity);
  const cardio = buildWeeklyFitnessCardioMetricVm(input.cardio);

  const accessibilityLabel = [
    "Progress to goal",
    strength.primary,
    strength.support,
    activity.primary,
    activity.support,
    cardio.primary,
    cardio.support,
  ]
    .filter((s) => s.length > 0)
    .join(". ");

  return {
    strength,
    activity,
    cardio,
    accessibilityLabel,
  };
}
