import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiResult } from "@/lib/api/http";
import { getDailyFacts } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

/**
 * Activity day steps fetch surface — `status` uses Phase 1 canonical readiness only
 * (`missing` | `partial` | `ready` | `error`, see `@oli/contracts/readiness`).
 */
export type ActivityDayStepsState =
  | { status: "missing" }
  | { status: "partial" }
  | { status: "ready"; steps: number }
  | { status: "error"; message: string; requestId: string | null };

/**
 * Loads `activity.steps` for one day via GET /users/me/daily-facts (same trust boundary as Activity rollups).
 * Pass `null` when the route day is invalid or absent — no network calls are made (`missing`).
 */
export function useActivityDaySteps(dayKey: string | null): {
  state: ActivityDayStepsState;
  reload: () => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const [state, setState] = useState<ActivityDayStepsState>({ status: "missing" });
  const seqRef = useRef(0);

  useEffect(() => {
    if (dayKey == null || dayKey.length === 0) {
      setState({ status: "missing" });
      return;
    }
    setState({ status: "partial" });
  }, [dayKey]);

  const run = useCallback(async () => {
    const seq = ++seqRef.current;
    if (dayKey == null || dayKey.length === 0) {
      setState({ status: "missing" });
      return;
    }
    const key = dayKey;
    if (initializing) {
      setState({ status: "partial" });
      return;
    }
    if (!user) {
      setState({ status: "missing" });
      return;
    }

    setState({ status: "partial" });
    const token = await getIdToken(false);
    if (seq !== seqRef.current) return;
    if (!token) {
      setState({
        status: "error",
        message: "Not signed in",
        requestId: null,
      });
      return;
    }

    const res: ApiResult<DailyFactsDto> = await getDailyFacts(key, token);
    if (seq !== seqRef.current) return;

    const outcome = truthOutcomeFromApiResult(res);
    if (outcome.status === "error") {
      setState({
        status: "error",
        message: outcome.error,
        requestId: outcome.requestId,
      });
      return;
    }
    if (outcome.status === "missing") {
      setState({ status: "missing" });
      return;
    }

    const s = outcome.data.activity?.steps;
    if (typeof s === "number" && Number.isFinite(s) && s >= 0) {
      setState({ status: "ready", steps: Math.round(s) });
      return;
    }
    setState({ status: "missing" });
  }, [dayKey, getIdToken, initializing, user]);

  useEffect(() => {
    void run();
  }, [run]);

  const reload = useCallback(() => {
    void run();
  }, [run]);

  return { state, reload };
}
