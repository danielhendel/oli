import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOuraReadinessView, getOuraSleepView, type TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { ReadinessViewDto, SleepViewDto } from "@oli/contracts";

function withUniqueCacheBust(opts: TruthGetOptions | undefined, seq: number): TruthGetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export type DashOuraViewsState = {
  sleepView: SleepViewDto | undefined;
  readinessView: ReadinessViewDto | undefined;
  /** True until the Oura sleep view request settles (ready, missing, or error). */
  sleepViewLoading: boolean;
  /** True until the Oura readiness view request settles. */
  readinessViewLoading: boolean;
  /**
   * True until both Oura view requests have settled.
   * Prefer `sleepViewLoading` for Daily Sleep so readiness latency does not block sleep score.
   */
  loading: boolean;
  refetch: (opts?: TruthGetOptions) => void;
};

export type UseDashOuraViewsOptions = {
  /** When false, skips network and clears views; loading flags are false (idle / disabled). */
  enabled?: boolean;
};

/**
 * Parallel Oura vendor views for Dash (sleep + readiness snapshots; Daily Sleep card uses sleep only).
 * Sleep and readiness are fetched independently so a slow readiness call never blocks
 * `GET /users/me/oura-sleep-view` or `sleepView` updates.
 * Errors are non-fatal: views stay undefined so the card can still render DailyFacts-only.
 */
