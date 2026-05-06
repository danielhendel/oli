// lib/data/useLabResults.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabResults } from "@/lib/api/usersMe";
import type { LabResultsListResponseDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: { items: LabResultsListResponseDto["items"]; nextCursor: string | null } };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type UseLabResultsOptions = { limit?: number; enabled?: boolean } & GetOptions;

const EMPTY_LABS: { items: LabResultsListResponseDto["items"]; nextCursor: null } = {
  items: [],
  nextCursor: null,
};

/**
 * Lab results list. Pass a **stable** options object from the caller (e.g. `useMemo`), or use only
 * `limit` / `enabled` — the hook depends on those primitives, not the whole `opts` identity, to avoid
 * refetch loops when callers pass inline objects each render.
 */
export function useLabResults(opts?: UseLabResultsOptions): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const limit = opts?.limit ?? 50;
  const enabled = opts?.enabled ?? true;

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;

      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!enabledRef.current) {
        safeSet({ status: "ready", data: EMPTY_LABS });
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

      const mergedRaw = { ...optsRef.current, ...refetchOpts } as UseLabResultsOptions & GetOptions;
      const { enabled, ...mergedOpts } = mergedRaw;
      void enabled;
      const optsUnique = withUniqueCacheBust(mergedOpts, seq);

      const t0 = __DEV__ ? performance.now() : 0;
      if (__DEV__) {
        logDataHookTiming("useLabResults", "start", { userAvailable: Boolean(user) });
      }

      const res = await getLabResults(token, { limit, ...optsUnique });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (__DEV__) {
        const approx =
          outcome.status === "ready"
            ? `items:${outcome.data.items.length}`
            : outcome.status === "error"
              ? "error"
              : outcome.status;
        logDataHookTiming("useLabResults", "end", {
          durationMs: Math.round(performance.now() - t0),
          userAvailable: Boolean(user),
          status: outcome.status,
          resultApprox: approx,
        });
      }

      if (outcome.status === "ready") {
        safeSet({
          status: "ready",
          data: {
            items: outcome.data.items,
            nextCursor: outcome.data.nextCursor,
          },
        });
        return;
      }

      if (outcome.status === "missing") {
        safeSet({
          status: "ready",
          data: EMPTY_LABS,
        });
        return;
      }

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, limit, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, limit, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
