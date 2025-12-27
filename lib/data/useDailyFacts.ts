// lib/data/useDailyFacts.ts
import { useEffect, useState } from "react";

import { getDailyFacts } from "../api/usersMe";
import { useAuth } from "../auth/AuthProvider";

export type DailyFactsState =
  | { status: "loading" }
  | { status: "ready"; data: unknown }
  | { status: "not_found" }
  | { status: "error"; message: string };

const localDayKey = (): string => {
  // Local YYYY-MM-DD
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatApiError = (res: { status: number; error: string; kind: string; requestId: string }): string =>
  `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId})`;

export function useDailyFacts(dayKey?: string): DailyFactsState {
  const { user, getIdToken } = useAuth();
  const day = dayKey ?? localDayKey();

  const [state, setState] = useState<DailyFactsState>({ status: "loading" });

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        if (!user) {
          if (alive) setState({ status: "error", message: "Not signed in" });
          return;
        }

        const token = await getIdToken(false);
        if (!token) {
          if (alive) setState({ status: "error", message: "No auth token" });
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
  }, [day, user, getIdToken]);

  return state;
}
