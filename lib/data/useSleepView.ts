import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getOuraSleepView, type TruthGetOptions } from "@/lib/api/usersMe";
import type { SleepViewDto } from "@oli/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: SleepViewDto };

function withUniqueCacheBust(opts: TruthGetOptions | undefined, seq: number): TruthGetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useSleepView(day: string): State & { refetch: (opts?: TruthGetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const dayRef = useRef(day);
  dayRef.current = day;
  const requestSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: TruthGetOptions) => {
      const seq = ++requestSeq.current;
      const safeSet = (next: State) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const res = await getOuraSleepView(dayRef.current, token, withUniqueCacheBust(opts, seq));
      if (seq !== requestSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }
      if (outcome.status === "missing") {
        safeSet({ status: "missing" });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
