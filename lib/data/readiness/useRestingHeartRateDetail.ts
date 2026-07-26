/**
 * Composes bounded SleepNight history into a Resting Heart Rate detail VM.
 * Call from card/container layers — not from presentation-only sheet JSX with direct API.
 */

import { useMemo } from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { buildRestingHeartRateDetailViewModel } from "@/lib/data/readiness/buildRestingHeartRateDetailViewModel";
import { useSleepMetricDetailHistory } from "@/lib/data/sleep/useSleepMetricDetailHistory";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseRestingHeartRateDetailOptions = {
  selectedDay: DayKey;
  enabled: boolean;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
};

export function useRestingHeartRateDetail(opts: UseRestingHeartRateDetailOptions) {
  const todayDayKey = getTodayDayKeyLocal();
  const history = useSleepMetricDetailHistory({
    selectedDay: opts.selectedDay,
    todayDayKey,
    enabled: opts.enabled,
  });

  const vm = useMemo(
    () =>
      buildRestingHeartRateDetailViewModel({
        selectedDay: opts.selectedDay,
        todayDayKey,
        sleepNight: opts.sleepNight,
        resolution: opts.resolution ?? null,
        currentFormattedOverride: opts.currentFormattedOverride ?? null,
        sleepNightByDay: history.sleepNightByDay,
        historyStatus: opts.enabled ? history.status : "idle",
        historyErrorMessage: history.errorMessage,
      }),
    [
      opts.selectedDay,
      opts.sleepNight,
      opts.resolution,
      opts.currentFormattedOverride,
      opts.enabled,
      todayDayKey,
      history.sleepNightByDay,
      history.status,
      history.errorMessage,
    ],
  );

  return {
    vm,
    refetchHistory: history.refetch,
  };
}
