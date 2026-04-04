import type { DayKey } from "@/lib/ui/calendar/types";

/** Pad observedAt query window so TZ-derived calendar days still match the UI range. */
const OBSERVED_AT_PAD_DAYS = 21;

/**
 * Single-day detail uses GET /raw-events with `observedAt` bounds only. Workouts are bucketed by
 * `deriveWorkoutDayKey` from `startedAt` + timezone. If `observedAt` is ingestion/sync time while
 * the workout was weeks earlier, a tight pad around the logical day misses those docs.
 * Keep ≥ longest recent-history hydrate window (e.g. 120d) plus slack.
 */
const SINGLE_DAY_OBSERVED_AT_PAD_DAYS = 150;

export function observedAtPadDaysForWorkoutCalendarRange(start: DayKey, end: DayKey): number {
  return start === end ? SINGLE_DAY_OBSERVED_AT_PAD_DAYS : OBSERVED_AT_PAD_DAYS;
}
