import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SleepNightViewDto } from "@oli/contracts";

import { getSleepNightsRange } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { partitionOuraWeekPresenceDayKeys } from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";
import { sleepNightRangeFetchWindows } from "@/lib/data/sleep/sleepOverviewRanges";
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

function cellFromRangeNight(view: SleepNightViewDto | undefined): WeeklyFitnessSleepNightCell {
  if (view == null) return { settled: true };
  // Range API returns exact_anchor / wake_day only; ignore densifying prior-night if ever present.
  if (view.resolution === "latest_completed_prior_night") return { settled: true };
  return { settled: true, view };
}

/**
 * Fetches GET /users/me/sleep-nights for elapsed keys (chunked at the API 90-day max).
 * Maps sparse nights into per-day cells; missing days settle empty.
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
  const { daysToFetch } = useMemo(
    () => partitionOuraWeekPresenceDayKeys(dayKeys, todayDayKey),
    [keySig, todayDayKey, dayKeys],
  );
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
      const { daysToFetch: days } = partitionOuraWeekPresenceDayKeys(keys, todayDayKey);
      const { initializing: init, userUid, getIdToken: getToken } = authRef.current;
      const windows = sleepNightRangeFetchWindows(days);

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
      const daySet = new Set(days);
      const waveStart = __DEV__ ? performance.now() : 0;

      if (__DEV__) {
        logDataHookTiming("useSleepNightRollupMap", "start", {
          status: "range-fetch",
          resultApprox: `daysToFetch:${days.length};windows:${windows.length}`,
        });
      }

      await Promise.all(
        windows.map(async (window) => {
          const windowDays = days.filter((d) => d >= window.start && d <= window.end);
          const settleEmpty = () => {
            for (const day of windowDays) {
              waveResults[day] = { settled: true };
            }
          };

          try {
            const res = await getSleepNightsRange(
              window.start,
              window.end,
              token,
              bust ? { cacheBust: `${bust}:${window.start}:${window.end}` } : undefined,
            );
            const outcome = truthOutcomeFromApiResult(res);
            if (outcome.status !== "ready") {
              settleEmpty();
            } else {
              const byRequested = new Map<string, SleepNightViewDto>();
              for (const night of outcome.data.nights) {
                if (!daySet.has(night.requestedDay as DayKey)) continue;
                byRequested.set(night.requestedDay, night);
              }
              for (const day of windowDays) {
                waveResults[day] = cellFromRangeNight(byRequested.get(day));
              }
            }
          } catch {
            settleEmpty();
          }

          setState((prev) => {
            if (seq !== requestSeq.current) return prev;
            const patch: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
            for (const day of windowDays) {
              patch[day] = waveResults[day]!;
            }
            return {
              ...prev,
              sleepNightByDay: { ...prev.sleepNightByDay, ...patch },
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
          resultApprox: `daysToFetch:${days.length};windows:${windows.length}`,
          status: "wave-done",
        });
      }

      const finalCells: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
      for (const day of days) {
        finalCells[day] = waveResults[day] ?? { settled: true };
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
