// lib/data/useDailyFacts.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDailyFacts, type TruthGetOptions } from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts";

type State =
  | { status: "loading" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DailyFactsDto };

type RefetchOpts = TruthGetOptions;

function emptyDailyFacts(userId: string, day: string): DailyFactsDto {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    date: day,
    userId,
    computedAt: now,
    meta: {
      computedAt: now,
      pipelineVersion: 1,
    },
    sleep: {},
    activity: {},
    body: {},
    nutrition: {},
    recovery: {},
    confidence: {},
  };
}

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;

  // Ensure every call is unique even if caller passes the same refreshKey repeatedly.
  // exactOptionalPropertyTypes-safe: omit cacheBust when not present
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useDailyFacts(day: string): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const requestSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "loading" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++requestSeq.current;

      const safeSet = (next: State) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (initializing || !user) {
        // keep any existing ready state (no flicker)
        if (stateRef.current.status !== "ready") safeSet({ status: "loading" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      // SWR: do not drop ready data to loading on refetch
      if (stateRef.current.status !== "ready") safeSet({ status: "loading" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const res = await getDailyFacts(dayRef.current, token, optsUnique);
      if (seq !== requestSeq.current) return;

      if (!res.ok) {
        if (res.kind === "http" && res.status === 404) {
          safeSet({
            status: "ready",
            data: emptyDailyFacts(user.uid, dayRef.current),
          });
          return;
        }

        // If we already have ready data, keep it rather than flickering to an error card mid-refresh.
        if (stateRef.current.status === "ready") return;

        safeSet({
          status: "error",
          error: res.error,
          requestId: res.requestId,
        });
        return;
      }

      safeSet({ status: "ready", data: res.json });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(
    () => ({
      ...state,
      refetch: fetchOnce,
    }),
    [state, fetchOnce],
  );
}
