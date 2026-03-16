// lib/data/useOuraPresence.ts — Oura presence: connected + lastSyncAt from status API.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getOuraStatus } from "@/lib/api/oura";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";
import {
  setOuraLastCheckedAt,
  setOuraLastKnownConnected,
  getOuraStatus404BackoffUntil,
  setOuraStatus404BackoffUntil,
} from "@/lib/integrations/oura/storage";

export type OuraBackfillStatus = "idle" | "running" | "completed" | "failed";

export type OuraPresence = {
  connected: boolean;
  lastSyncAt: string | null;
  lastRefreshAt?: string | null;
  lastSnapshotAt?: string | null;
  backfillStatus?: OuraBackfillStatus | null;
  backfillStartedAt?: string | null;
  backfillCompletedAt?: string | null;
  backfillFailedAt?: string | null;
  lastBackfillError?: string | null;
};

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: OuraPresence };

/** After 404 (endpoint missing / gateway not deployed), skip calling the API for this long to avoid hammering. */
const BACKOFF_MS_AFTER_404 = 5 * 60 * 1000;

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useOuraPresence(): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!user) {
        safeSet({
          status: "ready",
          data: {
            connected: false,
            lastSyncAt: null,
            lastRefreshAt: null,
            lastSnapshotAt: null,
            backfillStatus: null,
            backfillStartedAt: null,
            backfillCompletedAt: null,
            backfillFailedAt: null,
            lastBackfillError: null,
          },
        });
        void setOuraLastKnownConnected(false).catch(() => undefined);
        return;
      }

      if (initializing) {
        safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      const backoffUntil = await getOuraStatus404BackoffUntil();
      if (backoffUntil != null && backoffUntil > 0 && Date.now() < backoffUntil) {
        safeSet({
          status: "ready",
          data: {
            connected: false,
            lastSyncAt: null,
            lastRefreshAt: null,
            lastSnapshotAt: null,
            backfillStatus: null,
            backfillStartedAt: null,
            backfillCompletedAt: null,
            backfillFailedAt: null,
            lastBackfillError: null,
          },
        });
        return;
      }

      safeSet({ status: "partial" });
      const optsUnique = withUniqueCacheBust(opts, seq);
      const statusRes = await getOuraStatus(token, optsUnique);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(statusRes);
      if (outcome.status === "error") {
        safeSet({
          status: "error",
          error: outcome.error,
          requestId: outcome.requestId,
        });
        return;
      }
      if (outcome.status !== "ready") {
        if (statusRes.ok === false && statusRes.status === 404) {
          void setOuraStatus404BackoffUntil(Date.now() + BACKOFF_MS_AFTER_404).catch(() => undefined);
        }
        safeSet({
          status: "ready",
          data: {
            connected: false,
            lastSyncAt: null,
            lastRefreshAt: null,
            lastSnapshotAt: null,
            backfillStatus: null,
            backfillStartedAt: null,
            backfillCompletedAt: null,
            backfillFailedAt: null,
            lastBackfillError: null,
          },
        });
        void setOuraLastKnownConnected(false).catch(() => undefined);
        return;
      }

      void setOuraStatus404BackoffUntil(0).catch(() => undefined);
      try {
        await setOuraLastCheckedAt(new Date().toISOString());
      } catch {
        // best-effort
      }

      const {
        connected,
        lastSyncAt,
        lastRefreshAt,
        lastSnapshotAt,
        backfillStatus,
        backfillStartedAt,
        backfillCompletedAt,
        backfillFailedAt,
        lastBackfillError,
      } = outcome.data;
      const validBackfillStatus =
        backfillStatus === "idle" ||
        backfillStatus === "running" ||
        backfillStatus === "completed" ||
        backfillStatus === "failed"
          ? backfillStatus
          : null;
      safeSet({
        status: "ready",
        data: {
          connected,
          lastSyncAt,
          lastRefreshAt: lastRefreshAt ?? null,
          lastSnapshotAt: lastSnapshotAt ?? null,
          backfillStatus: validBackfillStatus ?? null,
          backfillStartedAt: backfillStartedAt ?? null,
          backfillCompletedAt: backfillCompletedAt ?? null,
          backfillFailedAt: backfillFailedAt ?? null,
          lastBackfillError: lastBackfillError ?? null,
        },
      });
      void setOuraLastKnownConnected(connected).catch(() => undefined);
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid]);

  return { ...state, refetch: fetchOnce };
}
