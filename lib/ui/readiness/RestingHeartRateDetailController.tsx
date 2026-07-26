/**
 * Mounted only while the Resting Heart Rate detail sheet is open.
 * Owns history composition so DailyReadinessCard stays light when closed.
 */

import React from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { useRestingHeartRateDetail } from "@/lib/data/readiness/useRestingHeartRateDetail";
import { RestingHeartRateDetailSheet } from "@/lib/ui/readiness/RestingHeartRateDetailSheet";
import type { DayKey } from "@/lib/ui/calendar/types";

export type RestingHeartRateDetailControllerProps = {
  selectedDay: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
  onClose: () => void;
};

export function RestingHeartRateDetailController({
  selectedDay,
  sleepNight,
  resolution = null,
  currentFormattedOverride = null,
  onClose,
}: RestingHeartRateDetailControllerProps): React.ReactElement {
  const { vm, refetchHistory } = useRestingHeartRateDetail({
    selectedDay,
    enabled: true,
    sleepNight,
    resolution,
    currentFormattedOverride,
  });

  return (
    <RestingHeartRateDetailSheet
      visible
      onClose={onClose}
      vm={vm}
      onRetryHistory={() => {
        refetchHistory({ cacheBust: `ui-${Date.now()}` });
      }}
    />
  );
}
