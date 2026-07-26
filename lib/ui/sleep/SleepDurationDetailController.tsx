/**
 * Mounted only while the Duration detail sheet is open.
 * Owns history + profile composition so DailySleepCard stays light when closed.
 */

import React from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { useSleepDurationDetail } from "@/lib/data/sleep/useSleepDurationDetail";
import { SleepDurationDetailSheet } from "@/lib/ui/sleep/SleepDurationDetailSheet";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepDurationDetailControllerProps = {
  selectedDay: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
  onClose: () => void;
};

export function SleepDurationDetailController({
  selectedDay,
  sleepNight,
  resolution = null,
  currentFormattedOverride = null,
  onClose,
}: SleepDurationDetailControllerProps): React.ReactElement {
  const { vm, refetchHistory } = useSleepDurationDetail({
    selectedDay,
    enabled: true,
    sleepNight,
    resolution,
    currentFormattedOverride,
  });

  return (
    <SleepDurationDetailSheet
      visible
      onClose={onClose}
      vm={vm}
      onRetryHistory={() => {
        refetchHistory({ cacheBust: `ui-${Date.now()}` });
      }}
    />
  );
}
