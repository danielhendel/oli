import { useEffect, useState } from "react";

import { getInsights, type InsightsResponseDto } from "../api/usersMe";
import { useAuth } from "../auth/AuthProvider";
import type { ApiFailure, ApiResult } from "../api/http";

export type InsightsState =
  | { status: "loading" }
  | { status: "ready"; data: InsightsResponseDto }
  | { status: "error"; message: string };

const localDayKey = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatApiError = (res: ApiFailure): string => {
  const rid = res.requestId ? `, requestId=${res.requestId}` : "";
  return `${res.error} (kind=${res.kind}, status=${res.status}${rid})`;
};

const isAuthExpired = (res: ApiResult<unknown>): res is ApiFailure =>
  !res.ok && res.status === 401;

export function useInsights(dayKey?: string): InsightsState {
  const { user, initializing, getIdToken } = useAuth();
  const day = dayKey ?? localDayKey();

  const [state, setState] = useState<InsightsState>({ status: "loading" });

  useEffect(() => {
    let alive = true;

    const runWithToken = async (token: string): Promise<ApiResult<InsightsResponseDto>> => {
      return getInsights(day, token);
    };

    const run = async () => {
      try {
        if (initializing) return;
        if (!user) return;

        const t1 = await getIdToken(false);
        if (!t1) {
          if (alive) setState({ status: "error", message: "No auth token (try Re-auth)" });
          return;
        }

        let res = await runWithToken(t1);

        if (isAuthExpired(res)) {
          const t2 = await getIdToken(true);
          if (!t2) {
            if (alive) setState({ status: "error", message: "Session expired (try Re-auth)" });
            return;
          }
          res = await runWithToken(t2);
        }

        if (!alive) return;

        if (res.ok) {
          // Backend contract: not 404 when empty; returns {count:0,items:[]}
          setState({ status: "ready", data: res.json });
          return;
        }

        // If we ever see 404 here, treat as error (backend mismatch)
        if (res.status === 404) {
          setState({
            status: "error",
            message: "Insights route returned 404 (should be 200 empty list)",
          });
          return;
        }

        setState({ status: "error", message: formatApiError(res) });
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setState({ status: "error", message: msg });
      }
    };

    setState({ status: "loading" });
    void run();

    return () => {
      alive = false;
    };
  }, [day, user, initializing, getIdToken]);

  return state;
}
