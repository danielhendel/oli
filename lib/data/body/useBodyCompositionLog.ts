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
import { diagnoseBodyFatExtentFromObservedAts } from "@/lib/body/presentation/diagnoseBodyFatExtent";

/** Per-page limit for getRawEvents (API max 100). */
export const BODY_COMPOSITION_LOG_PAGE_SIZE = 100;
/** Cap total history rows so a runaway cursor cannot hang the screen. */
export const BODY_COMPOSITION_LOG_MAX_ITEMS = 5000;

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
 * Body Composition history list.
 *
 * Weight: paginates the same unbounded raw-events stream as the Weight chart "All"
 * path (kinds=weight, no start/end) so History can reach every stored Weight event
 * the chart can see — not a first-page 100-row cap.
 *
 * Other metrics: paginate within the shared 5Y Body history window.
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
  const boundedWindow = useMemo(() => resolveBodyHistoryQueryWindow("5Y"), []);
  const kinds = useMemo(
    () =>
      metric === "weight"
        ? (["weight"] as const)
        : (["weight", "body_composition"] as const),
    [metric],
  );
  /** Weight History matches chart All: unbounded pagination. */
  const unboundedWeight = metric === "weight";

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
      let pageCount = 0;

      for (;;) {
        if (seq !== reqSeq.current) return;
        pageCount += 1;
        const listRes = await getRawEvents(token, {
          kinds: [...kinds],
          limit: BODY_COMPOSITION_LOG_PAGE_SIZE,
          includePayload: true,
          ...(unboundedWeight
            ? {}
            : { start: boundedWindow.start, end: boundedWindow.end }),
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
        if (
          accumulated.length >= BODY_COMPOSITION_LOG_MAX_ITEMS &&
          outcome.data.nextCursor
        ) {
          safeSet({
            status: "error",
            error: `Body history exceeds ${BODY_COMPOSITION_LOG_MAX_ITEMS} entries.`,
            requestId: lastRequestId,
            reason: "contract",
          });
          return;
        }
        cursor = outcome.data.nextCursor;
        if (typeof __DEV__ !== "undefined" && __DEV__ && unboundedWeight) {
          const observedAts = accumulated
            .map((it) => it.observedAt)
            .filter((t): t is string => typeof t === "string" && t.length > 0)
            .sort();
          console.info("[WEIGHT_HISTORY_PAGINATION]", {
            pagesLoaded: pageCount,
            rowsLoaded: accumulated.length,
            oldestTimestamp: observedAts[0] ?? null,
            newestTimestamp: observedAts[observedAts.length - 1] ?? null,
            hasNextPage: cursor != null,
            selectedWindow: "unbounded",
          });
        }
        if (cursor == null) break;
        // Safety: never infinite-loop if API keeps returning the same cursor.
        if (pageCount > 200) {
          safeSet({
            status: "error",
            error: "Body history pagination exceeded maximum page count.",
            requestId: lastRequestId,
            reason: "contract",
          });
          return;
        }
      }

      if (typeof __DEV__ !== "undefined" && __DEV__ && unboundedWeight) {
        const observedAts = accumulated
          .map((it) => it.observedAt)
          .filter((t): t is string => typeof t === "string" && t.length > 0)
          .sort();
        console.info("[WEIGHT_HISTORY_PAGINATION]", {
          pagesLoaded: pageCount,
          rowsLoaded: accumulated.length,
          oldestTimestamp: observedAts[0] ?? null,
          newestTimestamp: observedAts[observedAts.length - 1] ?? null,
          hasNextPage: false,
          selectedWindow: "unbounded",
        });
      }

      safeSet({ status: "ready", items: accumulated });
    },
    [
      boundedWindow.end,
      boundedWindow.start,
      getIdToken,
      initializing,
      kinds,
      unboundedWeight,
      user,
    ],
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

  useEffect(() => {
    if (metric !== "bodyFat" || state.status !== "ready") return;
    diagnoseBodyFatExtentFromObservedAts(
      "history_list",
      entries.map((e) => e.observedAt),
      {
        requestedRange: unboundedWeight ? "unbounded" : "5Y",
        operation: "useBodyCompositionLog",
      },
    );
  }, [metric, state.status, entries, unboundedWeight]);

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
