import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyDisplayScaleFill01,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
  type StrengthWeeklyFrequencyTierBand,
} from "@/lib/utils/strengthWeeklyFrequencyRating";
import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  formatStrengthWeeklyWorkoutsAndMinutes,
  strengthSessionDurationMinutes,
} from "@/lib/data/workouts/strengthSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type StrengthBaselineCardModel = {
  /** Average strength sessions per week over the trailing completed-day window (see builder). */
  avgWorkoutsPerWeek: number;
  /** Primary figure for the header row (display: `X.X/wk`). */
  compactValuePrimary: string;
  totalMinutes90d: number;
  avgMinutesPerWeek: number;
  ratingTierBand: StrengthWeeklyFrequencyTierBand;
  ratingLabel: string;
  /** Pass to {@link ActivityTierProgressTrack} tier coloring. */
  activityTierIndexForBar: number;
  fillWidth01Override: number;
};

/**
 * Strength Baseline: average strength-tab sessions per week over {@link ACTIVITY_BASELINE_TRAILING_DAY_COUNT}
 * completed local days ending {@link getActivityOverviewAnchorEndDay}`(todayDayKey)` (local yesterday).
 * Matches Activity Baseline completed-day semantics; today is excluded by construction.
 *
 * Uses the same strength-session rules as {@link buildStrengthOverviewCardModel} / Overview “3 Month”.
 */
export function buildStrengthBaselineCardModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
}): StrengthBaselineCardModel {
  const { strengthCalendarDays, todayDayKey } = input;
  const anchorEnd = getActivityOverviewAnchorEndDay(todayDayKey);
  const windowKeys = activityTrailingNDaysInclusive(anchorEnd, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
  const windowStart = windowKeys[0]!;
  const elapsedDays = enumerateDaysInclusive(windowStart, anchorEnd).length;
  const sortedDays = [...strengthCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const slice = filterWorkoutCalendarDaysInclusive(sortedDays, windowStart, anchorEnd);
  const sessions = collectStrengthOverviewTabSessions(slice);
  const total = sessions.length;
  const totalMinutes90d = sessions.reduce((sum, session) => {
    const minutes = strengthSessionDurationMinutes(session);
    return sum + (minutes ?? 0);
  }, 0);
  const avgWorkoutsPerWeek = elapsedDays > 0 ? (total * 7) / elapsedDays : 0;
  const avgMinutesPerWeek = elapsedDays > 0 ? (totalMinutes90d * 7) / elapsedDays : 0;
  const compactValuePrimary = formatStrengthWeeklyWorkoutsAndMinutes({
    averageWorkoutsPerWeek: avgWorkoutsPerWeek,
    averageMinutesPerWeek: avgMinutesPerWeek,
  });
  const ratingTierBand = strengthWeeklyFrequencyTierBandFromAvg(avgWorkoutsPerWeek);
  return {
    avgWorkoutsPerWeek,
    compactValuePrimary,
    totalMinutes90d,
    avgMinutesPerWeek,
    ratingTierBand,
    ratingLabel: strengthWeeklyFrequencyRatingLabelFromTierBand(ratingTierBand),
    activityTierIndexForBar: strengthWeeklyFrequencyActivityTierIndexForTierBand(ratingTierBand),
    fillWidth01Override: strengthWeeklyFrequencyDisplayScaleFill01(avgWorkoutsPerWeek),
  };
}
