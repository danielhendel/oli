import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { DailyFactsDto } from "@/lib/contracts";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import { getDailyFactsSessionCached } from "@/lib/data/dailyFactsSessionCache";
import { partitionOuraWeekPresenceDayKeys } from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeeklyDailyEnergyCell = {
  settled: boolean;
  energy?: DailyEnergyCardDto;
};

type RollupInternalState = {
  energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>>;
  energyFallbackBase: Partial<Record<DayKey, WeeklyDailyEnergyCell>>;
  isRefreshing: boolean;
};

export type WeeklyDailyEnergyMapHookState = RollupInternalState & {
  status: "partial" | "ready";
  energyByDay: Partial<Record<DayKey, WeeklyDailyEnergyCell>>;
  refetch: (opts?: { cacheBust?: string }) => void;
};

const emptyCells = (): Partial<Record<DayKey, WeeklyDailyEnergyCell>> => ({});

function energyFromFacts(data: DailyFactsDto): DailyEnergyCardDto | undefined {
  return data.energy as DailyEnergyCardDto | undefined;
}

/**
 * Fetches GET /users/me/daily-facts for elapsed week days (no future days).
 * Reads persisted `energy.estimatedKcal` only — no client energy math.
 */
export function useWeeklyDailyEnergyMap(dayKeys: readonly DayKey[]): WeeklyDailyEnergyMapHookState {
  const { user, initializing, getIdToken } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<RollupInternalState>({
    energyByDay: emptyCells(),
    energyFallbackBase: emptyCells(),
    isRefreshing: false,
  });

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);
  const { daysToFetch } = useMemo(
    () => partitionOuraWeekPresenceDayKeys(dayKeys, todayDayKey),
    [keySig, todayDayKey, dayKeys],
  );
  const fetchSig = useMemo(() => [...daysToFetch].sort().join("\0"), [daysToFetch]);

  const energyByDay = useMemo(
    () => ({ ...state.energyFallbackBase, ...state.energyByDay }),
    [state.energyFallbackBase, state.energyByDay],
  );

  const status = useMemo<"partial" | "ready">(() => {
    if (!user || initializing) return "ready";
    if (daysToFetch.length === 0) return "ready";
    const allSettled = daysToFetch.every((d) => energyByDay[d]?.settled === true);
    return allSettled ? "ready" : "partial";
  }, [daysToFetch, initializing, energyByDay, user]);

  const fetchAll = useCallback(
    async (cacheBust?: string) => {
      const seq = ++requestSeq.current;
      const keys = keysRef.current;
      const { daysToFetch: days } = partitionOuraWeekPresenceDayKeys(keys, todayDayKey);
      const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

      const safeSet = (next: RollupInternalState) => {
        if (seq !== requestSeq.current) setState(next);
      };

      if (init) {
        safeSet({
          energyByDay: emptyCells(),
          energyFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }
      if (!userUid) {
        safeSet({
          energyByDay: emptyCells(),
          energyFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }

      if (days.length === 0) {
        safeSet({
          energyByDay: emptyCells(),
          energyFallbackBase: emptyCells(),
          isRefreshing: false,
        });
        return;
      }

      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          energyFallbackBase: { ...prev.energyByDay },
          energyByDay: emptyCells(),
          isRefreshing: true,
        };
      });

      const token = await getToken(false);
      if (seq !== requestSeq.current) return;
      if (!token) {
        setState((prev) => {
          if (seq !== requestSeq.current) return prev;
          return {
            energyByDay: { ...prev.energyFallbackBase, ...prev.energyByDay },
            energyFallbackBase: emptyCells(),
            isRefreshing: false,
          };
        });
        return;
      }

      const bust = cacheBust ? `${cacheBust}` : undefined;
      const waveResults: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
      const waveStart = __DEV__ ? performance.now() : 0;

      await Promise.all(
        days.map(async (day) => {
          let cell: WeeklyDailyEnergyCell = { settled: true };
          try {
            const res = await getDailyFactsSessionCached({
              userUid,
              day,
              token,
              ...(bust ? { opts: { cacheBust: `${bust}:${day}` } } : {}),
            });
            const outcome = truthOutcomeFromApiResult(res);
            if (outcome.status === "ready") {
              const energy = energyFromFacts(outcome.data);
              cell = energy != null ? { settled: true, energy } : { settled: true };
            }
          } catch {
            cell = { settled: true };
          }
          waveResults[day] = cell;
          setState((prev) => {
            if (seq !== requestSeq.current) return prev;
            return {
              ...prev,
              energyByDay: { ...prev.energyByDay, [day]: cell },
              isRefreshing: true,
            };
          });
        }),
      );

      if (seq !== requestSeq.current) return;

      if (__DEV__) {
        logDataHookTiming("useWeeklyDailyEnergyMap", "end", {
          durationMs: Math.round(performance.now() - waveStart),
          userAvailable: Boolean(userUid),
          resultApprox: `daysToFetch:${days.length}`,
          status: "wave-done",
        });
      }

      const finalCells: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
      for (const day of days) {
        finalCells[day] = waveResults[day]!;
      }
      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          energyByDay: finalCells,
          energyFallbackBase: emptyCells(),
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
      energyByDay,
      refetch,
    }),
    [state, status, energyByDay, refetch],
  );
}
