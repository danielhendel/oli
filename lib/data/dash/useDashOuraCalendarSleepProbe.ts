import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOuraSleepView, type TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { SleepViewDto } from "@oli/contracts";

function withUniqueCacheBust(opts: TruthGetOptions | undefined, seq: number): TruthGetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type DashOuraCalendarSleepProbeState = {
  view: SleepViewDto | undefined;
  loading: boolean;
  refetch: (opts?: TruthGetOptions) => void;
};

/**
 * Oura sleep view for the **calendar** wake day only. Used to detect overnight physiology
 * (requested calendar day, resolved previous sleep day) before choosing Dash sleep anchor.
 */
export function useDashOuraCalendarSleepProbe(calendarDay: string): DashOuraCalendarSleepProbeState {
  const { user, initializing, getIdToken } = useAuth();
  const dayRef = useRef(calendarDay);
  dayRef.current = calendarDay;
  const requestSeq = useRef(0);
  const [view, setView] = useState<SleepViewDto | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchOnce = useCallback(
    async (opts?: TruthGetOptions) => {
      const seq = ++requestSeq.current;
      const dayKey = dayRef.current;

      if (initializing || !user) {
        if (seq === requestSeq.current) {
          setView(undefined);
          setLoading(false);
        }
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) {
        if (seq === requestSeq.current) setLoading(false);
        return;
      }

      if (seq !== requestSeq.current) return;
      setLoading(true);

      const bust = withUniqueCacheBust(opts, seq);
      const sleepRes = await getOuraSleepView(dayKey, token, bust);
      if (seq !== requestSeq.current) return;
      const outcome = truthOutcomeFromApiResult(sleepRes);
      setView(outcome.status === "ready" ? outcome.data : undefined);
      setLoading(false);
    },
    [getIdToken, initializing, user?.uid],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, calendarDay, user?.uid]);

  return useMemo(
    () => ({
      view,
      loading,
      refetch: fetchOnce,
    }),
    [view, loading, fetchOnce],
  );
}
