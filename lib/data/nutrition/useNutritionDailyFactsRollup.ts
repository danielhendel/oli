import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DailyFactsDto } from "@/lib/contracts";
import {
  getDailyFactsNetworkFresh,
  invalidateDailyFactsSessionCacheForDays,
} from "@/lib/data/dailyFactsSessionCache";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { DayKey } from "@/lib/ui/calendar/types";

export type NutritionDailyFactsCell = {
  settled: boolean;
  status?: "ready" | "missing" | "error";
  nutrition?: DailyFactsDto["nutrition"];
  errorMessage?: string;
};

export type NutritionDailyFactsByDay = Partial<Record<DayKey, NutritionDailyFactsCell>>;

export type NutritionDailyFactsRollupState = {
  status: "partial" | "ready" | "error";
  error: string | null;
  byDay: NutritionDailyFactsByDay;
  isRefreshing: boolean;
  refetch: (opts?: { cacheBust?: string }) => void;
};

const emptyByDay = (): NutritionDailyFactsByDay => ({});

export function useNutritionDailyFactsRollup(dayKeys: readonly DayKey[]): NutritionDailyFactsRollupState {
  const { user, initializing, getIdToken } = useAuth();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);

  const [byDay, setByDay] = useState<NutritionDailyFactsByDay>(emptyByDay);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);

  const fetchAll = useCallback(
    async (opts?: { cacheBust?: string }) => {
      const seq = ++requestSeq.current;
      const keys = keysRef.current;
      const userUid = user?.uid;
      if (!userUid || initializing || keys.length === 0) return;

      setIsRefreshing(true);
      setError(null);

      const token = await getIdToken();
      if (!token || seq !== requestSeq.current) return;

      const bust = opts?.cacheBust ?? String(Date.now());
      invalidateDailyFactsSessionCacheForDays({ userUid, days: keys, notify: false });

      const waveResults: NutritionDailyFactsByDay = {};
      let hasError = false;

      await Promise.all(
        keys.map(async (day) => {
          let cell: NutritionDailyFactsCell;
          try {
            const res = await getDailyFactsNetworkFresh({
              userUid,
              day,
              token,
              cacheBust: `${bust}:${day}`,
            });
            const outcome = truthOutcomeFromApiResult(res);
            if (outcome.status === "ready") {
              cell = { settled: true, status: "ready", nutrition: outcome.data.nutrition };
            } else if (outcome.status === "missing") {
              cell = { settled: true, status: "missing" };
            } else {
              hasError = true;
              cell = { settled: true, status: "error", errorMessage: outcome.error };
            }
          } catch (e: unknown) {
            hasError = true;
            const msg =
              e instanceof Error ? e.message : typeof e === "string" && e.length > 0 ? e : "Request failed";
            cell = { settled: true, status: "error", errorMessage: msg };
          }
          waveResults[day] = cell;
        }),
      );

      if (seq !== requestSeq.current) return;
      setByDay(waveResults);
      setError(hasError ? "Some days could not be loaded" : null);
      setIsRefreshing(false);
    },
    [user?.uid, initializing, getIdToken],
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, keySig]);

  const status = useMemo((): "partial" | "ready" | "error" => {
    if (!user || initializing) return "partial";
    if (dayKeys.length === 0) return "ready";
    const settled = dayKeys.filter((d) => byDay[d]?.settled).length;
    if (settled < dayKeys.length) return "partial";
    return error != null ? "error" : "ready";
  }, [user, initializing, dayKeys, byDay, error]);

  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      void fetchAll(opts);
    },
    [fetchAll],
  );

  return { status, error, byDay, isRefreshing, refetch };
}
