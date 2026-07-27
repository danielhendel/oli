/**
 * Composes shared readiness contributor history into a contributor detail VM.
 * Mount only while a detail sheet is open — one 90-day range serves all four metrics.
 */

import { useMemo } from "react";

import { buildReadinessContributorDetailViewModel } from "@/lib/data/readiness/buildReadinessContributorDetailViewModel";
import type { ReadinessContributorDetailMetric } from "@/lib/data/readiness/readinessContributorDetailTypes";
import { useReadinessContributorHistory } from "@/lib/data/readiness/useReadinessContributorHistory";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseReadinessContributorDetailOptions = {
  metric: ReadinessContributorDetailMetric;
  selectedDay: DayKey;
  enabled: boolean;
  /** Exact-day readiness view contributor score (already validated or raw). */
  currentScore: number | null | undefined;
};

export function useReadinessContributorDetail(opts: UseReadinessContributorDetailOptions) {
  const todayDayKey = getTodayDayKeyLocal();
  const historyEnabled = opts.enabled && opts.currentScore != null;
  const history = useReadinessContributorHistory({
    selectedDay: opts.selectedDay,
    todayDayKey,
    enabled: historyEnabled,
  });

  const vm = useMemo(
    () =>
      buildReadinessContributorDetailViewModel({
        metric: opts.metric,
        selectedDay: opts.selectedDay,
        todayDayKey,
        currentScore: opts.currentScore,
        dayByDay: history.dayByDay,
        historyStatus: historyEnabled ? history.status : "idle",
        historyErrorMessage: history.errorMessage,
      }),
    [
      opts.metric,
      opts.selectedDay,
      opts.currentScore,
      todayDayKey,
      historyEnabled,
      history.dayByDay,
      history.status,
      history.errorMessage,
    ],
  );

  return {
    vm,
    refetchHistory: history.refetch,
  };
}
