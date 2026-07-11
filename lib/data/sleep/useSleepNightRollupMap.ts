import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSleepNight } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { partitionOuraWeekPresenceDayKeys } from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";
import {
  SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS,
  boundSleepNightFetchDayKeys,
} from "@/lib/data/sleep/sleepOverviewRanges";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

type RollupInternalState = {
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  sleepNightFallbackBase: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  isRefreshing: boolean;
};

export type SleepNightRollupHookState = RollupInternalState & {
  status: "partial" | "ready";
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  refetch: (opts?: { cacheBust?: string }) => void;
};

const emptyCells = (): Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> => ({});

/**
 * Fetches GET /users/me/sleep-night for elapsed keys only (no future calendar days).
 * Same cell shape and attribution rules as Dash Daily Sleep / Weekly Fitness sleep.
 */
export function useSleepNightRollupMap(dayKeys: readonly DayKey[]): SleepNightRollupHookState {
  const { user, initializing, getIdToken } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<RollupInternalState>({
    sleepNightByDay: emptyCells(),
    sleepNightFallbackBase: emptyCells(),
    isRefreshing: false,
  });

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);
  const { daysToFetch } = useMemo(() => {
    const bounded = boundSleepNightFetchDayKeys(dayKeys, todayDayKey);
    return partitionOuraWeekPresenceDayKeys(bounded, todayDayKey);
  }, [keySig, todayDayKey, dayKeys]);
  const fetchSig = useMemo(() => [...daysToFetch].sort().join("\0"), [daysToFetch]);

  const sleepNightByDay = useMemo(
    () => ({ ...state.sleepNightFallbackBase, ...state.sleepNightByDay }),
    [state.sleepNightFallbackBase, state.sleepNightByDay],
  );

  const status = useMemo<"partial" | "ready">(() => {
    if (!user || initializing) return "ready";
    if (daysToFetch.length === 0) return "ready";
    const allSettled = daysToFetch.every((d) => sleepNightByDay[d]?.settled === true);
    return allSettled ? "ready" : "partial";
  }, [daysToFetch, initializing, sleepNightByDay, user]);

  const fetchAll = useCallback(
    async (cacheBust?: string) => {
      const seq = ++requestSeq.current;
      const keys = keysRef.current;
      const bounded = boundSleepNightFetchDayKeys(keys, todayDayKey);
      const { daysToFetch: days } = partitionOuraWeekPresenceDayKeys(bounded, todayDayKey);
      const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

      if (__DEV__ && keys.filter((d) => d <= todayDayKey).length > SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS) {
        logDataHookTiming("useSleepNightRollupMap", "start", {
          status: "bounded-fetch",
          resultApprox: `requestedElapsed:${keys.filter((d) => d <= todayDayKey).length};capped:${SLEEP_NIGHT_PER_DAY_FETCH_MAX_DAYS}`,
        });
      }

      const safeSet = (next: RollupInternalState) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (init) {
        safeSet({
          sleepNightByDay: emptyCells(),
          sleepNightFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }
      if (!userUid) {
        safeSet({
          sleepNightByDay: emptyCells(),
          sleepNightFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }

      if (days.length === 0) {
        safeSet({
          sleepNightByDay: emptyCells(),
          sleepNightFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }

      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          sleepNightFallbackBase: { ...prev.sleepNightByDay },
          sleepNightByDay: emptyCells(),
          isRefreshing: true,
        };
      });

      const token = await getToken(false);
      if (seq !== requestSeq.current) return;
      if (!token) {
        setState((prev) => {
          if (seq !== requestSeq.current) return prev;
          return {
            sleepNightByDay: { ...prev.sleepNightFallbackBase, ...prev.sleepNightByDay },
            sleepNightFallbackBase: emptyCells(),
            isRefreshing: false,
          };
        });
        return;
      }

      const bust = cacheBust ? `${cacheBust}` : undefined;
      const waveResults: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
      const waveStart = __DEV__ ? performance.now() : 0;

      await Promise.all(
        days.map(async (day) => {
          let cell: WeeklyFitnessSleepNightCell = { settled: true };
          try {
            const res = await getSleepNight(day, token, bust ? { cacheBust: `${bust}:${day}` } : undefined);
            const outcome = truthOutcomeFromApiResult(res);
            if (outcome.status === "ready") {
              cell = { settled: true, view: outcome.data };
            }
          } catch {
            cell = { settled: true };
          }
          waveResults[day] = cell;
          setState((prev) => {
            if (seq !== requestSeq.current) return prev;
            return {
              ...prev,
              sleepNightByDay: { ...prev.sleepNightByDay, [day]: cell },
              isRefreshing: true,
            };
          });
        }),
      );

      if (seq !== requestSeq.current) return;

      if (__DEV__) {
        logDataHookTiming("useSleepNightRollupMap", "end", {
          durationMs: Math.round(performance.now() - waveStart),
          userAvailable: Boolean(userUid),
          resultApprox: `daysToFetch:${days.length}`,
          status: "wave-done",
        });
      }

      const finalCells: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
      for (const day of days) {
        finalCells[day] = waveResults[day]!;
      }
      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          sleepNightByDay: finalCells,
          sleepNightFallbackBase: emptyCells(),
          isRefreshing: false,
        };
      });
    },
    [todayDayKey],
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, fetchSig, user?.uid, initializing]);

  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      void fetchAll(opts?.cacheBust);
    },
    [fetchAll],
  );

  return useMemo(
    () => ({
      ...state,
      status,
      sleepNightByDay,
      refetch,
    }),
    [state, status, sleepNightByDay, refetch],
  );
}
