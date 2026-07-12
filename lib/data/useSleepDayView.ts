import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// TODO: Migrate Sleep detail to consume GET /users/me/sleep-night (SleepNight) for headline/key metrics when safe.

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getDailyFacts,
  getInsights,
  getOuraSleepView,
  type TruthGetOptions,
} from "@/lib/api/usersMe";
import type { DailyFactsDto, InsightsResponseDto, SleepViewDto } from "@oli/contracts";
import { isOuraViewAlignedToDay } from "@/lib/data/oura/isOuraViewAlignedToDay";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { dailyFactsHasSleepSignal } from "@/lib/data/sleep/sleepFactsSignal";

export type SleepDayViewState =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | {
      status: "oli";
      requestedDay: string;
      resolvedDay: string;
      facts: DailyFactsDto;
      sleep: NonNullable<DailyFactsDto["sleep"]>;
      insights: InsightsResponseDto | null;
      /** Oura vendor view for the same day when the API returns it; display-only (e.g. score compare). */
      vendorSleepView: SleepViewDto | null;
    }
  | { status: "oura_fallback"; data: SleepViewDto };

function emptyInsights(day: string): InsightsResponseDto {
  return { day, count: 0, items: [] };
}

function withUniqueCacheBust(opts: TruthGetOptions | undefined, seq: number): TruthGetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

/**
 * Sleep module read model: DailyFacts.sleep + Insights; Oura vendor view is fetched in parallel
 * for the Oli path (display-only compare) and is the primary read when pipeline sleep is absent.
 */
export function useSleepDayView(
  day: string,
): SleepDayViewState & { refetch: (opts?: TruthGetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const dayRef = useRef(day);
  dayRef.current = day;
  const requestSeq = useRef(0);
  const [state, setState] = useState<SleepDayViewState>({ status: "partial" });
  const stateRef = useRef<SleepDayViewState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: TruthGetOptions) => {
      const seq = ++requestSeq.current;
      const safeSet = (next: SleepDayViewState) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "oli" && stateRef.current.status !== "oura_fallback") {
          safeSet({ status: "partial" });
        }
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      if (stateRef.current.status !== "oli" && stateRef.current.status !== "oura_fallback") {
        safeSet({ status: "partial" });
      }

      const dayKey = dayRef.current;
      const bust = withUniqueCacheBust(opts, seq);

      const [factsRes, insightsRes, ouraParallelRes] = await Promise.all([
        getDailyFacts(dayKey, token, bust),
        getInsights(dayKey, token, bust),
        getOuraSleepView(dayKey, token, bust),
      ]);

      if (seq !== requestSeq.current) return;

      const factsOutcome = truthOutcomeFromApiResult(factsRes);
      const insightsOutcome = truthOutcomeFromApiResult(insightsRes);
      const ouraParallelOutcome = truthOutcomeFromApiResult(ouraParallelRes);

      const sleepForSignal = factsOutcome.status === "ready" ? factsOutcome.data.sleep : undefined;
      const hasSleepSignal = dailyFactsHasSleepSignal(sleepForSignal);

      if (__DEV__ && typeof process.env.JEST_WORKER_ID === "undefined") {
        // eslint-disable-next-line no-console -- privacy-safe sleep day view audit
        console.log("SLEEP_DEBUG", {
          operation: "sleep_day_view",
          hasDayKey: Boolean(dayKey),
          factsOutcome: factsOutcome.status,
          hasSleepSignal,
          hasScore: sleepForSignal?.oliSleepScore != null,
          hasMainSleepMinutes: typeof sleepForSignal?.mainSleepMinutes === "number",
          hasTotalMinutes: typeof sleepForSignal?.totalMinutes === "number",
          chosenStatus:
            factsOutcome.status === "ready" && hasSleepSignal
              ? "oli"
              : factsOutcome.status !== "ready"
                ? `skip_oura_pending_facts_${factsOutcome.status}`
                : "try_oura_fallback",
        });
      }

      if (factsOutcome.status === "ready" && hasSleepSignal) {
        const sleep = factsOutcome.data.sleep!;
        const insights =
          insightsOutcome.status === "ready"
            ? insightsOutcome.data
            : insightsOutcome.status === "missing"
              ? emptyInsights(dayKey)
              : null;
        const vendorSleepView =
          ouraParallelOutcome.status === "ready" ? ouraParallelOutcome.data : null;
        safeSet({
          status: "oli",
          requestedDay: dayKey,
          resolvedDay: dayKey,
          facts: factsOutcome.data,
          sleep,
          insights,
          vendorSleepView,
        });
        return;
      }

      if (ouraParallelOutcome.status === "ready") {
        const v = ouraParallelOutcome.data;
        if (isOuraViewAlignedToDay(v, dayKey)) {
          safeSet({ status: "oura_fallback", data: v });
          return;
        }
        safeSet({ status: "missing" });
        return;
      }

      if (ouraParallelOutcome.status === "missing") {
        safeSet({ status: "missing" });
        return;
      }

      safeSet({
        status: "error",
        error: ouraParallelOutcome.error,
        requestId: ouraParallelOutcome.requestId,
      });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
