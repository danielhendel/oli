// lib/data/useDailyFacts.ts
import { useEffect, useState } from "react";
import { getDailyFacts } from "../api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts";
import type { ApiResult } from "../api/http";
import { useAuth } from "../auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: DailyFactsDto }
  | { status: "error"; error: string; requestId: string | null };

export const useDailyFacts = (day: string) => {
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

      const res: ApiResult<DailyFactsDto> = await getDailyFacts(day, t1);
      if (cancelled) return;

      if (res.ok) {
        setState({ status: "ready", data: res.json });
        return;
      }

      // If unauthorized, force-refresh and retry once
      if (res.status === 401) {
        const t2 = await getIdToken(true);
        if (!t2) {
          if (!cancelled) setState({ status: "error", error: res.error, requestId: res.requestId });
          return;
        }

        const res2: ApiResult<DailyFactsDto> = await getDailyFacts(day, t2);
        if (cancelled) return;

        if (res2.ok) setState({ status: "ready", data: res2.json });
        else setState({ status: "error", error: res2.error, requestId: res2.requestId });
        return;
      }

      setState({ status: "error", error: res.error, requestId: res.requestId });
    };

    // ✅ satisfy no-floating-promises
    void run();

    return () => {
      cancelled = true;
    };
  }, [day, user, initializing, getIdToken]);

  return state;
};
