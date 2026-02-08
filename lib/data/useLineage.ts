// lib/data/useLineage.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLineage } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { LineageResponseDto } from "@oli/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "missing" }
  | { status: "ready"; data: LineageResponseDto };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type UseLineageArgs =
  | { canonicalEventId: string }
  | { day: string; kind: string; observedAt: string };

export function useLineage(
  args: UseLineageArgs,
  options?: { enabled?: boolean },
): State & { refetch: (opts?: GetOptions) => void } {
  const enabled = options?.enabled ?? true;
  const { user, initializing, getIdToken } = useAuth();

  const argsRef = useRef(args);
  argsRef.current = args;

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
        safeSet({ status: "missing" });
        return;
      }

      if (initializing || !user) {
        if (stateRef.current.status !== "ready" && stateRef.current.status !== "missing")
          safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;

      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }

      if (stateRef.current.status !== "ready" && stateRef.current.status !== "missing")
        safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await getLineage(token, argsRef.current, optsUnique);
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

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId, reason: outcome.reason });
    },
    [getIdToken, initializing, user],
  );

  const argsKey =
    "canonicalEventId" in args
      ? args.canonicalEventId
      : `${args.day}-${args.kind}-${args.observedAt}`;

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, argsKey, enabled, user?.uid]);

  return { ...state, refetch: fetchOnce };
}
