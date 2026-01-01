// lib/data/useInsights.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getInsights, type TruthGetOptions } from "@/lib/api/usersMe";
import type { InsightsResponseDto } from "@/lib/contracts";

type State =
  | { status: "loading" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: InsightsResponseDto };

type RefetchOpts = TruthGetOptions;

function emptyInsights(day: string): InsightsResponseDto {
  return { day, count: 0, items: [] };
}

export function useInsights(day: string): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "loading" });

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq !== reqSeq.current) return;
        setState(next);
      };

      if (initializing) {
        safeSet({ status: "loading" });
        return;
      }

      if (!user) {
        safeSet({ status: "ready", data: emptyInsights(dayRef.current) });
        return;
      }

      const token = await getIdToken();
      if (seq !== reqSeq.current) return;

      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      safeSet({ status: "loading" });

      const res = await getInsights(dayRef.current, token, opts);
      if (seq !== reqSeq.current) return;

      if (!res.ok) {
        if (res.kind === "http" && res.status === 404) {
          safeSet({ status: "ready", data: emptyInsights(dayRef.current) });
          return;
        }
        safeSet({ status: "error", error: res.error, requestId: res.requestId });
        return;
      }

      safeSet({ status: "ready", data: res.json });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
