import type {
  WeeklyFitnessActivityMetrics,
  WeeklyFitnessCardioMetrics,
  WeeklyFitnessSleepMetrics,
  WeeklyFitnessStrengthMetrics,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { ManageHubIconId } from "@/lib/ui/navigation/manageHubIcons";

/** One domain in the Weekly Fitness “Progress to goal” column: primary headline + optional goal context. */
export type WeeklyFitnessProgressMetricVm = {
  primary: string;
  /** Goal context line; empty → UI omits the supporting row (e.g. no goal set). */
  support: string;
};

export type WeeklyFitnessProgressMetricKey = "activity" | "strength" | "cardio" | "sleep";

export type WeeklyFitnessProgressToGoalItemVm = WeeklyFitnessProgressMetricVm & {
  key: WeeklyFitnessProgressMetricKey;
  /** Maps to {@link MANAGE_HUB_ICON_BY_ID} in UI (same ids as Manage menu). */
  iconKey: ManageHubIconId;
};

export type WeeklyFitnessProgressToGoalVm = {
  /** Activity → Strength → Cardio → Sleep (render order beside the ring). */
  items: readonly WeeklyFitnessProgressToGoalItemVm[];
  accessibilityLabel: string;
};

const GOAL_NOT_SET = "Goal not set";
const CARDIO_HIT_EPS = 0.05;

/** Compact gap for progress-to-goal copy: `45m`, `1h 15m`, or `0m`. */
export function formatSleepGapCompact(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m === 0) return "0m";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

/** Goal line for sleep progress-to-goal, e.g. `Goal: 8h/night` or `Goal: 7h 30m/night`. */
export function formatSleepGoalPerNightLabel(goalHours: number): string {
  const g = Math.max(0, goalHours);
  if (g <= 0) return "";
  const goalMin = Math.round(g * 60);
  const h = Math.floor(goalMin / 60);
  const min = goalMin % 60;
  const duration = min === 0 ? `${h}h` : `${h}h ${min}m`;
  return `Goal: ${duration}/night`;
}

function formatActivityGoalSupportLine(goalStepsPerDay: number): string {
  const g = Math.max(0, Math.round(goalStepsPerDay));
  if (g <= 0) return "";
  return `Goal: ${g.toLocaleString()} avg/day`;
}

function formatCardioMilesForCopy(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return "0";
  const rounded = Math.round(miles * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < CARDIO_HIT_EPS) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1).replace(/\.0$/, "");
}

function formatCardioGoalSupportLine(goalMilesPerWeek: number): string {
  const g = Math.max(0, goalMilesPerWeek);
  if (g <= 0) return "";
  return `Goal: ${formatCardioMilesForCopy(g)} miles`;
}

function formatStrengthGoalSupportLine(goalWorkoutsPerWeek: number): string {
  const g = Math.max(0, Math.round(goalWorkoutsPerWeek));
  if (g <= 0) return "";
  return g === 1 ? "Goal: 1 workout" : `Goal: ${g} workouts`;
}

function formatStepsRemainingLine(steps: number): string {
  const n = Math.max(0, Math.round(steps));
  if (n === 0) return "Activity goal reached";
  return n === 1 ? "1 step remaining" : `${n.toLocaleString()} steps remaining`;
}

