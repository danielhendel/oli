/**
 * Mounted only while the Sleep Efficiency detail sheet is open.
 * Owns history composition so DailySleepCard stays light when closed.
 */

import React from "react";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { useSleepEfficiencyDetail } from "@/lib/data/sleep/useSleepEfficiencyDetail";
import { SleepEfficiencyDetailSheet } from "@/lib/ui/sleep/SleepEfficiencyDetailSheet";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepEfficiencyDetailControllerProps = {
  selectedDay: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  currentFormattedOverride?: string | null | undefined;
  onClose: () => void;
};

export function SleepEfficiencyDetailController({
  selectedDay,
  sleepNight,
  resolution = null,
  currentFormattedOverride = null,
  onClose,
}: SleepEfficiencyDetailControllerProps): React.ReactElement {
  const { vm, refetchHistory } = useSleepEfficiencyDetail({
    selectedDay,
    enabled: true,
    sleepNight,
    resolution,
    currentFormattedOverride,
  });

  return (
    <SleepEfficiencyDetailSheet
      visible
      onClose={onClose}
      vm={vm}
      onRetryHistory={() => {
        refetchHistory({ cacheBust: `ui-${Date.now()}` });
      }}
    />
  );
}
