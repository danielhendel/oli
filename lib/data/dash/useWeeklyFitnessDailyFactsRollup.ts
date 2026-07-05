import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { DailyFactsDto } from "@/lib/contracts";
import {
  getDailyFactsNetworkFresh,
  invalidateDailyFactsSessionCacheForDays,
} from "@/lib/data/dailyFactsSessionCache";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { isDebugDataLogsEnabled } from "@/lib/dev/debugDataLogs";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Per-day Weekly Fitness aggregate read off `dailyFacts.{strength, cardio}`.
 *
 * `status` distinguishes three settled outcomes:
 * - `ready`   — dailyFacts doc exists for the day; counts/distance populated when present
 * - `missing` — 404 (future/empty day); contributes zero, never an error
 * - `error`   — network/timeout/contract failure for that single day
 */
export type WeeklyFitnessDailyFactsCell = {
  settled: boolean;
  status?: "ready" | "missing" | "error";
  strengthWorkoutsCount?: number;
  cardioDistanceMeters?: number;
  cardioSessions?: number;
  errorMessage?: string;
};

export type WeeklyFitnessDailyFactsByDay = Partial<Record<DayKey, WeeklyFitnessDailyFactsCell>>;

export type WeeklyFitnessDailyFactsRollupState = {
  /** `partial` while the first wave is in flight (no cells settled yet). */
  status: "partial" | "ready" | "error";
  /** Populated when any settled day produced a real network/parse error. Future-day 404s never trigger this. */
  error: string | null;
  byDay: WeeklyFitnessDailyFactsByDay;
  isRefreshing: boolean;
  refetch: (opts?: { cacheBust?: string }) => void;
};

const emptyByDay = (): WeeklyFitnessDailyFactsByDay => ({});

