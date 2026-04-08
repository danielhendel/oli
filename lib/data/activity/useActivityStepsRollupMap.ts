import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDailyFacts } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { computeActivityOverviewFetchDayKeys } from "@/lib/data/activity/activityOverviewRanges";
import type { TruthOutcome } from "@/lib/data/truthOutcome";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { DayKey } from "@/lib/ui/calendar/types";

type State = { status: "partial" } | { status: "ready"; rollupByDay: ActivityStepsRollupMap };

function rollupFromOutcome(outcome: TruthOutcome<DailyFactsDto>): DayStepsRollupEntry {
  if (outcome.status === "ready") {
    const s = outcome.data.activity?.steps;
    if (typeof s === "number" && Number.isFinite(s) && s >= 0) {
      return { kind: "numeric", steps: Math.round(s) };
    }
    return { kind: "absent" };
  }
  if (outcome.status === "missing") return { kind: "absent" };
  return { kind: "absent" };
}

/**
 * Fetches GET /users/me/daily-facts for every calendar day in the union of Activity Overview windows.
 * Per-day entries are persisted server rollups only (no client raw-event math).
 */
export function useActivityStepsRollupMap(selectedDay: DayKey): State & { refetch: (opts?: { cacheBust?: string }) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const selectedRef = useRef(selectedDay);
  selectedRef.current = selectedDay;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<State>({ status: "partial" });

  const fetchAll = useCallback(async (cacheBust?: string) => {
    const seq = ++requestSeq.current;
    const day = selectedRef.current;
    const keys = computeActivityOverviewFetchDayKeys(day);
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
        rollupByDay[k] = { kind: "absent" };
        continue;
      }
      const { res } = item.value;
      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "error") {
        rollupByDay[k] = { kind: "absent" };
        continue;
      }
      rollupByDay[k] = rollupFromOutcome(outcome);
    }

    safeSet({ status: "ready", rollupByDay });
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, selectedDay, user?.uid, initializing]);

  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      void fetchAll(opts?.cacheBust);
    },
    [fetchAll],
  );

  return useMemo(() => ({ ...state, refetch }), [state, refetch]);
}
