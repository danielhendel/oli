// lib/data/useDailyFacts.ts
import { useEffect, useState } from "react";

import { getDailyFacts, type DailyFactsDto } from "../api/usersMe";
import { useAuth } from "../auth/AuthProvider";
import type { ApiFailure } from "../api/http";

export type DailyFactsState =
  | { status: "loading" }
  | { status: "ready"; data: DailyFactsDto }
  | { status: "not_found" }
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

export function useDailyFacts(dayKey?: string): DailyFactsState {
  const { user, initializing, getIdToken } = useAuth();
  const day = dayKey ?? localDayKey();

  const [state, setState] = useState<DailyFactsState>({ status: "loading" });

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        // ✅ Don’t fire network calls until auth is settled.
        if (initializing) {
          if (alive) setState({ status: "loading" });
          return;
        }

        // ✅ If signed out, treat as loading; RouteGuard redirects.
        if (!user) {
          if (alive) setState({ status: "loading" });
          return;
        }

        const token = await getIdToken(false);
        if (!token) {
          if (alive) setState({ status: "error", message: "No auth token (try Re-auth)" });
          return;
        }

        const res = await getDailyFacts(day, token);
        if (!alive) return;

        if (res.ok) {
          setState({ status: "ready", data: res.json });
          return;
        }

        if (res.status === 404) {
          setState({ status: "not_found" });
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
