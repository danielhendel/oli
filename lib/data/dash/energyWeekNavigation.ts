import {
  addCalendarDaysToDayKey,
  getWeekDaysForAnchor,
  getWeekStartSunday,
} from "@/lib/ui/calendar/dateUtils";
import { formatWeekDayKeyRange } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Pure derivation of the week-navigation state used by the Daily Energy "This Week's Energy"
 * card. Keeping this outside the screen makes the rules unit-testable without instantiating
 * the React renderer.
 *
 * Rules:
 * - `weekStart` is the Sunday at or before `weekAnchorDay`.
 * - The current week is the one containing `todayDayKey`.
 * - The Next button is disabled (no future-week navigation) when `weekStart >= currentWeekStart`.
 * - The Previous button is always enabled — historical weeks may be empty if no data exists for
 *   them but the user is allowed to navigate back as far as they like.
 * - `previousWeekAnchor` / `nextWeekAnchor` are returned as Sunday DayKeys so the screen always
 *   stores a canonical, week-stable anchor in state.
 */
export type EnergyWeekNavigationState = {
  /** Canonical week anchor (Sunday) for the currently displayed week. */
  weekAnchorDay: DayKey;
  /** Sunday of the displayed week. */
  weekStart: DayKey;
  /** Saturday of the displayed week. */
  weekEnd: DayKey;
  /** Seven `DayKey`s Sunday–Saturday for the displayed week. */
  weekDayKeys: DayKey[];
  /** Header label like `"May 17\u201323"` or `"May 31\u2013Jun 6"`. */
  weekRangeLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** Sunday `DayKey` for the previous week. */
  previousWeekAnchor: DayKey;
  /** Sunday `DayKey` for the next week, or `null` when on the current week. */
  nextWeekAnchor: DayKey | null;
  /** `true` iff the displayed week contains `todayDayKey`. */
  isCurrentWeek: boolean;
};

export function computeEnergyWeekNavigationState(input: {
  todayDayKey: DayKey;
  weekAnchorDay: DayKey;
}): EnergyWeekNavigationState {
  const { todayDayKey, weekAnchorDay } = input;
  const weekStart = getWeekStartSunday(weekAnchorDay);
  const weekEnd = addCalendarDaysToDayKey(weekStart, 6);
  const weekDayKeys = getWeekDaysForAnchor(weekStart);
  const weekRangeLabel = formatWeekDayKeyRange(weekStart, weekEnd);
  const currentWeekStart = getWeekStartSunday(todayDayKey);
  const isCurrentWeek = weekStart === currentWeekStart;
  const canGoNext = weekStart < currentWeekStart;
  const previousWeekAnchor = addCalendarDaysToDayKey(weekStart, -7);
  const nextWeekAnchor = canGoNext ? addCalendarDaysToDayKey(weekStart, 7) : null;
  return {
    weekAnchorDay: weekStart,
    weekStart,
    weekEnd,
    weekDayKeys,
    weekRangeLabel,
    canGoPrevious: true,
    canGoNext,
    previousWeekAnchor,
    nextWeekAnchor,
    isCurrentWeek,
  };
}
