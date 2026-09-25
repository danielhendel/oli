import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getRawEvents } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { RawEventListItem } from "@oli/contracts";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { BodyHistoryMetricFilter } from "@/lib/data/body/bodyHistoryMetricFilter";
import { resolveBodyHistoryQueryWindow } from "@/lib/data/body/bodyHistoryRange";
import {
  buildBodyCompositionLogEntries,
  filterBodyCompositionLogEntriesForMetric,
  type BodyCompositionLogEntry,
} from "@/lib/data/body/bodyCompositionLogEntries";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

/** Per-page limit for getRawEvents (API max 100). */
const MAX_LOG_ITEMS_FETCH = 100;
/** Cap total history rows so a runaway cursor cannot hang the screen. */
const MAX_TOTAL_LOG_ITEMS = 5000;

type LogState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; items: readonly RawEventListItem[] };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

/**
 * Body Composition history list — paginates raw events across the shared 5Y window
 * so Weight History is not truncated at the first page (~100 rows).
 */
export function useBodyCompositionLog(metric: BodyHistoryMetricFilter = "weight"): {
  status: "partial" | "error" | "ready";
  entries: BodyCompositionLogEntry[];
  error: string | null;
  requestId: string | null;
  refetch: () => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const tz = getDeviceTimeZone();
  const { start, end } = useMemo(() => resolveBodyHistoryQueryWindow("5Y"), []);
  const kinds = useMemo(
    () =>
      metric === "weight"
        ? (["weight"] as const)
        : (["weight", "body_composition"] as const),
    [metric],
  );

  const reqSeq = useRef(0);
  const [state, setState] = useState<LogState>({ status: "partial" });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchAll = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: LogState) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);
      const accumulated: RawEventListItem[] = [];
      let cursor: string | null = null;
      let lastRequestId: string | null = null;

      for (;;) {
        if (seq !== reqSeq.current) return;
        const listRes = await getRawEvents(token, {
          start,
          end,
          kinds: [...kinds],
          limit: MAX_LOG_ITEMS_FETCH,
          includePayload: true,
          ...(cursor ? { cursor } : {}),
          ...optsUnique,
        });
        if (seq !== reqSeq.current) return;
        lastRequestId = listRes.requestId ?? null;
        const outcome = truthOutcomeFromApiResult(listRes);
        if (outcome.status !== "ready") {
          if (outcome.status === "missing") break;
          safeSet({
            status: "error",
            error: outcome.error,
            requestId: outcome.requestId,
            reason: outcome.reason,
          });
          return;
        }
        accumulated.push(...outcome.data.items);
        if (accumulated.length >= MAX_TOTAL_LOG_ITEMS && outcome.data.nextCursor) {
          safeSet({
            status: "error",
            error: `Body history exceeds ${MAX_TOTAL_LOG_ITEMS} entries in this window.`,
            requestId: lastRequestId,
            reason: "contract",
          });
          return;
        }
        cursor = outcome.data.nextCursor;
        if (cursor == null) break;
      }

      safeSet({ status: "ready", items: accumulated });
    },
    [end, getIdToken, initializing, kinds, start, user],
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => {
    void fetchAll({ cacheBust: String(Date.now()) });
  }, [fetchAll]);

  const entries = useMemo(() => {
    if (state.status !== "ready") return [];
    const all = buildBodyCompositionLogEntries(state.items, tz);
    return filterBodyCompositionLogEntriesForMetric(all, metric);
  }, [state, tz, metric]);

  if (state.status === "error") {
    return {
      status: "error",
      entries: [],
      error: state.error,
      requestId: state.requestId,
      refetch,
    };
  }

  if (state.status === "partial") {
    return { status: "partial", entries: [], error: null, requestId: null, refetch };
  }

  return { status: "ready", entries, error: null, requestId: null, refetch };
}
