/**
 * Mounted only while a readiness contributor detail sheet is open.
 * Owns shared 90-day history composition so DailyReadinessCard stays light when closed.
 * One bounded range request is reused across HRV Balance, Body Temperature,
 * Recovery Index, and Sleep Balance via the shared store.
 */

import React from "react";

import { useReadinessContributorDetail } from "@/lib/data/readiness/useReadinessContributorDetail";
import type { ReadinessContributorDetailMetric } from "@/lib/data/readiness/readinessContributorDetailTypes";
import { ReadinessContributorDetailSheet } from "@/lib/ui/readiness/ReadinessContributorDetailSheet";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ReadinessContributorDetailControllerProps = {
  metric: ReadinessContributorDetailMetric;
  selectedDay: DayKey;
  /** Exact-day readiness view contributor score. */
  currentScore: number | null | undefined;
  onClose: () => void;
};

export function ReadinessContributorDetailController({
  metric,
  selectedDay,
  currentScore,
  onClose,
}: ReadinessContributorDetailControllerProps): React.ReactElement {
  const { vm, refetchHistory } = useReadinessContributorDetail({
    metric,
    selectedDay,
    enabled: true,
    currentScore,
  });

  return (
    <ReadinessContributorDetailSheet
      visible
      onClose={onClose}
      vm={vm}
      onRetryHistory={() => {
        refetchHistory({ cacheBust: `ui-${Date.now()}` });
      }}
      testID={`readiness-contributor-detail-${metric}`}
    />
  );
}
