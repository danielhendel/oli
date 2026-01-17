// lib/data/useDayTruth.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDayTruth, type TruthGetOptions } from "@/lib/api/usersMe";
import type { DayTruthDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DayTruthDto };

type RefetchOpts = TruthGetOptions;

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useDayTruth(day: string): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "loading" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++reqSeq.current;

      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "loading" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;

      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      // SWR
      if (stateRef.current.status !== "ready") safeSet({ status: "loading" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await getDayTruth(dayRef.current, token, optsUnique);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }

      if (outcome.status === "missing") {
        // Day truth is computed from canonical events and should normally exist.
        // If it is missing unexpectedly during refresh, keep last known good.
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "missing" });
        return;
      }

      if (stateRef.current.status === "ready") return;

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
