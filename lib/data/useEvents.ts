// lib/data/useEvents.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEvents } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { CanonicalEventsListResponseDto } from "@oli/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  eventsCacheKey,
  getEventsCached,
  setEventsCached,
} from "@/lib/data/timelineCache";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; data: CanonicalEventsListResponseDto; fromCache?: boolean };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type UseEventsArgs = {
  start?: string;
  end?: string;
  kinds?: string[];
  cursor?: string;
  limit?: number;
};

export function useEvents(
  args: UseEventsArgs,
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
        safeSet({ status: "ready", data: { items: [], nextCursor: null }, fromCache: false });
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
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);
      const args = { ...argsRef.current, ...optsUnique };
      const cacheKey = eventsCacheKey(argsRef.current);

      const res = await getEvents(token, args);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "ready") {
        setEventsCached(cacheKey, outcome.data);
        safeSet({ status: "ready", data: outcome.data, fromCache: false });
        return;
      }

      if (outcome.status === "missing") {
        const empty = { items: [], nextCursor: null };
        setEventsCached(cacheKey, empty);
        safeSet({ status: "ready", data: empty, fromCache: false });
        return;
      }

      // Offline/error: try read-through cache before failing
      const cached = getEventsCached(cacheKey);
      if (cached) {
        safeSet({ status: "ready", data: cached, fromCache: true });
        return;
      }

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId, reason: outcome.reason });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, args.start, args.end, args.kinds?.join(","), args.cursor, args.limit, enabled, user?.uid]);

  return { ...state, refetch: fetchOnce };
}
