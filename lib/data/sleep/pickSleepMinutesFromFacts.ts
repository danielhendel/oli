/** DailyFacts.sleep duration fields used for rollup display. */
export type SleepMinutesPick = {
  totalMinutes?: number | undefined;
  mainSleepMinutes?: number | undefined;
};

/**
 * Prefer positive `totalMinutes`, else positive `mainSleepMinutes`.
 * Matches Dash hero / recap (does not treat `totalMinutes: 0` as absent when main is positive).
 */
export function pickSleepMinutesFromFacts(sleep: SleepMinutesPick | undefined): number | undefined {
  if (!sleep) return undefined;
  const t = sleep.totalMinutes;
  if (typeof t === "number" && Number.isFinite(t) && t > 0) return t;
  const m = sleep.mainSleepMinutes;
  if (typeof m === "number" && Number.isFinite(m) && m > 0) return m;
  return undefined;
}
