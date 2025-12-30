// lib/data/useDayTruth.ts
import { useEffect, useState } from "react";
import type { ApiResult } from "@/lib/api/http";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDayTruth } from "@/lib/api/usersMe";
import type { DayTruthDto } from "@/lib/contracts";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: DayTruthDto }
  | { status: "error"; error: string; requestId: string | null };

export const useDayTruth = (day: string): State => {
  const { user, initializing, getIdToken } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (initializing) return;

      if (!user) {
        if (!cancelled) setState({ status: "idle" });
        return;
      }

      if (!cancelled) setState({ status: "loading" });

      const t1 = await getIdToken(false);
      if (!t1) {
        if (!cancelled) setState({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      const res: ApiResult<DayTruthDto> = await getDayTruth(day, t1);
      if (cancelled) return;

      if (res.ok) {
        // ✅ Repo-truth: ApiOk<T> exposes `.json` on success
        setState({ status: "ready", data: res.json });
        return;
      }

      // Retry once on auth failure
      if (res.status === 401) {
        const t2 = await getIdToken(true);
        if (!t2) {
          if (!cancelled) setState({ status: "error", error: res.error, requestId: res.requestId });
          return;
        }

        const res2: ApiResult<DayTruthDto> = await getDayTruth(day, t2);
        if (cancelled) return;

        if (res2.ok) {
          setState({ status: "ready", data: res2.json });
          return;
        }

        setState({ status: "error", error: res2.error, requestId: res2.requestId });
        return;
      }

      setState({ status: "error", error: res.error, requestId: res.requestId });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [day, user, initializing, getIdToken]);

  return state;
};
