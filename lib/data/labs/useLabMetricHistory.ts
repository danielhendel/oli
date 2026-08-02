// lib/data/labs/useLabMetricHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabMetricHistory } from "@/lib/api/labsHistory";
import type { LabHistoryPointDto } from "@/lib/contracts";
import type { GetOptions } from "@/lib/api/http";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | {
      status: "ready";
      points: LabHistoryPointDto[];
      nextCursor: string | null;
      displayName: string;
    };

export type UseLabMetricHistoryOptions = {
  metricKey: string;
  enabled?: boolean;
  limit?: number;
} & GetOptions;

/**
 * Bounded, cancellable metric history from accepted results.
 * History axis is collectedAt (server-ordered). No Firebase in screens.
 */
export function useLabMetricHistory(
  opts: UseLabMetricHistoryOptions,
): State & { refetch: (opts?: GetOptions) => void; loadMore: () => void } {
  const { metricKey, enabled = true, limit = 20 } = opts;
  const { user, initializing, getIdToken } = useAuth();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });
  const cursorRef = useRef<string | null>(null);
  const pointsRef = useRef<LabHistoryPointDto[]>([]);

  const fetchPage = useCallback(
    async (mode: "replace" | "append", refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!enabled || !metricKey) {
        safeSet({ status: "partial" });
        return;
      }
      if (initializing || !user) {
        if (state.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (mode === "replace" && state.status !== "ready") safeSet({ status: "partial" });

      const res = await getLabMetricHistory(token, metricKey, {
        ...optsRef.current,
        ...refetchOpts,
        limit,
        cursor: mode === "append" ? cursorRef.current : null,
      });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "missing") {
        pointsRef.current = [];
        cursorRef.current = null;
        safeSet({
          status: "ready",
          points: [],
          nextCursor: null,
          displayName: metricKey,
        });
        return;
      }
      if (outcome.status !== "ready") {
        safeSet({
          status: "error",
          error: outcome.error,
          requestId: outcome.requestId,
        });
        return;
      }

      cursorRef.current = outcome.data.nextCursor;
      const nextPoints =
        mode === "append" ? [...pointsRef.current, ...outcome.data.points] : outcome.data.points;
      pointsRef.current = nextPoints;
      safeSet({
        status: "ready",
        points: nextPoints,
        nextCursor: outcome.data.nextCursor,
        displayName: outcome.data.displayName,
      });
    },
    [enabled, getIdToken, initializing, limit, metricKey, state.status, user],
  );

  const refetch = useCallback(
    (refetchOpts?: GetOptions) => {
      cursorRef.current = null;
      pointsRef.current = [];
      void fetchPage("replace", refetchOpts);
    },
    [fetchPage],
  );

  const loadMore = useCallback(() => {
    if (state.status !== "ready" || !state.nextCursor) return;
    void fetchPage("append");
  }, [fetchPage, state]);

  useEffect(() => {
    cursorRef.current = null;
    pointsRef.current = [];
    void fetchPage("replace");
  }, [fetchPage, metricKey, enabled, user?.uid]);

  return { ...state, refetch, loadMore };
}
