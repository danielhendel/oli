/**
 * Pure helpers for week / rollup day partitioning — split out so tests avoid Firebase/auth imports.
 */

/**
 * Split week strip days: future (local calendar) → no fetch; today and past → query daily-facts per day.
 */
export function partitionActivityWeekStepsDayKeys(
  dayKeys: readonly string[],
  todayDayKey: string,
): { skipFutureDays: Record<string, boolean>; daysToFetch: string[] } {
  const skipFutureDays: Record<string, boolean> = {};
  const daysToFetch: string[] = [];
  for (const day of dayKeys) {
    if (day > todayDayKey) {
      skipFutureDays[day] = true;
    } else {
      daysToFetch.push(day);
    }
  }
  return { skipFutureDays, daysToFetch };
}

export function mergeActivityWeekStepsMaps(
  skipFutureDays: Record<string, boolean>,
  fetched: readonly (readonly [string, boolean])[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const day of Object.keys(skipFutureDays)) {
    out[day] = false;
  }
  for (const [day, has] of fetched) {
    out[day] = has;
  }
  return out;
}
