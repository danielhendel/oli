// lib/data/useWithingsPresence.ts
// Phase 3A — Withings presence: connected + recent data for expected-but-missing (no prompts).
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getWithingsStatus, getRawEvents } from "@/lib/api/usersMe";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

import { WITHINGS_WEIGHT_KIND, WITHINGS_SOURCE_ID } from "./withingsPresenceContract";

const RECENT_DAYS = 7;

export { WITHINGS_WEIGHT_KIND, WITHINGS_SOURCE_ID };

/** Backfill state from GET /integrations/withings/status (Phase 3B.1). */
export type WithingsBackfillState = {
  status: "idle" | "running" | "complete" | "error";
  processedCount?: number;
  lastError?: { code: string; message: string; atIso: string } | null;
};

export type WithingsPresence = {
  connected: boolean;
  lastMeasurementAt: string | null;
  hasRecentData: boolean;
  /** Present when status returns backfill (Phase 3B.1). */
  backfill?: WithingsBackfillState;
};

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: WithingsPresence };

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useWithingsPresence(): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
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
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
      const optsUnique = withUniqueCacheBust(opts, seq);

      const statusRes = await getWithingsStatus(token, optsUnique);
      if (seq !== reqSeq.current) return;

      const statusOutcome = truthOutcomeFromApiResult(statusRes);
      if (statusOutcome.status !== "ready") {
        safeSet({
          status: "ready",
          data: { connected: false, lastMeasurementAt: null, hasRecentData: false },
        });
        return;
      }

      const connected = statusOutcome.data.connected;
      const backfill = statusOutcome.data.backfill;
      const backfillState: WithingsBackfillState | undefined = backfill
        ? {
            status: backfill.status as "idle" | "running" | "complete" | "error",
            ...(backfill.processedCount !== undefined ? { processedCount: backfill.processedCount } : {}),
            ...(backfill.lastError != null ? { lastError: backfill.lastError } : {}),
          }
        : undefined;
      if (!connected) {
        safeSet({
          status: "ready",
          data: {
            connected: false,
            lastMeasurementAt: null,
            hasRecentData: false,
            ...(backfillState !== undefined ? { backfill: backfillState } : {}),
          },
        });
        return;
      }

      // Constitutional: Withings weight is stored as kind "weight" with sourceId "withings".
      // Query weight events and filter to Withings-only so hasRecentData/lastMeasurementAt reflect device data, not manual.
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - RECENT_DAYS);
      const rawRes = await getRawEvents(token, {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        kinds: [WITHINGS_WEIGHT_KIND],
        limit: 50,
        ...optsUnique,
      });
      if (seq !== reqSeq.current) return;

      const rawOutcome = truthOutcomeFromApiResult(rawRes);
      if (rawOutcome.status !== "ready") {
        safeSet({
          status: "ready",
          data: {
            connected: true,
            lastMeasurementAt: null,
            hasRecentData: false,
            ...(backfillState !== undefined ? { backfill: backfillState } : {}),
          },
        });
        return;
      }

      const withingsOnly = rawOutcome.data.items.filter(
        (item) => item.sourceId === WITHINGS_SOURCE_ID,
      );
      const latest = withingsOnly.length > 0
        ? withingsOnly.reduce((a, b) => (a.observedAt > b.observedAt ? a : b)).observedAt
        : null;
      safeSet({
        status: "ready",
        data: {
          connected: true,
          lastMeasurementAt: latest,
          hasRecentData: withingsOnly.length > 0,
          ...(backfillState !== undefined ? { backfill: backfillState } : {}),
        },
      });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid]);

  return { ...state, refetch: fetchOnce };
}
