// lib/data/useDailyFacts.ts
import { useEffect, useState } from "react";
import { getDailyFacts } from "../api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts";
import type { ApiResult, ApiFailure } from "../api/http";
import { useAuth } from "../auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: DailyFactsDto }
  | { status: "error"; error: string; requestId: string | null };

function isNotFoundDailyFacts(res: ApiFailure): boolean {
  if (res.status !== 404) return false;

  const json = res.json;
  if (!json || typeof json !== "object") return false;

  // Expected shape:
  // { ok:false, error:{ code:"NOT_FOUND", resource:"dailyFacts", day:"YYYY-MM-DD" } }
  const root = json as Record<string, unknown>;
  const err = root["error"];
  if (!err || typeof err !== "object") return false;

  const e = err as Record<string, unknown>;
  return e["code"] === "NOT_FOUND" && e["resource"] === "dailyFacts";
}

function emptyDailyFacts(userId: string, day: string): DailyFactsDto {
  return {
    schemaVersion: 1,
    userId,
    date: day,
    computedAt: new Date().toISOString(),
  };
}

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

      // ✅ NOT_FOUND means: no facts yet today → treat as empty/ready (not an error)
      if (isNotFoundDailyFacts(res)) {
        setState({ status: "ready", data: emptyDailyFacts(user.uid, day) });
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

        if (res2.ok) {
          setState({ status: "ready", data: res2.json });
          return;
        }

        if (isNotFoundDailyFacts(res2)) {
          setState({ status: "ready", data: emptyDailyFacts(user.uid, day) });
          return;
        }

        setState({ status: "error", error: res2.error, requestId: res2.requestId });
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
