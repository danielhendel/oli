import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Exact product copy when a timeframe lacks full per-day numeric coverage. */
export const ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA = "Not enough data";

/**
 * True when every day in `days` has `kind: "numeric"` in `rollup` (explicit 0 steps counts).
 * Missing keys, absent, and error do not satisfy.
 */
export function stepsWindowHasFullNumericCoverage(
  days: readonly DayKey[],
  rollup: Readonly<ActivityStepsRollupMap>,
): boolean {
  if (days.length === 0) return false;
  for (const d of days) {
    if (rollup[d]?.kind !== "numeric") return false;
  }
  return true;
}

/** True if any day in the window has a failed daily-facts request (e.g. HTTP 503 → `kind: "error"`). */
export function stepsWindowHasAnyErrorDay(
  days: readonly DayKey[],
  rollup: Readonly<ActivityStepsRollupMap>,
): boolean {
  for (const d of days) {
    if (rollup[d]?.kind === "error") return true;
  }
  return false;
}

/** Mean steps per day; caller must ensure {@link stepsWindowHasFullNumericCoverage} first. */
export function meanNumericStepsForWindow(
  days: readonly DayKey[],
  rollup: Readonly<ActivityStepsRollupMap>,
): number {
  let sum = 0;
  for (const d of days) {
    const e = rollup[d]!;
    if (e.kind !== "numeric") {
      throw new Error(`meanNumericStepsForWindow: non-numeric day ${d}`);
    }
    sum += e.steps;
  }
  return sum / days.length;
}

/** Steps for one day: numeric value, else 0 (missing, absent, error). */
export function stepsForDayOrZero(
  day: DayKey,
  rollup: Readonly<ActivityStepsRollupMap>,
): number {
  const e = rollup[day];
  return e?.kind === "numeric" ? e.steps : 0;
}

export function sumStepsZeroFilledInWindow(
  days: readonly DayKey[],
  rollup: Readonly<ActivityStepsRollupMap>,
): number {
  let sum = 0;
  for (const d of days) {
    sum += stepsForDayOrZero(d, rollup);
  }
  return sum;
}

/**
 * True rolling average over the full calendar window: sum(steps or 0) / days.length.
 * Denominator is always `days.length` (e.g. 365 for 12 Month, YTD day count for YTD).
 */
export function meanStepsPerDayZeroFilled(
  days: readonly DayKey[],
  rollup: Readonly<ActivityStepsRollupMap>,
): number {
  if (days.length === 0) return 0;
  return sumStepsZeroFilledInWindow(days, rollup) / days.length;
}
