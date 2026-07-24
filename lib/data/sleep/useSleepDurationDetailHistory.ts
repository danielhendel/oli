/**
 * Bounded SleepNight history for Sleep Duration detail (30 inclusive days).
 *
 * One GET /users/me/sleep-nights request for [selectedDay−29, selectedDay].
 * No YTD. No separate 7-day request. Presentation must use the pure average VM.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SleepNightViewDto } from "@oli/contracts";

import { getSleepNightsRange } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT,
  sleepDurationDetailHistoryDayKeys,
} from "@/lib/data/sleep/sleepDurationAverages";
import type { SleepDurationDetailHistoryStatus } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseSleepDurationDetailHistoryResult = {
  status: SleepDurationDetailHistoryStatus;
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  errorMessage: string | null;
  refetch: (opts?: { cacheBust?: string }) => void;
  rangeStart: DayKey | null;
  rangeEnd: DayKey | null;
};

function cellFromRangeNight(view: SleepNightViewDto | undefined): WeeklyFitnessSleepNightCell {
  if (view == null) return { settled: true };
  if (view.resolution === "latest_completed_prior_night") return { settled: true };
  return { settled: true, view };
}

export type UseSleepDurationDetailHistoryOptions = {
  selectedDay: DayKey;
  /** Device today — caps future days out of the requested window. */
  todayDayKey: DayKey;
  enabled?: boolean;
};

/**
 * Fetches a single bounded 30-day SleepNight range ending on `selectedDay`
 * (clamped so the end is never after device today).
 */
export function useSleepDurationDetailHistory(
  opts: UseSleepDurationDetailHistoryOptions,
): UseSleepDurationDetailHistoryResult {
  const { selectedDay, todayDayKey, enabled = true } = opts;
  const { user, initializing, getIdToken } = useAuth();

  const endDay = selectedDay <= todayDayKey ? selectedDay : todayDayKey;
  const startDay = addCalendarDaysToDayKey(endDay, -(SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT - 1));
  const dayKeys = useMemo(
    () => sleepDurationDetailHistoryDayKeys(endDay).filter((d) => d <= todayDayKey),
    [endDay, todayDayKey],
  );

  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [status, setStatus] = useState<SleepDurationDetailHistoryStatus>("idle");
  const [sleepNightByDay, setSleepNightByDay] = useState<
    Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRange = useCallback(
    async (cacheBust?: string) => {
      const seq = ++requestSeq.current;
      const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

      if (!enabled) {
        if (seq === requestSeq.current) {
          setStatus("idle");
          setSleepNightByDay({});
          setErrorMessage(null);
        }
        return;
      }

      if (init || !userUid) {
        if (seq === requestSeq.current) {
          setStatus("idle");
          setSleepNightByDay({});
          setErrorMessage(null);
        }
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      const token = await getToken(false);
      if (seq !== requestSeq.current) return;
      if (!token) {
        setStatus("error");
        setErrorMessage("Could not load recent sleep averages.");
        return;
      }

      try {
        const res = await getSleepNightsRange(
          startDay,
          endDay,
          token,
          cacheBust ? { cacheBust: `${cacheBust}:${startDay}:${endDay}` } : undefined,
        );
        if (seq !== requestSeq.current) return;

        const outcome = truthOutcomeFromApiResult(res);
        if (outcome.status !== "ready") {
          setStatus("error");
          setErrorMessage("Could not load recent sleep averages.");
          setSleepNightByDay({});
          return;
        }

        const byRequested = new Map<string, SleepNightViewDto>();
        for (const night of outcome.data.nights) {
          byRequested.set(night.requestedDay, night);
        }
        const next: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
        for (const day of dayKeys) {
          next[day] = cellFromRangeNight(byRequested.get(day));
        }
        setSleepNightByDay(next);
        setStatus("ready");
        setErrorMessage(null);
      } catch {
        if (seq !== requestSeq.current) return;
        setStatus("error");
        setErrorMessage("Could not load recent sleep averages.");
        setSleepNightByDay({});
      }
    },
    [dayKeys, enabled, endDay, startDay],
  );

  useEffect(() => {
    void fetchRange();
  }, [fetchRange, user?.uid, selectedDay, enabled]);

  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      void fetchRange(opts?.cacheBust ?? `retry-${Date.now()}`);
    },
    [fetchRange],
  );

  return {
    status,
    sleepNightByDay,
    errorMessage,
    refetch,
    rangeStart: enabled ? startDay : null,
    rangeEnd: enabled ? endDay : null,
  };
}
