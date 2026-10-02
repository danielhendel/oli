/**
 * Waist circumference RawEvent history (manual-first; not Apple-Health-only).
 *
 * Range "All": unbounded pagination (Body Fat All pattern).
 * Other ranges: {@link resolveBodyHistoryQueryWindow}.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getRawEvents } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  resolveBodyHistoryQueryWindow,
  type WeightRangeKey,
} from "@/lib/data/body/bodyHistoryRange";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  buildWaistHistoryPointsFromRows,
  buildWaistHistoryStats,
  selectLatestWaistForPresentation,
  type WaistHistoryPoint,
  type WaistHistoryRawRow,
  type WaistHistoryStats,
} from "@/lib/data/body/waistHistoryPoints";

const MAX_FETCH = 100;
const MAX_TOTAL = 25000;

export type WaistMetricHistoryState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | {
      status: "ready";
      points: WaistHistoryPoint[];
      stats: WaistHistoryStats;
      latest: WaistHistoryPoint | null;
    };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

function emptyReady(): Extract<WaistMetricHistoryState, { status: "ready" }> {
  return {
    status: "ready",
    points: [],
    stats: { low: null, high: null, change: null },
    latest: null,
  };
}

/**
 * Query body_composition RawEvents and expose dated waist circumference points.
 * Includes sourceId "manual" — does not apply isAppleHealthBodyReadSourceId filter.
 */
export function useWaistMetricHistory(
  chartRange: WeightRangeKey,
  opts?: { enabled?: boolean },
): WaistMetricHistoryState & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const rangeRef = useRef(chartRange);
  rangeRef.current = chartRange;
  const enabledRef = useRef(opts?.enabled !== false);
  enabledRef.current = opts?.enabled !== false;
  const reqSeq = useRef(0);
  const [state, setState] = useState<WaistMetricHistoryState>({ status: "partial" });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadOnce = useCallback(
    async (fetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: WaistMetricHistoryState) => {
        if (seq === reqSeq.current) setState(next);
      };
      if (!enabledRef.current) {
        safeSet(emptyReady());
        return;
      }
      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }
      const token = await getIdToken(false);
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }
      safeSet({ status: "partial" });
      const optsUnique = withUniqueCacheBust(fetchOpts, seq);
      const unboundedAll = rangeRef.current === "All";
      const boundedWindow = unboundedAll ? null : resolveBodyHistoryQueryWindow(rangeRef.current);

      const accumulated: WaistHistoryRawRow[] = [];
      let cursor: string | null = null;
      let lastRequestId: string | null = null;

      for (;;) {
        if (seq !== reqSeq.current) return;
        const listRes = await getRawEvents(token, {
          ...(boundedWindow ? { start: boundedWindow.start, end: boundedWindow.end } : {}),
          kinds: ["body_composition"],
          limit: MAX_FETCH,
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
        for (const it of outcome.data.items) {
          const row: WaistHistoryRawRow = {
            id: it.id,
            observedAt: it.observedAt,
            sourceId: it.sourceId,
            kind: it.kind,
            ...(it.payload !== undefined ? { payload: it.payload } : {}),
          };
          accumulated.push(row);
        }
        if (accumulated.length >= MAX_TOTAL && outcome.data.nextCursor) {
          safeSet({
            status: "error",
            error: `Waist history exceeds ${MAX_TOTAL} entries in this range. Choose a shorter chart range.`,
            requestId: lastRequestId,
            reason: "contract",
          });
          return;
        }
        cursor = outcome.data.nextCursor;
        if (!cursor) break;
      }

      const tz = getDeviceTimeZone();
      const points = buildWaistHistoryPointsFromRows(accumulated, tz);
      safeSet({
        status: "ready",
        points,
        stats: buildWaistHistoryStats(points),
        latest: selectLatestWaistForPresentation(points),
      });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void loadOnce();
  }, [loadOnce, chartRange, opts?.enabled, user?.uid]);

  return useMemo(() => ({ ...state, refetch: loadOnce }), [state, loadOnce]);
}
