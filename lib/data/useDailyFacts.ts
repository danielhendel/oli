// lib/data/useDailyFacts.ts

import { useEffect, useState } from "react";
import type { DailyFactsDoc, DayKey } from "../api/models";
import { getDailyFacts } from "../api/usersMe";
import { getIdToken } from "../auth/getIdToken";

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DailyFactsDoc };

export const useDailyFacts = (day: DayKey): State => {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const token = await getIdToken();
        if (cancelled) return;

        const res = await getDailyFacts(day, token);
        if (cancelled) return;

        if (res.ok) return setState({ status: "ready", data: res.data });
        if (res.error === "not_found") return setState({ status: "not_found" });
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
