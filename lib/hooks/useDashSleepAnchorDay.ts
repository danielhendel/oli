import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDashOuraCalendarSleepProbe } from "@/lib/data/dash/useDashOuraCalendarSleepProbe";
import {
  mergeDashSleepAnchorWithLock,
  reduceAnchorLock,
  type DashSleepAnchorLock,
} from "@/lib/data/sleep/dashSleepAnchorLock";
import { resolveDashSleepAnchorDay, type DashSleepAnchorResolution } from "@/lib/data/sleep/resolveDashSleepAnchorDay";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDashSleepAnchorResult = DashSleepAnchorResolution & {
  calendarToday: string;
  previousDay: string;
  refetchProbe: ReturnType<typeof useDashOuraCalendarSleepProbe>["refetch"];
  isUsingCachedSettledAnchor: boolean;
  invalidateSettledAnchor: () => void;
};

/**
 * Dash Daily Sleep anchor: resolves `sleepAnchorDay`, then **locks** a settled choice in a ref
 * so transient `loading` from probe refetch or `calendar_empty` wake-day snapshots cannot
 * flip `sleepAnchorSettled` / `sleepAnchorDay` back to the calendar day or disable downstream Oura.
 *
 * The lock is reduced **during render** (before merge) so `mergeDashSleepAnchorWithLock` always
 * reads the latest ref. Merge is **not** memoized on `fresh` identity — a stable `fresh` object
 * during repeated `loading` renders must not resurrect a stale merged snapshot from before the lock
 * existed (React `useMemo` footgun).
 */
export function useDashSleepAnchorDay(calendarToday: string): UseDashSleepAnchorResult {
  const anchorLockRef = useRef<DashSleepAnchorLock | null>(null);
  const [anchorLockEpoch, setAnchorLockEpoch] = useState(0);

  const previousDay = useMemo(
    () => addCalendarDaysToDayKey(calendarToday as DayKey, -1),
    [calendarToday],
  );

  const factsCal = useDailyFacts(calendarToday);
  const factsPrev = useDailyFacts(previousDay);
  const probe = useDashOuraCalendarSleepProbe(calendarToday);

  const fresh = useMemo(
    () =>
      resolveDashSleepAnchorDay({
        calendarToday,
        previousDay,
        calendarFactsStatus: factsCal.status,
        calendarSleep: factsCal.status === "ready" ? factsCal.data.sleep : undefined,
        previousFactsStatus: factsPrev.status,
        previousSleep: factsPrev.status === "ready" ? factsPrev.data.sleep : undefined,
        probeLoading: probe.loading,
        probeView: probe.view,
      }),
    [calendarToday, previousDay, factsCal, factsPrev, probe.loading, probe.view],
  );

  const lockBefore = anchorLockRef.current;
  anchorLockRef.current = reduceAnchorLock(anchorLockRef.current, calendarToday, fresh);
  const lockAfter = anchorLockRef.current;
  const { merged, isUsingCachedSettledAnchor } = mergeDashSleepAnchorWithLock(
    calendarToday,
    fresh,
    anchorLockRef.current,
  );

  useEffect(() => {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console -- Dash sleep lock audit (dev-only)
    console.log("[DASH_SLEEP_LOCK_DEBUG]", {
      calendarDay: calendarToday,
      freshReason: fresh.selectedReason,
      freshAnchorDay: fresh.sleepAnchorDay,
      freshSettled: fresh.sleepAnchorSettled,
      lockBeforeDay: lockBefore?.resolution.sleepAnchorDay ?? null,
      lockBeforeReason: lockBefore?.resolution.selectedReason ?? null,
      lockBeforeSettled: lockBefore?.resolution.sleepAnchorSettled ?? null,
      lockAfterDay: lockAfter?.resolution.sleepAnchorDay ?? null,
      lockAfterReason: lockAfter?.resolution.selectedReason ?? null,
      lockAfterSettled: lockAfter?.resolution.sleepAnchorSettled ?? null,
      mergedDay: merged.sleepAnchorDay,
      mergedReason: merged.selectedReason,
      mergedSettled: merged.sleepAnchorSettled,
      isUsingCachedSettledAnchor,
      invalidatedThisRender: false,
    });
  }, [
    calendarToday,
    fresh.selectedReason,
    fresh.sleepAnchorDay,
    fresh.sleepAnchorSettled,
    lockBefore?.resolution.sleepAnchorDay,
    lockBefore?.resolution.selectedReason,
    lockBefore?.resolution.sleepAnchorSettled,
    lockAfter?.resolution.sleepAnchorDay,
    lockAfter?.resolution.selectedReason,
    lockAfter?.resolution.sleepAnchorSettled,
    merged.sleepAnchorDay,
    merged.selectedReason,
    merged.sleepAnchorSettled,
    isUsingCachedSettledAnchor,
    anchorLockEpoch,
  ]);

  const invalidateSettledAnchor = useCallback(() => {
    if (__DEV__) {
      const stackHint = new Error("invalidateSettledAnchor").stack?.split("\n").slice(1, 4).join(" \u2192 ");
      // eslint-disable-next-line no-console -- Dash sleep lock audit (dev-only)
      console.log("[DASH_SLEEP_INVALIDATE_DEBUG]", {
        calendarDay: calendarToday,
        reason: "invalidateSettledAnchor",
        stackHint: stackHint ?? null,
      });
    }
    anchorLockRef.current = null;
    setAnchorLockEpoch((n) => n + 1);
  }, [calendarToday]);

  useEffect(() => {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console -- Dash sleep anchor audit (dev-only)
    console.log("[DASH_SLEEP_ANCHOR_DEBUG]", {
      calendarDay: calendarToday,
      previousDay,
      selectedReason: merged.selectedReason,
      sleepAnchorDay: merged.sleepAnchorDay,
      sleepAnchorSettled: merged.sleepAnchorSettled,
      isUsingCachedSettledAnchor,
      probeLoading: probe.loading,
      calendarFactsPartial: factsCal.status === "partial",
      previousFactsPartial: factsPrev.status === "partial",
    });
  }, [
    calendarToday,
    previousDay,
    merged.selectedReason,
    merged.sleepAnchorDay,
    merged.sleepAnchorSettled,
    isUsingCachedSettledAnchor,
    probe.loading,
    factsCal.status,
    factsPrev.status,
  ]);

  return useMemo(
    () => ({
      ...merged,
      calendarToday,
      previousDay,
      refetchProbe: probe.refetch,
      isUsingCachedSettledAnchor,
      invalidateSettledAnchor,
    }),
    [merged, calendarToday, previousDay, probe.refetch, isUsingCachedSettledAnchor, invalidateSettledAnchor],
  );
}
