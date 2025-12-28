// lib/data/useIntelligenceContext.ts
import { useEffect, useState } from "react";
import { getIntelligenceContext } from "../api/usersMe";
import type { IntelligenceContextDto } from "@/lib/contracts";
import type { ApiResult, ApiFailure } from "../api/http";
import { useAuth } from "../auth/AuthProvider";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: IntelligenceContextDto }
  | { status: "error"; error: string; requestId: string | null };

function isNotFoundIntelligenceContext(res: ApiFailure): boolean {
  if (res.status !== 404) return false;

  const json = res.json;
  if (!json || typeof json !== "object") return false;

  // Expected backend shape:
  // { ok:false, error:{ code:"NOT_FOUND", resource:"intelligenceContext", day:"YYYY-MM-DD" } }
  const root = json as Record<string, unknown>;
  const err = root["error"];
  if (!err || typeof err !== "object") return false;

  const e = err as Record<string, unknown>;
  return e["code"] === "NOT_FOUND" && e["resource"] === "intelligenceContext";
}

/**
 * Client-only empty context.
 * Represents a valid "no data yet" day without creating a backend document.
 */
function emptyIntelligenceContext(
  userId: string,
  day: string
): IntelligenceContextDto {
  const computedAt = new Date().toISOString();

  return {
    schemaVersion: 1,
    version: "v1",
    id: day, // stable per-day placeholder (not persisted)
    userId,
    date: day,
    computedAt,

    facts: {},

    insights: {
      count: 0,
      bySeverity: {
        info: 0,
        warning: 0,
        critical: 0
      },
      tags: [],
      kinds: [],
      ids: []
    },

    readiness: {
      hasDailyFacts: false,
      hasInsights: false
    },

    confidence: {}
  };
}

export const useIntelligenceContext = (day: string) => {
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
        if (!cancelled) {
          setState({
            status: "error",
            error: "No auth token",
            requestId: null
          });
        }
        return;
      }

      const res: ApiResult<IntelligenceContextDto> =
        await getIntelligenceContext(day, t1);

      if (cancelled) return;

      if (res.ok) {
        setState({ status: "ready", data: res.json });
        return;
      }

      // ✅ NOT_FOUND → empty/ready (expected for new day)
      if (isNotFoundIntelligenceContext(res)) {
        setState({
          status: "ready",
          data: emptyIntelligenceContext(user.uid, day)
        });
        return;
      }

      // Retry once on auth failure
      if (res.status === 401) {
        const t2 = await getIdToken(true);
        if (!t2) {
          if (!cancelled) {
            setState({
              status: "error",
              error: res.error,
              requestId: res.requestId
            });
          }
          return;
        }

        const res2: ApiResult<IntelligenceContextDto> =
          await getIntelligenceContext(day, t2);

        if (cancelled) return;

        if (res2.ok) {
          setState({ status: "ready", data: res2.json });
          return;
        }

        if (isNotFoundIntelligenceContext(res2)) {
          setState({
            status: "ready",
            data: emptyIntelligenceContext(user.uid, day)
          });
          return;
        }

        setState({
          status: "error",
          error: res2.error,
          requestId: res2.requestId
        });
        return;
      }

      setState({
        status: "error",
        error: res.error,
        requestId: res.requestId
      });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [day, user, initializing, getIdToken]);

  return state;
};
