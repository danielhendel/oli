// lib/data/useDerivedLedgerSnapshot.ts
// Sprint 5 — Hook for GET /users/me/derived-ledger/snapshot (alias for replay)
// Uses snapshot endpoint per Phase 1 UI contract.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

import { getDerivedLedgerSnapshot, type TruthGetOptions } from "@/lib/api/derivedLedgerMe";
import type { DerivedLedgerReplayResponseDto } from "@/lib/contracts/derivedLedger";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DerivedLedgerReplayResponseDto };

type RefetchOpts = TruthGetOptions;

export type UseDerivedLedgerSnapshotOptions = {
  enabled?: boolean;
};

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useDerivedLedgerSnapshot(
  args: {
    day: string;
    runId?: string;
    asOf?: string;
  },
  options?: UseDerivedLedgerSnapshotOptions,
): State & { refetch: (opts?: RefetchOpts) => void } {
  const enabled = options?.enabled ?? true;

  const { user, initializing, getIdToken } = useAuth();

  const argsRef = useRef(args);
  argsRef.current = args;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>(enabled ? { status: "loading" } : { status: "missing" });
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

      if (!enabledRef.current) {
        safeSet({ status: "missing" });
        return;
      }

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

      const res = await getDerivedLedgerSnapshot(argsRef.current, token, optsUnique);
      if (seq !== reqSeq.current) return;

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
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    if (!enabled) {
      setState({ status: "missing" });
      return;
    }
    void fetchOnce();
  }, [fetchOnce, args.day, args.runId, args.asOf, user?.uid, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
