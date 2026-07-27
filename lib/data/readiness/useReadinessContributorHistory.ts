/**
 * Shared bounded readiness contributor history (90 inclusive days).
 *
 * One GET /users/me/oura-readiness-range for [selectedDay−89, selectedDay]
 * serves HRV Balance, Body Temperature, Recovery Index, and Sleep Balance.
 * No YTD. No per-metric or per-day fan-out. No consumer UI in Phase 2F-C1.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  READINESS_CONTRIBUTOR_DETAIL_HISTORY_DAY_COUNT,
  readinessContributorDetailHistoryDayKeys,
} from "@/lib/data/readiness/readinessContributorAverages";
import {
  ensureReadinessContributorHistory,
  peekReadinessContributorHistory,
  subscribeReadinessContributorHistory,
  type ReadinessContributorDayCell,
  type ReadinessContributorHistoryStatus,
} from "@/lib/data/readiness/readinessContributorHistoryStore";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseReadinessContributorHistoryResult = {
  status: ReadinessContributorHistoryStatus;
  dayByDay: Partial<Record<DayKey, ReadinessContributorDayCell>>;
  errorMessage: string | null;
  refetch: (opts?: { cacheBust?: string }) => void;
  rangeStart: DayKey | null;
  rangeEnd: DayKey | null;
};

export type UseReadinessContributorHistoryOptions = {
  selectedDay: DayKey;
  /** Device today — caps future days out of the requested window. */
  todayDayKey: DayKey;
  enabled?: boolean;
};

/**
 * Fetches a single bounded 90-day readiness range ending on `selectedDay`
 * (clamped so the end is never after device today).
 */
export function useReadinessContributorHistory(
  opts: UseReadinessContributorHistoryOptions,
): UseReadinessContributorHistoryResult {
  const { selectedDay, todayDayKey, enabled = true } = opts;
  const { user, initializing, getIdToken } = useAuth();

  const endDay = selectedDay <= todayDayKey ? selectedDay : todayDayKey;
  const startDay = addCalendarDaysToDayKey(
    endDay,
    -(READINESS_CONTRIBUTOR_DETAIL_HISTORY_DAY_COUNT - 1),
  );
  const dayKeys = useMemo(
    () => readinessContributorDetailHistoryDayKeys(endDay).filter((d) => d <= todayDayKey),
    [endDay, todayDayKey],
  );

  const uid = user?.uid ?? null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled || uid == null) return () => undefined;
      return subscribeReadinessContributorHistory(uid, startDay, endDay, onStoreChange);
    },
    [enabled, uid, startDay, endDay],
  );

  const getSnapshot = useCallback(() => {
    if (!enabled || uid == null) return null;
    return peekReadinessContributorHistory(uid, startDay, endDay);
  }, [enabled, uid, startDay, endDay]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled || initializing || uid == null) return;
    void ensureReadinessContributorHistory({
      uid,
      rangeStart: startDay,
      rangeEnd: endDay,
      dayKeys,
      getIdToken,
    });
  }, [enabled, initializing, uid, startDay, endDay, dayKeys, getIdToken]);

  const refetch = useCallback(
    (refetchOpts?: { cacheBust?: string }) => {
      if (!enabled || uid == null) return;
      void ensureReadinessContributorHistory({
        uid,
        rangeStart: startDay,
        rangeEnd: endDay,
        dayKeys,
        getIdToken,
        cacheBust: refetchOpts?.cacheBust ?? `retry-${Date.now()}`,
      });
    },
    [enabled, uid, startDay, endDay, dayKeys, getIdToken],
  );

  if (!enabled || uid == null) {
    return {
      status: "idle",
      dayByDay: {},
      errorMessage: null,
      refetch,
      rangeStart: null,
      rangeEnd: null,
    };
  }

  return {
    status: snapshot?.historyStatus ?? "idle",
    dayByDay: snapshot?.dayByDay ?? {},
    errorMessage: snapshot?.errorMessage ?? null,
    refetch,
    rangeStart: startDay,
    rangeEnd: endDay,
  };
}
