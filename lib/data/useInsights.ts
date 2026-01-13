// lib/data/useInsights.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getInsights, type TruthGetOptions } from "@/lib/api/usersMe";
import { insightsResponseDtoSchema, validateOrExplain, type InsightsResponseDto } from "@/lib/contracts";
import type { HookState } from "./hookResult";

type State = HookState<InsightsResponseDto>;
type RefetchOpts = TruthGetOptions;

function emptyInsights(day: string): InsightsResponseDto {
  return { day, count: 0, items: [] };
}

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useInsights(day: string): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "loading" });
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

      const res = await getInsights(dayRef.current, token, optsUnique);
      if (seq !== reqSeq.current) return;

      if (!res.ok) {
        if (res.kind === "http" && res.status === 404) {
          safeSet({ status: "empty", data: emptyInsights(dayRef.current) });
          return;
        }

        if (stateRef.current.status === "ready") return;

        safeSet({ status: "error", error: res.error, requestId: res.requestId });
        return;
      }

      const validated = validateOrExplain(insightsResponseDtoSchema, res.json);
      if (!validated.ok) {
        safeSet({ status: "invalid", error: validated.error, requestId: res.requestId });
        return;
      }

      safeSet({ status: "ready", data: validated.value });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
