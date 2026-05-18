import {
  aggregateDisplayableCardioForCalendarDays,
  type CardioRangeTotals,
} from "@/lib/data/workouts/cardioRangeMetrics";
import { computeStrengthThisWeekWindowMetrics } from "@/lib/data/workouts/strengthOverviewCardModel";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  averageMinutesFromCompletedSleepNights,
  collectCompletedSleepNightsForWeek,
  logWeeklyFitnessSleepAverageDev,
  weeklyFitnessWeekWakeWindow,
  type WeeklyFitnessSleepNightCell,
} from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { formatSleepDurationCompact } from "@/lib/dashboard/todayHealthHero";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Visual cap for the Dash bar fill. Values exceeding the goal still display as full. */
const BAR_PROGRESS_MAX = 1;
const BAR_PROGRESS_MIN = 0;

/**
 * Single goal-completion fill color shared by all Weekly Fitness rows. Per Dash card spec,
 * Activity / Strength / Cardio rows all use the same green so the visual cue maps to "goal
 * progress" rather than to the domain.
 */
export const WEEKLY_FITNESS_BAR_FILL_COLOR = "#5EE89A";

/** Clamp 0..1 (UI bar geometry). */
export function clampGoalProgress01(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return BAR_PROGRESS_MIN;
  if (progress >= BAR_PROGRESS_MAX) return BAR_PROGRESS_MAX;
  return progress;
}

export type WeeklyFitnessActivityMetrics = {
  /** Average daily steps across elapsed days in the Sun–Sat window with **numeric** rollup data. */
  avgStepsPerDay: number;
  /** Goal value used to compute progress (rounded). */
  goalStepsPerDay: number;
  /** Number of elapsed days that contributed to the average. 0 when none. */
  elapsedDaysWithData: number;
  /**
   * Calendar days in the current week from **week start through today** (inclusive).
   * Used with {@link numericWeekStepsSum} for “steps needed today” pace vs the daily step goal.
   */
  elapsedCalendarDaysThroughToday: number;
  /** Sum of step counts on elapsed days that have **numeric** rollup entries (subset of the week when data is partial). */
  numericWeekStepsSum: number;
  /**
   * True when every calendar-elapsed day through today has a **numeric** rollup (including today).
   * When false, progress-to-goal copy falls back to labeled average-gap wording.
   */
  hasNumericStepsAllElapsedCalendarDays: boolean;
  /** Visual progress 0–1 = avgStepsPerDay / goal (clamped). 0 when goal is 0 (no goal set). */
  goalProgress01: number;
  /** Visible row value: "9,992 avg steps" (or "No goal set" when goal is 0). */
  valueLabel: string;
  /** Accessibility phrase: "9,992 average steps, goal 10,000 steps per day". */
  accessibilityValueLabel: string;
};

/**
 * Activity row metrics for the current local week (`weekDayKeys`, Sun→Sat).
 * Average steps/day uses **numeric** rollup entries from {@link ActivityStepsRollupMap} for
 * elapsed days only (skips future days); empty when no elapsed day has data.
 */
