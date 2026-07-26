/**
 * Mounted only while a Deep or REM detail sheet is open.
 * Owns history composition so DailySleepCard stays light when closed.
 */

import React from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { useSleepStageDetail } from "@/lib/data/sleep/useSleepStageDetail";
import type { SleepStageMetricId } from "@/lib/data/sleep/sleepStageMetric";
import { SleepStageDetailSheet } from "@/lib/ui/sleep/SleepStageDetailSheet";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepStageDetailControllerProps = {
  metricId: SleepStageMetricId;
  selectedDay: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
  onClose: () => void;
};

export function SleepStageDetailController({
  metricId,
  selectedDay,
  sleepNight,
  resolution = null,
  currentFormattedOverride = null,
  onClose,
}: SleepStageDetailControllerProps): React.ReactElement {
  const { vm, refetchHistory } = useSleepStageDetail({
    metricId,
    selectedDay,
    enabled: true,
    sleepNight,
    resolution,
    currentFormattedOverride,
  });

  return (
    <SleepStageDetailSheet
      visible
      onClose={onClose}
      vm={vm}
      onRetryHistory={() => {
        refetchHistory({ cacheBust: `ui-${Date.now()}` });
      }}
    />
  );
}