export function useDashOuraViews(day: string, options?: UseDashOuraViewsOptions): DashOuraViewsState {
  const enabled = options?.enabled ?? true;
  const { user, initializing, getIdToken } = useAuth();
  const dayRef = useRef(day);
  dayRef.current = day;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const initializingRef = useRef(initializing);
  initializingRef.current = initializing;
  const hasUserRef = useRef(Boolean(user));
  hasUserRef.current = Boolean(user);
  const getIdTokenRef = useRef(getIdToken);
  getIdTokenRef.current = getIdToken;

  const generationRef = useRef(0);
  const prevDayUidRef = useRef<{ day: string; uid: string | undefined } | null>(null);

  const [sleepView, setSleepView] = useState<SleepViewDto | undefined>(undefined);
  const [readinessView, setReadinessView] = useState<ReadinessViewDto | undefined>(undefined);
  const [sleepViewLoading, setSleepViewLoading] = useState(true);
  const [readinessViewLoading, setReadinessViewLoading] = useState(true);
  const sleepErrorRef = useRef<string | undefined>(undefined);
  const readinessErrorRef = useRef<string | undefined>(undefined);

  const runFetch = useCallback(async (myGen: number, bustOpts?: TruthGetOptions) => {
    if (!enabledRef.current) return;

    const dayKey = dayRef.current;

    if (initializingRef.current || !hasUserRef.current) {
      if (myGen === generationRef.current) {
        setSleepView(undefined);
        setReadinessView(undefined);
        setSleepViewLoading(false);
        setReadinessViewLoading(false);
      }
      return;
    }

    const token = await getIdTokenRef.current(false);
    if (!token) {
      if (myGen === generationRef.current) {
        setSleepViewLoading(false);
        setReadinessViewLoading(false);
      }
      return;
    }

    if (myGen !== generationRef.current) return;

    setSleepViewLoading(true);
    setReadinessViewLoading(true);

    const bust = withUniqueCacheBust(bustOpts, myGen);

    if (__DEV__) {
      // eslint-disable-next-line no-console -- Dash Oura sleep fetch audit (dev-only, privacy-safe)
      console.log("[DASH_OURA_SLEEP_FETCH_START]", {
        operation: "dash_oura_sleep_fetch_start",
        hasDayKey: Boolean(dayKey),
        enabled: enabledRef.current,
      });
    }

    let devSleepDone: Record<string, unknown> | null = null;

    void getOuraSleepView(dayKey, token, bust)
      .then((sleepRes) => {
        const sleepOutcome = truthOutcomeFromApiResult(sleepRes);
        sleepErrorRef.current = sleepOutcome.status === "error" ? sleepOutcome.error : undefined;
        const ready = sleepOutcome.status === "ready" ? sleepOutcome.data : undefined;
        devSleepDone = {
          ok: sleepRes.ok,
          outcome: sleepOutcome.status,
          hasRequestedDay: Boolean(ready?.requestedDay),
          requestedDayMatches: ready?.requestedDay === dayKey,
          hasResolvedDay: Boolean(ready?.resolvedDay),
          hasScore: typeof ready?.score === "number" && Number.isFinite(ready.score),
          hasError: sleepOutcome.status === "error",
        };
        if (myGen !== generationRef.current) return;
        setSleepView(sleepOutcome.status === "ready" ? sleepOutcome.data : undefined);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        devSleepDone = {
          ok: false,
          outcome: "error",
          hasError: true,
        };
        sleepErrorRef.current = message;
        if (myGen === generationRef.current) setSleepView(undefined);
      })
      .finally(() => {
        if (__DEV__) {
          const stale = myGen !== generationRef.current;
          const d = devSleepDone;
          // eslint-disable-next-line no-console -- Dash Oura sleep fetch audit (dev-only, privacy-safe)
          console.log("[DASH_OURA_SLEEP_FETCH_DONE]", {
            operation: "dash_oura_sleep_fetch_done",
            hasDayKey: Boolean(dayKey),
            ok: Boolean(d?.ok),
            outcome: typeof d?.outcome === "string" ? d.outcome : "incomplete",
            hasRequestedDay: Boolean(d?.hasRequestedDay),
            requestedDayMatches: Boolean(d?.requestedDayMatches),
            hasResolvedDay: Boolean(d?.hasResolvedDay),
            hasScore: Boolean(d?.hasScore),
            hasError: Boolean(d?.hasError),
            cancelled: stale,
            stale,
          });
        }
        if (myGen === generationRef.current) setSleepViewLoading(false);
      });

    void getOuraReadinessView(dayKey, token, bust)
      .then((readinessRes) => {
        if (myGen !== generationRef.current) return;
        const readinessOutcome = truthOutcomeFromApiResult(readinessRes);
        readinessErrorRef.current =
          readinessOutcome.status === "error" ? readinessOutcome.error : undefined;
        setReadinessView(readinessOutcome.status === "ready" ? readinessOutcome.data : undefined);
      })
      .catch((e: unknown) => {
        readinessErrorRef.current = e instanceof Error ? e.message : String(e);
        if (myGen === generationRef.current) setReadinessView(undefined);
      })
      .finally(() => {
        if (myGen === generationRef.current) setReadinessViewLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      generationRef.current += 1;
      setSleepView(undefined);
      setReadinessView(undefined);
      setSleepViewLoading(false);
      setReadinessViewLoading(false);
      sleepErrorRef.current = undefined;
      readinessErrorRef.current = undefined;
      prevDayUidRef.current = null;
      return;
    }

    const prev = prevDayUidRef.current;
    const uid = user?.uid;
    const dayUidChanged = prev == null || prev.day !== day || prev.uid !== uid;
    if (dayUidChanged) {
      prevDayUidRef.current = { day, uid };
      setSleepView(undefined);
      setReadinessView(undefined);
      sleepErrorRef.current = undefined;
      readinessErrorRef.current = undefined;
    }

    generationRef.current += 1;
    const myGen = generationRef.current;
    void runFetch(myGen);
  }, [day, user?.uid, enabled, runFetch]);

  const refetch = useCallback((opts?: TruthGetOptions) => {
    if (!enabledRef.current) return;
    generationRef.current += 1;
    const myGen = generationRef.current;
    void runFetch(myGen, opts);
  }, [runFetch]);

  const loading = sleepViewLoading || readinessViewLoading;

  useEffect(() => {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console -- Dash Oura views audit (dev-only, privacy-safe)
    console.log("[DASH_OURA_VIEWS_DEBUG]", {
      operation: "dash_oura_views",
      hasDayKey: Boolean(day),
      enabled,
      sleepViewLoading,
      readinessViewLoading,
      hasSleepView: sleepView != null,
      sleepRequestedDayMatches: sleepView?.requestedDay === day,
      hasSleepResolvedDay: Boolean(sleepView?.resolvedDay),
      hasSleepScore: typeof sleepView?.score === "number" && Number.isFinite(sleepView.score),
      hasSleepError: Boolean(sleepErrorRef.current),
      hasReadinessError: Boolean(readinessErrorRef.current),
    });
  }, [
    day,
    enabled,
    sleepViewLoading,
    readinessViewLoading,
    sleepView,
  ]);

  return useMemo(
    () => ({
      sleepView,
      readinessView,
      sleepViewLoading,
      readinessViewLoading,
      loading,
      refetch,
    }),
    [sleepView, readinessView, sleepViewLoading, readinessViewLoading, loading, refetch],
  );
}