export function computeWeeklyFitnessActivityMetrics(input: {
  weekDayKeys: readonly DayKey[];
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  goalStepsPerDay: number;
}): WeeklyFitnessActivityMetrics {
  let numericSum = 0;
  let numericDayCount = 0;
  let calendarElapsedThroughToday = 0;
  let allElapsedHaveNumeric = true;

  for (const day of input.weekDayKeys) {
    if (day > input.todayDayKey) continue;
    calendarElapsedThroughToday += 1;
    const entry = input.rollupByDay[day];
    if (entry?.kind === "numeric") {
      numericSum += entry.steps;
      numericDayCount += 1;
    } else {
      allElapsedHaveNumeric = false;
    }
  }

  const avg = numericDayCount > 0 ? Math.round(numericSum / numericDayCount) : 0;
  const goal = Math.max(0, Math.round(input.goalStepsPerDay));
  const hasGoal = goal > 0;
  const goalProgress01 = hasGoal ? clampGoalProgress01(avg / goal) : 0;
  const hasNumericStepsAllElapsedCalendarDays =
    calendarElapsedThroughToday > 0 && allElapsedHaveNumeric;
  // Visible label: actual-only, no "avg" word per Dash card spec.
  const valueLabel = hasGoal ? `${avg.toLocaleString()} steps` : "No goal set";
  // Accessibility keeps the semantic "average steps" phrasing (the value is a weekly daily-avg).
  const accessibilityValueLabel = hasGoal
    ? `${avg.toLocaleString()} average steps, goal ${goal.toLocaleString()} steps per day`
    : `${avg.toLocaleString()} average steps, no goal set`;
  return {
    avgStepsPerDay: avg,
    goalStepsPerDay: goal,
    elapsedDaysWithData: numericDayCount,
    elapsedCalendarDaysThroughToday: calendarElapsedThroughToday,
    numericWeekStepsSum: numericSum,
    hasNumericStepsAllElapsedCalendarDays,
    goalProgress01,
    valueLabel,
    accessibilityValueLabel,
  };
}

export type WeeklyFitnessStrengthMetrics = {
  workoutsThisWeek: number;
  goalWorkoutsPerWeek: number;
  /** 0 when goal is 0 (no goal set). */
  goalProgress01: number;
  /** Visible row value: "3 workouts" (or "No goal set"). */
  valueLabel: string;
  /** Accessibility phrase: "3 workouts, goal 5 workouts". */
  accessibilityValueLabel: string;
};

/**
 * Strength row metrics: total strength sessions this Sun–Sat, same definition as
 * {@link computeStrengthThisWeekWindowMetrics} (Strength Overview "This Week" — single source of truth).
 */
export function computeWeeklyFitnessStrengthMetrics(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  goalWorkoutsPerWeek: number;
}): WeeklyFitnessStrengthMetrics {
  const week = computeStrengthThisWeekWindowMetrics({
    strengthCalendarDays: input.strengthCalendarDays,
    todayDayKey: input.todayDayKey,
    weekStartDay: input.weekStartDay,
    weekEndDay: input.weekEndDay,
  });
  const total = Math.max(0, Math.round(week.totalWorkouts));
  const goal = Math.max(0, Math.round(input.goalWorkoutsPerWeek));
  const hasGoal = goal > 0;
  const goalProgress01 = hasGoal ? clampGoalProgress01(total / goal) : 0;
  const totalNoun = total === 1 ? "workout" : "workouts";
  const goalNoun = goal === 1 ? "workout" : "workouts";
  const valueLabel = hasGoal ? `${total} ${totalNoun}` : "No goal set";
  const accessibilityValueLabel = hasGoal
    ? `${total} ${totalNoun}, goal ${goal} ${goalNoun}`
    : `${total} ${totalNoun}, no goal set`;
  return {
    workoutsThisWeek: total,
    goalWorkoutsPerWeek: goal,
    goalProgress01,
    valueLabel,
    accessibilityValueLabel,
  };
}

function formatSleepHoursForAccessibility(hours: number): string {
  const h = Math.max(0, hours);
  const whole = Math.floor(h);
  const frac = Math.round((h - whole) * 60);
  if (frac === 0) return whole === 1 ? "1 hour" : `${whole} hours`;
  if (whole === 0) return frac === 1 ? "1 minute" : `${frac} minutes`;
  return `${whole} ${whole === 1 ? "hour" : "hours"} ${frac} ${frac === 1 ? "minute" : "minutes"}`;
}

