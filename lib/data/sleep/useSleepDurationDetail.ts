/**
 * Composes profile age + bounded SleepNight history into a Duration detail VM.
 * Call from card/container layers — not from presentation-only sheet JSX with direct API.
 */

import { useMemo } from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { buildSleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { useSleepDurationDetailHistory } from "@/lib/data/sleep/useSleepDurationDetailHistory";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseSleepDurationDetailOptions = {
  selectedDay: DayKey;
  enabled: boolean;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
};

export function useSleepDurationDetail(opts: UseSleepDurationDetailOptions) {
  const todayDayKey = getTodayDayKeyLocal();
  const { state: profileState } = useUserProfileMain();
  const history = useSleepDurationDetailHistory({
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
      buildSleepDurationDetailViewModel({
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
