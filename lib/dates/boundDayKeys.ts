import type { DayKey } from "@/lib/ui/calendar/types";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type BoundDayKeysOptions = {
  todayKey: DayKey;
  /** When set, keep at most this many keys (most recent trailing window). */
  maxDays?: number;
  /** When false (default), drop keys after `todayKey`. */
  allowFuture?: boolean;
};

/**
 * Normalize a day-key list for network reads: dedupe, sort, drop invalid/future keys,
 * optionally cap length (trailing window ending at the latest allowed key).
 */
export function boundDayKeys(dayKeys: readonly DayKey[], options: BoundDayKeysOptions): DayKey[] {
  const { todayKey, maxDays, allowFuture = false } = options;
  const unique = new Set<DayKey>();

  for (const key of dayKeys) {
    if (!DAY_KEY_RE.test(key)) continue;
    if (!allowFuture && key > todayKey) continue;
    unique.add(key);
  }

  let sorted = [...unique].sort();
  if (maxDays != null && maxDays > 0 && sorted.length > maxDays) {
    sorted = sorted.slice(-maxDays);
  }
  return sorted;
}

/** Network-safe subset: only keys on or before `todayKey`. */
export function networkDayKeysThroughToday(dayKeys: readonly DayKey[], todayKey: DayKey): DayKey[] {
  return boundDayKeys(dayKeys, { todayKey, allowFuture: false });
}

const dashDataBudgetWarnings = new Set<string>();

/** Dev-only: warn once when a Dash shell caller requests an oversized day-key batch. */
export function warnDashDataBudgetOnce(caller: string, dayKeyCount: number, threshold = 31): void {
  if (!__DEV__ || dayKeyCount <= threshold) return;
  const sig = `${caller}:${dayKeyCount}`;
  if (dashDataBudgetWarnings.has(sig)) return;
  dashDataBudgetWarnings.add(sig);
  // eslint-disable-next-line no-console -- intentional dev guard
  console.warn(`[DashDataBudget] ${caller} requested ${dayKeyCount} dayKeys on Dash mount`);
}

/** Test-only reset for warn-once ledger. */
export function __resetDashDataBudgetWarningsForTests(): void {
  dashDataBudgetWarnings.clear();
}
