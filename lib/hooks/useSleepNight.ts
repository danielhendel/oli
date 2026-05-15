import { useCallback, useEffect, useRef, useState } from "react";

import { getSleepNight, type TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { SleepNightViewDto } from "@oli/contracts";

export type UseSleepNightOptions = {
  enabled?: boolean;
};

export type UseSleepNightResult = {
  /** Latest successful view; cleared on 404 missing; unchanged on transient errors. */
  view: SleepNightViewDto | undefined;
  loading: boolean;
  settled: boolean;
  error: string | null;
  refetch: (opts?: TruthGetOptions) => void;
};

/**
 * Canonical sleep night for a calendar day (`GET /users/me/sleep-night`).
 * Server applies bounded physiological resolution (exact anchor, wake-day, then latest complete prior night).
 * Keeps the prior successful `view` while `loading` is true so Dash does not flicker.
 */
export function useSleepNight(day: string, options?: UseSleepNightOptions): UseSleepNightResult {
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

  const [view, setView] = useState<SleepNightViewDto | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(undefined);
    setSettled(false);
    setLoading(true);
    setError(null);
  }, [day]);

  const runFetch = useCallback(
    async (myGen: number, bust?: TruthGetOptions) => {
      if (!enabledRef.current) {
        if (myGen === generationRef.current) {
          setLoading(false);
          setSettled(true);
          setView(undefined);
          setError(null);
        }
        return;
      }

      if (initializingRef.current || !hasUserRef.current) {
        if (myGen === generationRef.current) {
          setLoading(false);
          setSettled(true);
          setView(undefined);
          setError(null);
        }
        return;
      }

      const token = await getIdTokenRef.current(false);
      if (!token) {
        if (myGen === generationRef.current) {
          setLoading(false);
          setSettled(true);
          setError(null);
        }
        return;
      }

      if (myGen !== generationRef.current) return;

      setLoading(true);

      const res = await getSleepNight(dayRef.current, token, bust);
      if (myGen !== generationRef.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        setView(outcome.data);
        setError(null);
      } else if (outcome.status === "missing") {
        setView(undefined);
        setError(null);
      } else {
        setError(outcome.error);
      }

      setLoading(false);
      setSettled(true);
    },
    [],
  );

  useEffect(() => {
    const myGen = ++generationRef.current;
    void runFetch(myGen);
  }, [day, enabled, initializing, user, runFetch]);

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      const myGen = ++generationRef.current;
      void runFetch(myGen, opts);
    },
    [runFetch],
  );

  return {
    view,
    loading,
    settled,
    error,
    refetch,
  };
}
