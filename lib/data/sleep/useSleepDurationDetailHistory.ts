/**
 * Bounded SleepNight history for Sleep Duration detail (90 inclusive days).
 *
 * Thin wrapper over {@link useSleepMetricDetailHistory} so Duration shares the
 * same user/range-scoped 90-day cache as Deep / REM detail.
 */

import {
  useSleepMetricDetailHistory,
  type UseSleepMetricDetailHistoryOptions,
  type UseSleepMetricDetailHistoryResult,
} from "@/lib/data/sleep/useSleepMetricDetailHistory";

export type UseSleepDurationDetailHistoryResult = UseSleepMetricDetailHistoryResult;
export type UseSleepDurationDetailHistoryOptions = UseSleepMetricDetailHistoryOptions;

/**
 * Fetches a single bounded 90-day SleepNight range ending on `selectedDay`
 * (clamped so the end is never after device today).
 */
export function useSleepDurationDetailHistory(
  opts: UseSleepDurationDetailHistoryOptions,
): UseSleepDurationDetailHistoryResult {
  return useSleepMetricDetailHistory(opts);
}
