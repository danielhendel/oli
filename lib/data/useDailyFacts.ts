// lib/data/useDailyFacts.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { logDataHookTiming } from "@/lib/dev/logDataHookTiming";
import {
  getDailyFactsSessionCached,
  subscribeDailyFactsInvalidations,
} from "@/lib/data/dailyFactsSessionCache";

type State =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DailyFactsDto };

type RefetchOpts = TruthGetOptions;

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;

  // Ensure every call is unique even if caller passes the same refreshKey repeatedly.
  // exactOptionalPropertyTypes-safe: omit cacheBust when not present
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type UseDailyFactsOptions = {
  /** When false, skips network request (e.g. tab not focused). Default true. */
  enabled?: boolean;
};

export function useDailyFacts(
  day: string,
  options?: UseDailyFactsOptions,
): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = options?.enabled ?? true;

  const dayRef = useRef(day);
  dayRef.current = day;

  const requestSeq = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++requestSeq.current;

      const safeSet = (next: State) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (!enabledRef.current) {
        safeSet({ status: "missing" });
        return;
      }

      if (initializing || !user) {
        // keep any existing ready state (no flicker)
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      // SWR: do not drop ready data to loading on refetch
      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      const t0 = __DEV__ ? performance.now() : 0;
      if (__DEV__) {
        logDataHookTiming("useDailyFacts", "start", { userAvailable: Boolean(user) });
      }

      const res = await getDailyFactsSessionCached({
        userUid: user.uid,
        day: dayRef.current,
        token,
        ...(optsUnique ? { opts: optsUnique } : {}),
      });
      if (seq !== requestSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (__DEV__) {
        logDataHookTiming("useDailyFacts", "end", {
          durationMs: Math.round(performance.now() - t0),
          userAvailable: Boolean(user),
          status: outcome.status,
          resultApprox: outcome.status === "ready" ? "ready" : outcome.status,
        });
      }

      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }

      if (outcome.status === "missing") {
        // Important: missing derived truth is NOT computed truth.
        // If we already have a real ready doc, keep it during refresh to avoid a trust-regression flicker.
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "missing" });
        return;
      }

      // outcome.status === "error"
      // If we already have ready data, keep it rather than flickering to an error card mid-refresh.
      if (stateRef.current.status === "ready") return;

      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void fetchOnce();
  }, [enabled, fetchOnce, day, user?.uid]);

  // Refetch when the dailyFactsSessionCache is invalidated for this (uid, day).
  // Triggered after Apple Health steps / body sync ingest lands its backend recompute,
  // so persisted `dailyFacts.activity.steps` and `dailyFacts.energy.factors.steps`
  // are picked up without waiting for screen refocus.
  useEffect(() => {
    if (!enabled) return undefined;
    const uid = user?.uid;
    if (!uid) return undefined;
    return subscribeDailyFactsInvalidations((ev) => {
      if (ev.userUid !== uid) return;
      if (ev.day !== dayRef.current) return;
      void fetchOnce({ cacheBust: `dailyFactsInvalidated:${ev.day}` });
    });
  }, [enabled, fetchOnce, user?.uid]);

  return useMemo(
    () => ({
      ...state,
      refetch: fetchOnce,
    }),
    [state, fetchOnce],
  );
}
