import type { DashSleepAnchorResolution } from "@/lib/data/sleep/resolveDashSleepAnchorDay";
import type { DashSleepAnchorReason } from "@/lib/data/sleep/resolveDashSleepAnchorDay";

export type DashSleepAnchorLock = {
  calendarToday: string;
  resolution: DashSleepAnchorResolution;
};

const LOCKABLE_REASONS: ReadonlySet<DashSleepAnchorReason> = new Set([
  "overnight_probe_previous_day",
  "previous_exact_sleep",
  "calendar_exact_sleep",
]);

function isWakeDayCalendarEmpty(cal: string, r: DashSleepAnchorResolution): boolean {
  return r.selectedReason === "calendar_empty" && r.sleepAnchorDay === cal;
}

/** True when lock anchors sleep on a calendar day strictly before the Dash wake `calendarToday`. */
function lockAnchorsStrictlyBeforeWakeDay(cal: string, r: DashSleepAnchorResolution): boolean {
  return r.sleepAnchorSettled && r.sleepAnchorDay !== cal;
}

/**
 * Updates the persisted Dash sleep anchor lock from resolver output.
 * Never stores `loading`, `calendar_empty`, or other non-lockable settled rows as the persisted lock.
 */
export function reduceAnchorLock(
  prev: DashSleepAnchorLock | null,
  calendarToday: string,
  fresh: DashSleepAnchorResolution,
): DashSleepAnchorLock | null {
  if (prev != null && prev.calendarToday !== calendarToday) {
    return null;
  }

  if (!fresh.sleepAnchorSettled) {
    return prev;
  }

  if (!LOCKABLE_REASONS.has(fresh.selectedReason)) {
    return prev;
  }

  const incoming: DashSleepAnchorResolution = { ...fresh };
  if (prev == null) {
    return { calendarToday, resolution: incoming };
  }

  const p = prev.resolution;

  if (lockAnchorsStrictlyBeforeWakeDay(calendarToday, p) && isWakeDayCalendarEmpty(calendarToday, incoming)) {
    return prev;
  }

  if (p.sleepAnchorDay === calendarToday && incoming.sleepAnchorDay !== calendarToday) {
    return { calendarToday, resolution: incoming };
  }

  return { calendarToday, resolution: incoming };
}

function mergeFromLock(
  lock: DashSleepAnchorLock,
  isUsingCachedSettledAnchor: boolean,
): { merged: DashSleepAnchorResolution; isUsingCachedSettledAnchor: boolean } {
  const r = lock.resolution;
  return {
    merged: {
      ...r,
      sleepAnchorDay: r.sleepAnchorDay,
      sleepAnchorSettled: true,
      selectedReason: r.selectedReason,
      calendarDayHasSleep: r.calendarDayHasSleep,
      previousDayHasSleep: r.previousDayHasSleep,
    },
    isUsingCachedSettledAnchor,
  };
}

/**
 * Prefer a persisted settled lock over transient resolver output (`loading` or wake-day `calendar_empty`)
 * so probe / DailyFacts refetches cannot regress the Dash sleep anchor to the calendar wake day.
 */
export function mergeDashSleepAnchorWithLock(
  calendarToday: string,
  fresh: DashSleepAnchorResolution,
  lock: DashSleepAnchorLock | null,
): { merged: DashSleepAnchorResolution; isUsingCachedSettledAnchor: boolean } {
  if (lock == null || lock.calendarToday !== calendarToday) {
    return { merged: fresh, isUsingCachedSettledAnchor: false };
  }

  if (!fresh.sleepAnchorSettled && fresh.selectedReason === "loading") {
    return mergeFromLock(lock, true);
  }

  if (
    fresh.sleepAnchorSettled &&
    fresh.selectedReason === "calendar_empty" &&
    isWakeDayCalendarEmpty(calendarToday, fresh) &&
    lockAnchorsStrictlyBeforeWakeDay(calendarToday, lock.resolution)
  ) {
    return mergeFromLock(lock, true);
  }

  return { merged: fresh, isUsingCachedSettledAnchor: false };
}
