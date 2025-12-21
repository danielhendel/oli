// lib/data/useInsights.ts

import { useEffect, useState } from "react";
import type { DayKey, InsightsResponse } from "../api/models";
import { getInsights } from "../api/usersMe";
import { getIdToken } from "../auth/getIdToken";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: InsightsResponse };

export const useInsights = (day: DayKey): State => {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const token = await getIdToken();
        if (cancelled) return;

        const res = await getInsights(day, token);
        if (cancelled) return;

        if (res.ok) return setState({ status: "ready", data: res.data });
        // Insights are not a "required" doc; treat not_found as empty.
        if (res.error === "not_found") return setState({ status: "ready", data: { day, count: 0, items: [] } });
        return setState({ status: "error", message: res.message });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (!cancelled) setState({ status: "error", message: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [day]);

  return state;
};
