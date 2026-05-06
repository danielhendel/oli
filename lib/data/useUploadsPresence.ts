// lib/data/useUploadsPresence.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getUploads } from "@/lib/api/usersMe";
import type { UploadsPresenceResponseDto } from "@oli/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";

export type UploadsPresence = {
  count: number;
  latest: UploadsPresenceResponseDto["latest"];
};

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: UploadsPresence };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type UseUploadsPresenceOptions = {
  /** When false, skips request (e.g. tab not focused). Returns empty presence. */
  enabled?: boolean;
};

const EMPTY_UPLOADS: UploadsPresence = { count: 0, latest: null };

export function useUploadsPresence(
  options?: UseUploadsPresenceOptions,
): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = options?.enabled ?? true;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "partial" });
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

      if (!enabledRef.current) {
        safeSet({ status: "ready", data: EMPTY_UPLOADS });
        return;
      }

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;

      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const t0 = __DEV__ ? performance.now() : 0;
      if (__DEV__) {
        logDataHookTiming("useUploadsPresence", "start", { userAvailable: Boolean(user) });
      }

      const res = await getUploads(token, optsUnique);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (__DEV__) {
        logDataHookTiming("useUploadsPresence", "end", {
          durationMs: Math.round(performance.now() - t0),
          userAvailable: Boolean(user),
          status: outcome.status,
        });
      }

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
  }, [fetchOnce, user?.uid, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
