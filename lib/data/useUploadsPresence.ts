// lib/data/useUploadsPresence.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getUploads, type UploadsPresenceResponseDto } from "@/lib/api/usersMe";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

export type UploadsPresence = {
  count: number;
  latest: UploadsPresenceResponseDto["latest"];
};

type State =
  | { status: "loading" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: UploadsPresence };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useUploadsPresence(): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "loading" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
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

      if (stateRef.current.status !== "ready") safeSet({ status: "loading" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await getUploads(token, optsUnique);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        safeSet({
          status: "ready",
          data: {
            count: outcome.data.count,
            latest: outcome.data.latest,
          },
        });
        return;
      }

      if (outcome.status === "missing") {
        safeSet({
          status: "ready",
          data: { count: 0, latest: null },
        });
        return;
      }

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
