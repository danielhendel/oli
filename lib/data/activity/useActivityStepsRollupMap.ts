import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDailyFacts } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import { interpretDailyFactsStepsRollupEntry } from "@/lib/data/activity/dailyFactsStepsRollupEntry";
import { computeActivityOverviewFetchDayKeys } from "@/lib/data/activity/activityOverviewRanges";
import type { DayKey } from "@/lib/ui/calendar/types";

type State = { status: "partial" } | { status: "ready"; rollupByDay: ActivityStepsRollupMap };

/**
 * Fetches GET /users/me/daily-facts for each key in `dayKeys` (parallel).
 * Per-day entries are persisted server rollups only (no client raw-event math).
 */
export function useActivityStepsRollupForKeys(dayKeys: readonly DayKey[]): State & {
  refetch: (opts?: { cacheBust?: string }) => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const keysRef = useRef(dayKeys);
  keysRef.current = dayKeys;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<State>({ status: "partial" });

  const keySig = useMemo(() => [...dayKeys].sort().join("\0"), [dayKeys]);

  const fetchAll = useCallback(async (cacheBust?: string) => {
    const seq = ++requestSeq.current;
    const keys = keysRef.current;
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

    const safeSet = (next: State) => {
      if (seq === requestSeq.current) setState(next);
    };

    if (init) {
      safeSet({ status: "partial" });
      return;
    }
    if (!userUid) {
      safeSet({ status: "ready", rollupByDay: {} });
      return;
    }

    if (keys.length === 0) {
      safeSet({ status: "ready", rollupByDay: {} });
      return;
    }

    safeSet({ status: "partial" });

    const token = await getToken(false);
    if (!token || seq !== requestSeq.current) return;

    const bust = cacheBust ? `${cacheBust}` : undefined;

    const settled = await Promise.allSettled(
      keys.map(async (k) => {
        const res = await getDailyFacts(k, token, bust ? { cacheBust: `${bust}:${k}` } : undefined);
        return { k, res } as const;
      }),
    );

    if (seq !== requestSeq.current) return;

    const rollupByDay: ActivityStepsRollupMap = {};

    for (let i = 0; i < settled.length; i += 1) {
      const k = keys[i]!;
      const item = settled[i]!;
      if (item.status === "rejected") {
        const r = item.reason;
        const reason =
          r instanceof Error ? r.message : typeof r === "string" && r.length > 0 ? r : "Request failed";
        rollupByDay[k] = { kind: "error", message: reason, requestId: null };
        continue;
      }
      const { res } = item.value;
      rollupByDay[k] = interpretDailyFactsStepsRollupEntry(res);
    }

    safeSet({ status: "ready", rollupByDay });
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

  return useMemo(() => ({ ...state, refetch }), [state, refetch]);
}

/**
 * Overview screen: trailing `ACTIVITY_OVERVIEW_AVG_12M_DAYS` (365) inclusive calendar days ending on `selectedDay`.
 */
export function useActivityStepsRollupMap(selectedDay: DayKey): State & {
  refetch: (opts?: { cacheBust?: string }) => void;
} {
  const keys = useMemo(() => computeActivityOverviewFetchDayKeys(selectedDay), [selectedDay]);
  return useActivityStepsRollupForKeys(keys);
}
