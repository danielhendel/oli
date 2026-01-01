// lib/data/useDayTruth.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDayTruth, type TruthGetOptions } from "@/lib/api/usersMe";
import type { DayTruthDto } from "@/lib/contracts";

type State =
  | { status: "loading" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DayTruthDto };

type RefetchOpts = TruthGetOptions;

function emptyDayTruth(day: string): DayTruthDto {
  // IMPORTANT: Must match your actual DayTruthDto contract.
  return {
    day,
    eventsCount: 0,
    latestCanonicalEventAt: null,
  };
}

export function useDayTruth(day: string): State & { refetch: (opts?: RefetchOpts) => void } {
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
        safeSet({ status: "loading" });
        return;
      }

      const token = await getIdToken();
      if (seq !== reqSeq.current) return;

      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      safeSet({ status: "loading" });

      const res = await getDayTruth(dayRef.current, token, opts);
      if (seq !== reqSeq.current) return;

      if (!res.ok) {
        if (res.kind === "http" && res.status === 404) {
          safeSet({ status: "ready", data: emptyDayTruth(dayRef.current) });
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
