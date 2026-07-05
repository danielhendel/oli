// lib/data/useHealthScore.ts
// Phase 1.5 Sprint 2 — Health Score read-only hook (no Firestore, no client-side scoring)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getHealthScore, type TruthGetOptions } from "@/lib/api/usersMe";
import type { HealthScoreDoc } from "@/lib/contracts";
import type { FailureKind } from "@/lib/api/http";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

export type HealthScoreState =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; data: HealthScoreDoc };

type RefetchOpts = TruthGetOptions;

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useHealthScore(
  day: string,
  options?: { enabled?: boolean },
): HealthScoreState & { refetch: (opts?: RefetchOpts) => void } {
  const enabled = options?.enabled ?? true;
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const requestSeq = useRef(0);
  const [state, setState] = useState<HealthScoreState>({ status: "partial" });
  const stateRef = useRef<HealthScoreState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++requestSeq.current;

      const safeSet = (next: HealthScoreState) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      if (!enabled) {
        if (stateRef.current.status !== "ready") safeSet({ status: "missing" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);
      const res = await getHealthScore(dayRef.current, token, optsUnique);
      if (seq !== requestSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }

      if (outcome.status === "missing") {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "missing" });
        return;
      }

      if (stateRef.current.status === "ready") return;
      safeSet({
        status: "error",
        error: outcome.error,
        requestId: outcome.requestId,
        reason: outcome.reason,
      });
    },
    [enabled, getIdToken, initializing, user],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchOnce();
  }, [enabled, fetchOnce, day, user?.uid]);

  const effectiveState = enabled ? state : ({ status: "missing" } as const);

  return useMemo(
    () => ({
      ...effectiveState,
      refetch: fetchOnce,
    }),
    [effectiveState, fetchOnce],
  );
}