export function formatWeeklyFitnessStrengthProgressLine(
  metrics: Pick<WeeklyFitnessStrengthMetrics, "workoutsThisWeek" | "goalWorkoutsPerWeek">,
): string {
  const goal = Math.max(0, Math.round(metrics.goalWorkoutsPerWeek));
  if (goal <= 0) return GOAL_NOT_SET;
  const total = Math.max(0, Math.round(metrics.workoutsThisWeek));
  if (total >= goal) return "Strength goal reached";
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
 * otherwise labeled average-gap primaries. Support line states the step goal in avg/day terms.
 */
export function buildWeeklyFitnessActivityMetricVm(
  metrics: WeeklyFitnessActivityMetrics,
): WeeklyFitnessProgressMetricVm {
  const goal = Math.max(0, Math.round(metrics.goalStepsPerDay));
  if (goal <= 0) {
    return { primary: GOAL_NOT_SET, support: "" };
  }

  const support = formatActivityGoalSupportLine(goal);

  if (
    metrics.hasNumericStepsAllElapsedCalendarDays &&
    metrics.elapsedCalendarDaysThroughToday > 0
  ) {
    const requiredTotalThroughToday = goal * metrics.elapsedCalendarDaysThroughToday;
    const stepsRemaining = Math.max(0, requiredTotalThroughToday - metrics.numericWeekStepsSum);
    return {
      primary: formatStepsRemainingLine(stepsRemaining),
      support,
    };
  }

  if (metrics.elapsedDaysWithData <= 0) {
    return {
      primary: "No daily average yet",
      support,
    };
  }

  const avg = Math.max(0, Math.round(metrics.avgStepsPerDay));
  if (avg >= goal) {
    return {
      primary: "Activity goal reached",
      support,
    };
  }
  const short = goal - avg;
  return {
    primary: short === 1 ? "1 step remaining" : `${short.toLocaleString()} steps remaining`,
    support,
  };
}

export function formatWeeklyFitnessCardioProgressLine(
  metrics: Pick<WeeklyFitnessCardioMetrics, "totalMilesThisWeek" | "goalMilesPerWeek">,
): string {
  const goal = Math.max(0, metrics.goalMilesPerWeek);
  if (goal <= 0) return GOAL_NOT_SET;
  const total = Math.max(0, metrics.totalMilesThisWeek);
  if (total + CARDIO_HIT_EPS >= goal) return "Cardio goal reached";
  const remaining = goal - total;
  const milesText = formatCardioMilesForCopy(remaining);
  return milesText === "1" ? "1 mile remaining" : `${milesText} miles remaining`;
}

export function buildWeeklyFitnessCardioMetricVm(
  metrics: WeeklyFitnessCardioMetrics,
): WeeklyFitnessProgressMetricVm {
  const primary = formatWeeklyFitnessCardioProgressLine(metrics);
  const support = formatCardioGoalSupportLine(metrics.goalMilesPerWeek);
  return { primary, support };
}

export function formatWeeklyFitnessSleepProgressLine(
  metrics: Pick<
    WeeklyFitnessSleepMetrics,
    "avgSleepMinutesPerNight" | "goalSleepMinutesPerNight" | "goalHoursPerNight"
  >,
): string {
  const goalMinutes = Math.max(0, metrics.goalSleepMinutesPerNight);
  if (goalMinutes <= 0 || metrics.goalHoursPerNight <= 0) return GOAL_NOT_SET;
  const avg = Math.max(0, Math.round(metrics.avgSleepMinutesPerNight));
  if (avg >= goalMinutes) return "Sleep goal reached";
  const gap = goalMinutes - avg;
  return `${formatSleepGapCompact(gap)} sleep remaining`;
}

export function buildWeeklyFitnessSleepMetricVm(
  metrics: WeeklyFitnessSleepMetrics,
): WeeklyFitnessProgressMetricVm {
  const primary = formatWeeklyFitnessSleepProgressLine(metrics);
  const support = formatSleepGoalPerNightLabel(metrics.goalHoursPerNight);
  return { primary, support };
}

export function buildWeeklyFitnessProgressToGoalVm(input: {
  activity: WeeklyFitnessActivityMetrics;
  strength: WeeklyFitnessStrengthMetrics;
  cardio: WeeklyFitnessCardioMetrics;
  sleep: WeeklyFitnessSleepMetrics;
}): WeeklyFitnessProgressToGoalVm {
  const activity = buildWeeklyFitnessActivityMetricVm(input.activity);
  const strength = buildWeeklyFitnessStrengthMetricVm(input.strength);
  const cardio = buildWeeklyFitnessCardioMetricVm(input.cardio);
  const sleep = buildWeeklyFitnessSleepMetricVm(input.sleep);

  const items: WeeklyFitnessProgressToGoalItemVm[] = [
    { key: "activity", iconKey: "activity", ...activity },
    { key: "strength", iconKey: "strength", ...strength },
    { key: "cardio", iconKey: "cardio", ...cardio },
    { key: "sleep", iconKey: "sleep", ...sleep },
  ];

  const accessibilityLabel = [
    "Progress to goal",
    ...items.flatMap((item) => [item.primary, item.support]),
  ]
    .filter((s) => s.length > 0)
    .join(". ");

  return {
    items,
    accessibilityLabel,
  };
}

/** Test/helper: locate one metric item by key. */
export function weeklyFitnessProgressToGoalItem(
  vm: WeeklyFitnessProgressToGoalVm,
  key: WeeklyFitnessProgressMetricKey,
): WeeklyFitnessProgressToGoalItemVm {
  const item = vm.items.find((i) => i.key === key);
  if (!item) throw new Error(`Missing progress-to-goal item: ${key}`);
  return item;
}
