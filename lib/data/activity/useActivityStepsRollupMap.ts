import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDailyFacts } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { interpretDailyFactsStepsRollupEntry } from "@/lib/data/activity/dailyFactsStepsRollupEntry";
import type { DayKey } from "@/lib/ui/calendar/types";

type RollupInternalState = {
  /** Per-wave accumulator (keys filled as each daily-facts response settles). */
  rollupByDay: ActivityStepsRollupMap;
  /** Snapshot at wave start; merged under {@link rollupDisplayByDay} until the wave finishes. */
  rollupFallbackBase: ActivityStepsRollupMap;
  isRefreshing: boolean;
};

export type ActivityStepsRollupHookState = RollupInternalState & {
  /** `partial` only when no displayable rollup entries yet. */
  status: "partial" | "ready";
  /** Stale-while-revalidate view: `rollupFallbackBase` ∪ latest per-key overlays. */
  rollupDisplayByDay: ActivityStepsRollupMap;
  refetch: (opts?: { cacheBust?: string }) => void;
};

const emptyRollup = (): ActivityStepsRollupMap => ({});

/**
 * Fetches GET /users/me/daily-facts for each key in `dayKeys` (parallel requests, merged incrementally).
 * Per-day entries are persisted server rollups only (no client raw-event math).
 *
 * Activity overview + Dash share one instance via `ActivityRollupProvider` + `useActivityStepsRollupMap`.
 */
export function useActivityStepsRollupForKeys(dayKeys: readonly DayKey[]): ActivityStepsRollupHookState {
  const { user, initializing, getIdToken } = useAuth();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<RollupInternalState>({
    rollupByDay: emptyRollup(),
    rollupFallbackBase: emptyRollup(),
    isRefreshing: false,
  });

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);

  const rollupDisplayByDay = useMemo(
    () => ({ ...state.rollupFallbackBase, ...state.rollupByDay }),
    [state.rollupFallbackBase, state.rollupByDay],
  );

  const status = useMemo<"partial" | "ready">(() => {
    return Object.keys(rollupDisplayByDay).length > 0 ? "ready" : "partial";
  }, [rollupDisplayByDay]);

  const fetchAll = useCallback(async (cacheBust?: string) => {
    const seq = ++requestSeq.current;
    const keys = keysRef.current;
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

    if (init) {
      if (seq === requestSeq.current) {
        setState({
          rollupByDay: emptyRollup(),
          rollupFallbackBase: emptyRollup(),
          isRefreshing: false,
        });
      }
      return;
    }
    if (!userUid) {
      if (seq === requestSeq.current) {
        setState({
          rollupByDay: emptyRollup(),
          rollupFallbackBase: emptyRollup(),
          isRefreshing: false,
        });
      }
      return;
    }

    if (keys.length === 0) {
      if (seq === requestSeq.current) {
        setState({
          rollupByDay: emptyRollup(),
          rollupFallbackBase: emptyRollup(),
          isRefreshing: false,
        });
      }
      return;
    }

    setState((prev) => {
      if (seq !== requestSeq.current) return prev;
      return {
        rollupFallbackBase: { ...prev.rollupByDay },
        rollupByDay: emptyRollup(),
        isRefreshing: true,
      };
    });

    const token = await getToken(false);
    if (seq !== requestSeq.current) return;
    if (!token) {
      setState((prev) => {
        if (seq !== requestSeq.current) return prev;
        return {
          rollupByDay: { ...prev.rollupFallbackBase, ...prev.rollupByDay },
          rollupFallbackBase: emptyRollup(),
          isRefreshing: false,
        };
      });
      return;
    }

    const bust = cacheBust ? `${cacheBust}` : undefined;

    const waveResults: ActivityStepsRollupMap = {};
    await Promise.all(
      keys.map(async (k) => {
        let entry: DayStepsRollupEntry;
        try {
          const res = await getDailyFacts(k, token, bust ? { cacheBust: `${bust}:${k}` } : undefined);
          entry = interpretDailyFactsStepsRollupEntry(res);
        } catch (r: unknown) {
          const reason =
            r instanceof Error ? r.message : typeof r === "string" && r.length > 0 ? r : "Request failed";
          entry = { kind: "error", message: reason, requestId: null };
        }
        waveResults[k] = entry;
        setState((prev) => {
          if (seq !== requestSeq.current) return prev;
          return {
            ...prev,
            rollupByDay: { ...prev.rollupByDay, [k]: entry },
            isRefreshing: true,
          };
        });
      }),
    );

    if (seq !== requestSeq.current) return;

    const finalRollup: ActivityStepsRollupMap = {};
    for (const k of keys) {
      finalRollup[k] = waveResults[k]!;
    }
    setState((prev) => {
      if (seq !== requestSeq.current) return prev;
      return {
        rollupByDay: finalRollup,
        rollupFallbackBase: emptyRollup(),
        isRefreshing: false,
      };
    });
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, keySig, user?.uid, initializing]);

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
      rollupDisplayByDay,
      refetch,
    }),
    [state, status, rollupDisplayByDay, refetch],
  );
}