export type WeeklyFitnessSleepMetrics = {
  /** Average minutes per completed attributed sleep night in the week. */
  avgSleepMinutesPerNight: number;
  goalHoursPerNight: number;
  /** Minutes equivalent of {@link goalHoursPerNight} for progress math. */
  goalSleepMinutesPerNight: number;
  /** Count of unique completed sleep nights (denominator for average). */
  completedNightsWithData: number;
  /** 0 when goal is 0 (no goal set). */
  goalProgress01: number;
  /** Visible row value: "8h 12m avg" (or "No goal set"). */
  valueLabel: string;
  accessibilityValueLabel: string;
};

/**
 * Sleep row metrics for the current local week: average over **completed attributed** sleep nights
 * (GET /users/me/sleep-night + Dash Daily Sleep guards). Future days are not requested; missing nights
 * are excluded from the average (never counted as zero).
 */
export function computeWeeklyFitnessSleepMetrics(input: {
  weekDayKeys: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  goalHoursPerNight: number;
}): WeeklyFitnessSleepMetrics {
  const wakeWindow = weeklyFitnessWeekWakeWindow(input.weekDayKeys, input.todayDayKey);
  const { completedNights, skipped } = collectCompletedSleepNightsForWeek({
    weekDayKeys: input.weekDayKeys,
    todayDayKey: input.todayDayKey,
    sleepNightByDay: input.sleepNightByDay,
  });
  const avgMinutes = averageMinutesFromCompletedSleepNights(completedNights);
  logWeeklyFitnessSleepAverageDev({
    todayDayKey: input.todayDayKey,
    weekStartDay: wakeWindow.weekStartDay,
    weekEndDay: wakeWindow.weekEndDay,
    lastCountableWakeDay: wakeWindow.lastCountableWakeDay,
    completedNights,
    skipped,
    averageMinutes: avgMinutes,
  });
  const goalHours = Math.max(0, input.goalHoursPerNight);
  const goalMinutes = Math.round(goalHours * 60);
  const hasGoal = goalHours > 0;
  const goalProgress01 = hasGoal && goalMinutes > 0 ? clampGoalProgress01(avgMinutes / goalMinutes) : 0;
  const avgCompact = formatSleepDurationCompact(avgMinutes);
  const valueLabel = hasGoal ? `${avgCompact} avg` : "No goal set";
  const accessibilityValueLabel = hasGoal
    ? `${formatSleepHoursForAccessibility(avgMinutes / 60)} average, goal ${formatSleepHoursForAccessibility(goalHours)} per night`
    : `${formatSleepHoursForAccessibility(avgMinutes / 60)} average, no goal set`;
  return {
    avgSleepMinutesPerNight: avgMinutes,
    goalHoursPerNight: goalHours,
    goalSleepMinutesPerNight: goalMinutes,
    completedNightsWithData: completedNights.length,
    goalProgress01,
    valueLabel,
    accessibilityValueLabel,
  };
}

export type WeeklyFitnessCardioMetrics = {
  totalMilesThisWeek: number;
  goalMilesPerWeek: number;
  /** 0 when goal is 0 (no goal set). */
  goalProgress01: number;
  /** Visible row value: "2.6 miles" (or "No goal set"). */
  valueLabel: string;
  /** Accessibility phrase: "2.6 miles, goal 10 miles". */
  accessibilityValueLabel: string;
};

/**
 * Cardio row metrics: total displayable cardio miles this Sun–Sat, same modality + display rules
 * as {@link aggregateDisplayableCardioForCalendarDays} (Cardio "This Week" / History).
 */
