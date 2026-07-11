import {
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
} from "@/lib/data/activity/activityOverviewRanges";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Max calendar days requested via per-day GET /users/me/sleep-night.
 *
 * Interactive Sleep surfaces (Today + week strip/nav) must not fan out one request per
 * historical day. Longer Sleep Baseline windows (30 / 90 / YTD / 12 Month) require a
 * **batched/range SleepNight read API** — none exists today (only `GET …/sleep-night?day=`).
 */
export const SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS = 14;

/**
 * Union of sleep-night keys for the Sleep overview screen: selected strip week, trailing
 * 7-day window, and today. Does **not** request 30/90/365-day history over the wire.
 */
export function computeSleepOverviewFetchDayKeys(
  stripSelectedDay: DayKey,
  todayDayKey: DayKey,
): DayKey[] {
  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const stripWeek = getWeekDaysForAnchor(stripSelectedDay);
  const set = new Set<DayKey>([...d7, todayDayKey, ...stripWeek]);
  if (stripSelectedDay > todayDayKey) {
    set.add(stripSelectedDay);
  }
  return boundSleepNightFetchDayKeys([...set], todayDayKey);
}

/**
 * Network keys for Sleep Baseline / Health Baseline sleep composition.
 *
 * Only the trailing 7-day window is fetched via per-day reads. Longer baseline rows remain
 * honest (`hasEnoughData: false`) until a range/batch Sleep endpoint exists.
 */
export function computeSleepBaselineFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  return boundSleepNightFetchDayKeys(d7, todayDayKey);
}

/**
 * Defense-in-depth: keep only the most recent {@link SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS}
 * elapsed day keys (≤ today). Future keys are preserved (not fetched by the rollup partition).
 * Never expands the set.
 */
export function boundSleepNightFetchDayKeys(
  dayKeys: readonly DayKey[],
  todayDayKey: DayKey,
  maxDays: number = SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS,
): DayKey[] {
  const future = dayKeys.filter((d) => d > todayDayKey);
  const elapsed = dayKeys.filter((d) => d <= todayDayKey).sort();
  const capped =
    elapsed.length <= maxDays ? elapsed : elapsed.slice(elapsed.length - maxDays);
  return [...capped, ...future].sort();
}
