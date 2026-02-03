// lib/data/useFailures.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { apiGetJsonAuthed, type GetOptions } from "@/lib/api/http";
import type { FailureListResponseDto } from "@/lib/contracts/failure";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "loading" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: FailureListResponseDto };

export type UseFailuresArgs = {
  day: string; // YYYY-MM-DD
  limit?: number;
  cursor?: string;
};

export type UseFailuresOptions = {
  enabled?: boolean;
};

function sortByCreatedAtDesc(items: FailureListResponseDto["items"]): FailureListResponseDto["items"] {
  // Sorting is not filtering; it enforces the Sprint 1 requirement that failures are time-ordered.
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useFailures(
  args: UseFailuresArgs,
  options?: UseFailuresOptions,
): State & { refetch: (opts?: GetOptions) => void } {
  const enabled = options?.enabled ?? true;

  const { user, initializing, getIdToken } = useAuth();

  const argsRef = useRef(args);
  argsRef.current = args;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

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

      if (!enabledRef.current) {
        safeSet({ status: "ready", data: { items: [], nextCursor: null } });
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

      const { day, limit, cursor } = argsRef.current;
      const qs = new URLSearchParams({ day });
      if (typeof limit === "number") qs.set("limit", String(limit));
      if (cursor) qs.set("cursor", cursor);

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await apiGetJsonAuthed<FailureListResponseDto>(`/users/me/failures?${qs.toString()}`, token, {
        noStore: true,
        ...(optsUnique?.cacheBust ? { cacheBust: optsUnique.cacheBust } : {}),
        ...(optsUnique?.timeoutMs ? { timeoutMs: optsUnique.timeoutMs } : {}),
      });

      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        safeSet({
          status: "ready",
          data: {
            items: sortByCreatedAtDesc(outcome.data.items),
            nextCursor: outcome.data.nextCursor,
          },
        });
        return;
      }

      // For failures, "missing" must be explicit in UI as absence, not assumed.
      // Treat 404 as empty list rather than a hidden state.
      if (outcome.status === "missing") {
        safeSet({ status: "ready", data: { items: [], nextCursor: null } });
        return;
      }

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, args.day, args.limit, args.cursor, user?.uid, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
