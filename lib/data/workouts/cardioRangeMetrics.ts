import {
  cardioSessionDistanceMiles,
  isDisplayableCardioHistorySession,
  isSupportedCardioSessionModality,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type CardioRangeTotals = {
  totalMiles: number;
  totalMinutes: number;
  sessionCount: number;
};

/**
 * Sums distance and duration for **displayable + modality-supported** cardio sessions on the given calendar days
 * (same rules as Cardio Full History / This Week).
 */
export function aggregateDisplayableCardioForCalendarDays(
  days: readonly WorkoutCalendarDayLike[],
): CardioRangeTotals {
  let totalMiles = 0;
  let totalMinutes = 0;
  let sessionCount = 0;
  for (const day of days) {
    const sessions = reconcileWorkoutSessionsForDay(day.day, day.workouts);
    for (const session of sessions) {
      if (session.sessionType !== "cardio") continue;
      if (!isDisplayableCardioHistorySession(session)) continue;
      if (!isSupportedCardioSessionModality(session)) continue;
      sessionCount += 1;
      totalMiles += cardioSessionDistanceMiles(session) ?? 0;
      if (
        typeof session.durationMinutes === "number" &&
        Number.isFinite(session.durationMinutes) &&
        session.durationMinutes > 0
      ) {
        totalMinutes += session.durationMinutes;
      }
    }
  }
  return { totalMiles, totalMinutes, sessionCount };
}

/**
 * Totals for every calendar day in `[rangeStart, rangeEnd]` that appear in `cardioCalendarDays`.
 */
export function aggregateDisplayableCardioForInclusiveDayRange(
  cardioCalendarDays: readonly WorkoutCalendarDayLike[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): CardioRangeTotals {
  const daySet = new Set(enumerateDaysInclusive(rangeStart, rangeEnd));
  const slice = cardioCalendarDays.filter((d) => daySet.has(d.day));
  return aggregateDisplayableCardioForCalendarDays(slice);
}

/**
 * Canonical “per week” rate over a calendar span: `total × 7 / calendarDaysInRange`
 * (same for miles and minutes). Used for 7 Day, 30 Day, YTD, 12 Month, and 90 Day baseline.
 */
export function averagePerWeekFromTotals(total: number, calendarDaysInRange: number): number {
  if (calendarDaysInRange <= 0 || !Number.isFinite(total)) return 0;
  return (total * 7) / calendarDaysInRange;
}
