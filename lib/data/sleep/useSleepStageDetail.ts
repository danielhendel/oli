/**
 * Composes profile age + bounded SleepNight history into a Deep / REM stage detail VM.
 * Call from card/container layers — not from presentation-only sheet JSX with direct API.
 */

import { useMemo } from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { buildSleepStageDetailViewModel } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import type { SleepStageMetricId } from "@/lib/data/sleep/sleepStageMetric";
import { useSleepMetricDetailHistory } from "@/lib/data/sleep/useSleepMetricDetailHistory";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseSleepStageDetailOptions = {
  metricId: SleepStageMetricId;
  selectedDay: DayKey;
  enabled: boolean;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
};

export function useSleepStageDetail(opts: UseSleepStageDetailOptions) {
  const todayDayKey = getTodayDayKeyLocal();
  const { state: profileState } = useUserProfileMain();
  const history = useSleepMetricDetailHistory({
    selectedDay: opts.selectedDay,
    todayDayKey,
    enabled: opts.enabled,
  });

  const dateOfBirth =
    profileState.status === "ready" || profileState.status === "partial"
      ? profileState.profile?.identity.dateOfBirth ?? null
      : null;

  const vm = useMemo(
    () =>
      buildSleepStageDetailViewModel({
        metricId: opts.metricId,
        selectedDay: opts.selectedDay,
        todayDayKey,
        sleepNight: opts.sleepNight,
        resolution: opts.resolution ?? null,
        currentFormattedOverride: opts.currentFormattedOverride ?? null,
        dateOfBirth,
        sleepNightByDay: history.sleepNightByDay,
        historyStatus: opts.enabled ? history.status : "idle",
        historyErrorMessage: history.errorMessage,
      }),
    [
      opts.metricId,
      opts.selectedDay,
      opts.sleepNight,
      opts.resolution,
      opts.currentFormattedOverride,
      opts.enabled,
      todayDayKey,
      dateOfBirth,
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
