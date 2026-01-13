// lib/data/useIntelligenceContext.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getIntelligenceContext, type TruthGetOptions } from "@/lib/api/usersMe";
import {
  intelligenceContextDtoSchema,
  validateOrExplain,
  type IntelligenceContextDto,
} from "@/lib/contracts";
import type { HookState } from "./hookResult";

type State = HookState<IntelligenceContextDto>;
type RefetchOpts = TruthGetOptions;

function emptyIntelligenceContext(uid: string, day: string): IntelligenceContextDto {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: `ctx-${uid}-${day}`,
    version: "0",
    userId: uid,
    date: day,
    computedAt: now,
    facts: {},
    insights: { count: 0, tags: [], kinds: [], ids: [] },
    readiness: { hasDailyFacts: false, hasInsights: false },
    meta: {
      computedAt: now,
      pipelineVersion: 1,
    },
  };
}

export function useIntelligenceContext(
  day: string,
): State & { refetch: (opts?: RefetchOpts) => void } {
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

      const res = await getIntelligenceContext(dayRef.current, token, opts);
      if (seq !== reqSeq.current) return;

      if (!res.ok) {
        if (res.kind === "http" && res.status === 404) {
          safeSet({ status: "empty", data: emptyIntelligenceContext(user.uid, dayRef.current) });
          return;
        }

        if (stateRef.current.status === "ready") return;

        safeSet({ status: "error", error: res.error, requestId: res.requestId });
        return;
      }

      const validated = validateOrExplain(intelligenceContextDtoSchema, res.json);
      if (!validated.ok) {
        // Fail closed even if we previously had ready data.
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