export function computeWeeklyFitnessCardioMetrics(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  goalMilesPerWeek: number;
}): WeeklyFitnessCardioMetrics {
  const sortedDays = [...input.cardioCalendarDays].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  const slice = filterWorkoutCalendarDaysInclusive(sortedDays, input.weekStartDay, input.weekEndDay);
  const totals: CardioRangeTotals = aggregateDisplayableCardioForCalendarDays(slice);
  const totalMiles = Math.max(0, totals.totalMiles);
  const goal = Math.max(0, input.goalMilesPerWeek);
  const hasGoal = goal > 0;
  const goalProgress01 = hasGoal ? clampGoalProgress01(totalMiles / goal) : 0;
  const milesText = totalMiles.toFixed(1);
  const goalText = goal % 1 === 0 ? goal.toFixed(0) : goal.toFixed(1);
  const totalNoun = Math.abs(totalMiles - 1) < 0.05 ? "mile" : "miles";
  const goalNoun = Math.abs(goal - 1) < 0.0001 ? "mile" : "miles";
  const valueLabel = hasGoal ? `${milesText} ${totalNoun}` : "No goal set";
  const accessibilityValueLabel = hasGoal
    ? `${milesText} ${totalNoun}, goal ${goalText} ${goalNoun}`
    : `${milesText} ${totalNoun}, no goal set`;
  return {
    totalMilesThisWeek: totalMiles,
    goalMilesPerWeek: goal,
    goalProgress01,
    valueLabel,
    accessibilityValueLabel,
  };
}

/**
 * Goal completion status for accessibility / optional pill.
 * <50% → "Behind"; 50–99% → "On track"; ≥100% → "Complete".
 */
export type WeeklyFitnessGoalStatus = "behind" | "onTrack" | "complete";
export function weeklyFitnessGoalStatusForProgress(progress01: number): WeeklyFitnessGoalStatus {
  if (!Number.isFinite(progress01) || progress01 < 0.5) return "behind";
  if (progress01 < 1) return "onTrack";
  return "complete";
}

export function weeklyFitnessGoalStatusLabel(status: WeeklyFitnessGoalStatus): string {
  if (status === "complete") return "Complete";
  if (status === "onTrack") return "On track";
  return "Behind";
}

/**
 * Combined Weekly Fitness completion across enabled (goal > 0) categories.
 *
 *   activityProgress = clamp(avgSteps / stepGoal, 0, 1)
 *   strengthProgress = clamp(strengthWorkouts / strengthGoal, 0, 1)
 *   cardioProgress   = clamp(cardioMiles / cardioGoal, 0, 1)
 *
 *   combinedProgress = mean of progress values whose goal > 0
 *   combinedPercent  = round(combinedProgress * 100)
 *
 * Categories whose goal is 0 are **excluded** from the average. When no category has a
 * goal, returns `{ progress: 0, percent: 0, enabledCategoryCount: 0 }`.
 */
export type WeeklyFitnessCombinedProgress = {
  progress: number;
  percent: number;
  enabledCategoryCount: number;
};

export function computeWeeklyFitnessCombinedProgress(input: {
  activity: Pick<WeeklyFitnessActivityMetrics, "goalProgress01" | "goalStepsPerDay">;
  strength: Pick<WeeklyFitnessStrengthMetrics, "goalProgress01" | "goalWorkoutsPerWeek">;
  cardio: Pick<WeeklyFitnessCardioMetrics, "goalProgress01" | "goalMilesPerWeek">;
  sleep: Pick<WeeklyFitnessSleepMetrics, "goalProgress01" | "goalHoursPerNight">;
}): WeeklyFitnessCombinedProgress {
  const enabled: number[] = [];
  if (input.activity.goalStepsPerDay > 0) enabled.push(clampGoalProgress01(input.activity.goalProgress01));
  if (input.strength.goalWorkoutsPerWeek > 0) enabled.push(clampGoalProgress01(input.strength.goalProgress01));
  if (input.cardio.goalMilesPerWeek > 0) enabled.push(clampGoalProgress01(input.cardio.goalProgress01));
  if (input.sleep.goalHoursPerNight > 0) enabled.push(clampGoalProgress01(input.sleep.goalProgress01));
  if (enabled.length === 0) {
    return { progress: 0, percent: 0, enabledCategoryCount: 0 };
  }
  const sum = enabled.reduce((acc, p) => acc + p, 0);
  const progress = clampGoalProgress01(sum / enabled.length);
  return {
    progress,
    percent: Math.round(progress * 100),
    enabledCategoryCount: enabled.length,
  };
}
