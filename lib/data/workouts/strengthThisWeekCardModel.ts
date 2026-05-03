import {
  computeStrengthThisWeekWindowMetrics,
  hasStrengthWorkoutLoggedToday,
} from "@/lib/data/workouts/strengthOverviewCardModel";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { StrengthWeeklyFrequencyCardDisplayModel } from "@/lib/ui/workouts/strengthWeeklyFrequencyCardTypes";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyDisplayScaleFill01,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
  type StrengthWeeklyFrequencyTierBand,
} from "@/lib/utils/strengthWeeklyFrequencyRating";

export type StrengthThisWeekCardModel = StrengthWeeklyFrequencyCardDisplayModel & {
  /** Strength-tab session count in the current local week window (same as Overview “This Week” total). */
  totalWorkoutsThisWeek: number;
  /** Sum of `session.durationMinutes` for those sessions; null when none had duration (display falls back to sessions-only copy). */
  totalStrengthMinutesThisWeek: number | null;
  ratingTierBand: StrengthWeeklyFrequencyTierBand;
  footerSupportCaption: string;
};

/** Support line under the bar — only states grounded in hydrated calendar truth. */
export const STRENGTH_THIS_WEEK_FOOTER_WITH_TODAY = "Includes today's workout";
export const STRENGTH_THIS_WEEK_FOOTER_NO_TODAY = "No workout logged today";

/**
 * Display-only line for the This Week card header (actual count, not average/week).
 */
export function formatStrengthThisWeekWorkoutCountLine(totalWorkouts: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(totalWorkouts) ? totalWorkouts : 0));
  if (n === 1) return "1 workout";
  return `${n} workouts`;
}

/** Muted subtitle for This Week embedded header (`N sessions this week`). Display-only; uses the same session count basis as {@link formatStrengthThisWeekWorkoutCountLine}. */
export function formatStrengthThisWeekSessionsMicroCaption(totalWorkouts: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(totalWorkouts) ? totalWorkouts : 0));
  if (n === 1) return "1 session this week";
  return `${n} sessions this week`;
}

/**
 * Primary This Week summary line: sessions plus total strength minutes when any session duration exists
 * ({@link StrengthThisWeekCardModel.totalStrengthMinutesThisWeek}).
 */
export function formatStrengthThisWeekSessionsSummaryLine(
  totalWorkouts: number,
  totalStrengthMinutesThisWeek: number | null,
): string {
  const n = Math.max(0, Math.round(Number.isFinite(totalWorkouts) ? totalWorkouts : 0));
  const sessionsPart = n === 1 ? "1 session" : `${n} sessions`;
  if (totalStrengthMinutesThisWeek != null && totalStrengthMinutesThisWeek > 0) {
    const m = Math.round(totalStrengthMinutesThisWeek);
    const minPart = m === 1 ? "1 minute" : `${m} minutes`;
    return `${sessionsPart} and ${minPart} completed this week`;
  }
  if (n === 1) return "1 session completed this week";
  return `${n} sessions completed this week`;
}

/** Muted subtitle for Last Week embedded header (`N sessions last week`). Same session-count basis as {@link formatStrengthThisWeekSessionsMicroCaption}. */
export function formatStrengthLastWeekSessionsMicroCaption(totalWorkouts: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(totalWorkouts) ? totalWorkouts : 0));
  if (n === 1) return "1 session last week";
  return `${n} sessions last week`;
}

/**
 * Last Week card: previous **completed** local calendar week (`lastWeekStartDay`…`lastWeekEndDay`), same strength-tab rules as {@link computeStrengthThisWeekWindowMetrics}.
 * Uses the same rating ladder as This Week / Baseline ({@link strengthWeeklyFrequencyTierBandFromAvg}).
 */
export function buildStrengthLastWeekCardModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  lastWeekStartDay: DayKey;
  lastWeekEndDay: DayKey;
}): StrengthThisWeekCardModel {
  const week = computeStrengthThisWeekWindowMetrics({
    strengthCalendarDays: input.strengthCalendarDays,
    todayDayKey: input.todayDayKey,
    weekStartDay: input.lastWeekStartDay,
    weekEndDay: input.lastWeekEndDay,
  });
  const totalWorkoutsLastWeek = Math.max(0, week.totalWorkouts);
  const compactValuePrimary = formatStrengthThisWeekWorkoutCountLine(totalWorkoutsLastWeek);
  const ratingTierBand = strengthWeeklyFrequencyTierBandFromAvg(totalWorkoutsLastWeek);

  return {
    totalWorkoutsThisWeek: totalWorkoutsLastWeek,
    totalStrengthMinutesThisWeek: week.totalStrengthMinutesAggregated,
    compactValuePrimary,
    ratingTierBand,
    ratingLabel: strengthWeeklyFrequencyRatingLabelFromTierBand(ratingTierBand),
    activityTierIndexForBar: strengthWeeklyFrequencyActivityTierIndexForTierBand(ratingTierBand),
    fillWidth01Override: strengthWeeklyFrequencyDisplayScaleFill01(totalWorkoutsLastWeek),
    footerSupportCaption: "",
  };
}

/**
 * This Week card: same weekly window + strength session rules as Overview “This Week”
 * ({@link computeStrengthThisWeekWindowMetrics}). Value is **total** sessions this week; pill + 0–7 bar use
 * that count on the same frequency ladder as Strength Baseline ({@link strengthWeeklyFrequencyTierBandFromAvg}).
 */
export function buildStrengthThisWeekCardModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
}): StrengthThisWeekCardModel {
  const week = computeStrengthThisWeekWindowMetrics(input);
  const totalWorkoutsThisWeek = Math.max(0, week.totalWorkouts);
  const compactValuePrimary = formatStrengthThisWeekWorkoutCountLine(totalWorkoutsThisWeek);
  /** Same tier ladder + 0–7 fill scale as Baseline; input is weekly session count (not average). */
  const ratingTierBand = strengthWeeklyFrequencyTierBandFromAvg(totalWorkoutsThisWeek);
  const hasToday = hasStrengthWorkoutLoggedToday(input.strengthCalendarDays, input.todayDayKey);

  return {
    totalWorkoutsThisWeek,
    totalStrengthMinutesThisWeek: week.totalStrengthMinutesAggregated,
    compactValuePrimary,
    ratingTierBand,
    ratingLabel: strengthWeeklyFrequencyRatingLabelFromTierBand(ratingTierBand),
    activityTierIndexForBar: strengthWeeklyFrequencyActivityTierIndexForTierBand(ratingTierBand),
    fillWidth01Override: strengthWeeklyFrequencyDisplayScaleFill01(totalWorkoutsThisWeek),
    footerSupportCaption: hasToday ? STRENGTH_THIS_WEEK_FOOTER_WITH_TODAY : STRENGTH_THIS_WEEK_FOOTER_NO_TODAY,
  };
}
