/**
 * Coordinated Daily Monitor refresh: pull-to-refresh and quiet focus/foreground.
 * Presentation hosts pass existing refetch/invalidation callbacks — no API in screens.
 * Foreground is driven by {@link useCurrentLocalDayKey}'s single AppState listener.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { invalidateDailyFactsSessionCache } from "@/lib/data/dailyFactsSessionCache";
import {
  DAILY_MONITOR_QUIET_REFRESH_DEDUPE_MS,
  runDailyMonitorRefresh,
  type DailyMonitorRefreshReason,
  type DailyMonitorRefreshResult,
} from "@/lib/data/dash/dailyMonitorRefresh";
import { invalidateWorkoutCalendarHydrate } from "@/lib/data/workouts/workoutCalendarHydrateInvalidate";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDailyMonitorRefreshInput = {
  dayKey: DayKey;
  userUid: string | null;
  getIdToken: () => Promise<string | null>;
  refreshDayKey: () => void;
  refetchSleep: (opts?: { cacheBust?: string }) => void;
  refetchReadiness: (opts?: { cacheBust?: string }) => void;
  refetchStress: (opts?: { cacheBust?: string }) => void;
};

export type UseDailyMonitorRefreshResult = {
  refreshing: boolean;
  /** Pull-to-refresh / Retry — shows spinner; dedupes while in flight. */
  onRefresh: () => void;
  /** Focus / foreground — no spinner; deduped against recent quiet+pull refreshes. */
  refreshQuiet: (reason: Extract<DailyMonitorRefreshReason, "focus" | "foreground">) => void;
  lastResult: DailyMonitorRefreshResult | null;
};

export function useDailyMonitorRefresh(
  input: UseDailyMonitorRefreshInput,
): UseDailyMonitorRefreshResult {
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<DailyMonitorRefreshResult | null>(null);
  const inFlightRef = useRef<Promise<DailyMonitorRefreshResult> | null>(null);
  const lastStartedAtRef = useRef(0);
  const lastResultRef = useRef<DailyMonitorRefreshResult | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const inputRef = useRef(input);
  inputRef.current = input;

  const startRefresh = useCallback((reason: DailyMonitorRefreshReason, opts?: { showSpinner?: boolean }) => {
    if (inFlightRef.current != null) {
      return inFlightRef.current;
    }

    const now = Date.now();
    if (
      reason !== "pull" &&
      reason !== "retry" &&
      now - lastStartedAtRef.current < DAILY_MONITOR_QUIET_REFRESH_DEDUPE_MS
    ) {
      return Promise.resolve(
        lastResultRef.current ?? { succeededDomains: [], failedDomains: [] },
      );
    }

    lastStartedAtRef.current = now;
    const showSpinner = opts?.showSpinner === true;
    if (showSpinner && mountedRef.current) setRefreshing(true);

    const promise = Promise.resolve().then(() => {
      const cur = inputRef.current;
      return runDailyMonitorRefresh(
        {
          userUid: cur.userUid,
          dayKey: cur.dayKey,
          invalidateDailyFacts: invalidateDailyFactsSessionCache,
          scheduleStepsRepair: () => {
            if (Platform.OS !== "ios" || cur.userUid == null) return;
            scheduleAppleHealthStepsRepair({
              trigger: "recovery",
              getIdToken: cur.getIdToken,
              userUid: cur.userUid,
            });
          },
          invalidateWorkoutCalendar: invalidateWorkoutCalendarHydrate,
          refetchSleep: (o) => cur.refetchSleep(o),
          refetchReadiness: (o) => cur.refetchReadiness(o),
          refetchStress: (o) => cur.refetchStress(o),
          refreshDayKey: cur.refreshDayKey,
        },
        { reason },
      );
    });

    inFlightRef.current = promise;
    void promise
      .then((result) => {
        lastResultRef.current = result;
        if (!mountedRef.current) return;
        setLastResult(result);
      })
      .finally(() => {
        inFlightRef.current = null;
        if (mountedRef.current && showSpinner) setRefreshing(false);
      });

    return promise;
  }, []);

  const onRefresh = useCallback(() => {
    void startRefresh("pull", { showSpinner: true });
  }, [startRefresh]);

  const refreshQuiet = useCallback(
    (reason: Extract<DailyMonitorRefreshReason, "focus" | "foreground">) => {
      void startRefresh(reason, { showSpinner: false });
    },
    [startRefresh],
  );

  return {
    refreshing,
    onRefresh,
    refreshQuiet,
    lastResult,
  };
}
