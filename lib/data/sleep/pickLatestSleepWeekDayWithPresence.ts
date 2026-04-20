/**
 * Pick the chronologically latest day in the strip week that has sleep presence.
 * Week keys are ISO day strings (lexicographic order matches calendar order).
 */
export function pickLatestSleepWeekDayWithPresence(
  weekDayKeys: readonly string[],
  hasSleepDataByDay: Record<string, boolean>,
): string | null {
  let best: string | null = null;
  for (const k of weekDayKeys) {
    if (hasSleepDataByDay[k] === true && (best == null || k > best)) {
      best = k;
    }
  }
  return best;
}
