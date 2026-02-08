// lib/data/useLabResult.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabResult } from "@/lib/api/usersMe";
import type { LabResultDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { TruthGetOptions } from "@/lib/api/usersMe";

type State =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: LabResultDto };

function withUniqueCacheBust(opts: TruthGetOptions | undefined, seq: number): TruthGetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useLabResult(id: string): State & { refetch: (opts?: TruthGetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const idRef = useRef(id);
  idRef.current = id;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: TruthGetOptions) => {
      const seq = ++reqSeq.current;

      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== reqSeq.current) return;

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await getLabResult(idRef.current, token, optsUnique);
      if (seq !== reqSeq.current) return;

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
  }, [fetchOnce, id, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