function extractStrengthWorkoutsCount(data: DailyFactsDto): number | undefined {
  const v = data.strength?.workoutsCount;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

function extractCardioDistanceMeters(data: DailyFactsDto): number | undefined {
  const v = data.cardio?.distanceMeters;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

function extractCardioSessions(data: DailyFactsDto): number | undefined {
  const v = data.cardio?.sessions;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

type InternalState = {
  byDay: WeeklyFitnessDailyFactsByDay;
  fallbackBase: WeeklyFitnessDailyFactsByDay;
  isRefreshing: boolean;
};

/**
 * Lightweight Weekly Fitness data source: fetches `GET /users/me/daily-facts?day=…`
 * for each day in `dayKeys` (parallel; always network-fresh via {@link getDailyFactsNetworkFresh}).
 *
 * - 404 (no doc / future day) ⇒ cell is `status: "missing"`, **not** an error.
 * - Network / timeout / contract failures ⇒ cell is `status: "error"`. The hook surfaces
 *   `status: "error"` only when at least one settled day failed for a non-404 reason.
 * - Replaces the legacy year-wide `useWorkoutsCalendarRange` hydration for the Dash
 *   Weekly Fitness card (see audit: "Dashboard Weekly Fitness Timeout").
 */
export function useWeeklyFitnessDailyFactsRollup(
  dayKeys: readonly DayKey[],
): WeeklyFitnessDailyFactsRollupState {
  const { user, initializing, getIdToken } = useAuth();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<InternalState>({
    byDay: emptyByDay(),
    fallbackBase: emptyByDay(),
    isRefreshing: false,
  });

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);

  const byDayDisplay = useMemo<WeeklyFitnessDailyFactsByDay>(
    () => ({ ...state.fallbackBase, ...state.byDay }),
    [state.fallbackBase, state.byDay],
  );

  const status = useMemo<"partial" | "ready" | "error">(() => {
    if (!user || initializing) return "ready";
    if (dayKeys.length === 0) return "ready";
    // Never surface stale fallback cells as "ready" while a cache-busted refetch is in flight.
    if (state.isRefreshing) return "partial";
    const allSettled = dayKeys.every((d) => byDayDisplay[d]?.settled === true);
    if (!allSettled) return "partial";
    const hasError = dayKeys.some((d) => byDayDisplay[d]?.status === "error");
    return hasError ? "error" : "ready";
  }, [byDayDisplay, dayKeys, initializing, state.isRefreshing, user]);

  const error = useMemo<string | null>(() => {
    if (status !== "error") return null;
    for (const d of dayKeys) {
      const cell = byDayDisplay[d];
      if (cell?.status === "error" && cell.errorMessage) return cell.errorMessage;
    }
    return "Request failed";
  }, [byDayDisplay, dayKeys, status]);

  const fetchAll = useCallback(async (cacheBust?: string) => {
    const seq = ++requestSeq.current;
    const keys = keysRef.current;
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

    const reset = () => {
      if (seq !== requestSeq.current) return;
      setState({ byDay: emptyByDay(), fallbackBase: emptyByDay(), isRefreshing: false });
    };

    if (init || !userUid || keys.length === 0) {
      reset();
      return;
    }

    const bust = cacheBust ? `${cacheBust}` : `weeklyFitness:${Date.now()}`;

    setState((prev) => {
      if (seq !== requestSeq.current) return prev;
      return {
        // Do not carry prior strength counts into a cache-busted wave (prevents stale totals in logs/UI).
        fallbackBase: emptyByDay(),
        byDay: emptyByDay(),
        isRefreshing: true,
      };
    });

    const token = await getToken(false);
    if (seq !== requestSeq.current) return;
    if (!token) {
      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          byDay: { ...prev.fallbackBase, ...prev.byDay },
          fallbackBase: emptyByDay(),
          isRefreshing: false,
        };
      });
      return;
    }

    // Clear session cells silently so Activity/useDailyFacts cannot serve stale counts while we fetch.
    invalidateDailyFactsSessionCacheForDays({ userUid, days: keys, notify: false });
    const waveResults: WeeklyFitnessDailyFactsByDay = {};
    const waveStart = __DEV__ ? performance.now() : 0;

    await Promise.all(
      keys.map(async (day) => {
        let cell: WeeklyFitnessDailyFactsCell;
        try {
          const res = await getDailyFactsNetworkFresh({
            userUid,
            day,
            token,
            cacheBust: `${bust}:${day}`,
          });
          const outcome = truthOutcomeFromApiResult(res);
          if (outcome.status === "ready") {
            const swc = extractStrengthWorkoutsCount(outcome.data);
            const cdm = extractCardioDistanceMeters(outcome.data);
            const cs = extractCardioSessions(outcome.data);
            cell = {
              settled: true,
              status: "ready",
              ...(swc !== undefined ? { strengthWorkoutsCount: swc } : {}),
              ...(cdm !== undefined ? { cardioDistanceMeters: cdm } : {}),
              ...(cs !== undefined ? { cardioSessions: cs } : {}),
            };
          } else if (outcome.status === "missing") {
            cell = { settled: true, status: "missing" };
          } else {
            cell = { settled: true, status: "error", errorMessage: outcome.error };
          }
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : typeof e === "string" && e.length > 0 ? e : "Request failed";
          cell = { settled: true, status: "error", errorMessage: msg };
        }
        waveResults[day] = cell;
        setState((prev) => {
          if (seq !== requestSeq.current) return prev;
          return {
            ...prev,
            byDay: { ...prev.byDay, [day]: cell },
            isRefreshing: true,
          };
        });
      }),
    );

    if (seq !== requestSeq.current) return;

    if (__DEV__) {
      const missingDayCount = keys.filter((d) => waveResults[d]?.status === "missing").length;
      const errorDayCount = keys.filter((d) => waveResults[d]?.status === "error").length;
      const finalStatus = errorDayCount > 0 ? "error" : "ready";
      const strengthByDay: Record<string, number> = {};
      for (const d of keys) {
        const swc = waveResults[d]?.strengthWorkoutsCount;
        strengthByDay[d] =
          typeof swc === "number" && Number.isFinite(swc) ? Math.max(0, Math.floor(swc)) : 0;
      }
      const strengthWeekTotal = Object.values(strengthByDay).reduce((acc, n) => acc + n, 0);
      logDataHookTiming("useWeeklyFitnessDailyFactsRollup", "end", {
        durationMs: Math.round(performance.now() - waveStart),
        userAvailable: Boolean(userUid),
        resultApprox: `dayKeys:${keys.length}`,
        status: "wave-done",
      });
      if (isDebugDataLogsEnabled()) {
        // eslint-disable-next-line no-console
        console.log("[WEEKLY_FITNESS_DAILY_FACTS]", {
        weekStart: keys[0] ?? null,
        weekEnd: keys[keys.length - 1] ?? null,
        dayCount: keys.length,
        missingDayCount,
        errorDayCount,
        strengthByDay,
        strengthWeekTotal,
        durationMs: Math.round(performance.now() - waveStart),
        status: finalStatus,
      });
      }
    }

    const finalCells: WeeklyFitnessDailyFactsByDay = {};
    for (const day of keys) {
      finalCells[day] = waveResults[day]!;
    }
    setState((prev) => {
      if (seq !== requestSeq.current) return prev;
      return {
        byDay: finalCells,
        fallbackBase: emptyByDay(),
        isRefreshing: false,
      };
    });
  }, []);

  useEffect(() => {
    void fetchAll(`weeklyFitnessMount:${keySig}`);
  }, [fetchAll, keySig, user?.uid, initializing]);

  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      void fetchAll(opts?.cacheBust);
    },
    [fetchAll],
  );

  return useMemo(
    () => ({
      status,
      error,
      byDay: byDayDisplay,
      isRefreshing: state.isRefreshing,
      refetch,
    }),
    [status, error, byDayDisplay, state.isRefreshing, refetch],
  );
}
