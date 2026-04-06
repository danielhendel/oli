// lib/data/dash/useDashRecapData.ts
import { useMemo } from "react";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useWorkoutDaySummaryForDay } from "@/lib/data/dash/useWorkoutDaySummaryForDay";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  buildDashRecapPlaceholderRows,
  buildDashRecapRows,
  dashRecapRowsAllPlaceholders,
  mergeCardioSessionsIntoDashRecapRows,
  type DashRecapCardioSessionsMerge,
  type DashRecapRow,
  type DashRecapViewModel,
} from "@/lib/data/dash/dashRecapViewModel";

/**
 * Yesterday's calendar key (device-local day anchor + repo UTC calendar shift; see dateUtils).
 */
export function getYesterdayDayKeyLocal(): string {
  return addCalendarDaysToDayKey(getTodayDayKeyLocal(), -1);
}

export function useDashRecapData(): DashRecapViewModel {
  const yesterdayKey = getYesterdayDayKeyLocal();
  const factsState = useDailyFacts(yesterdayKey);
  const workoutSummaryState = useWorkoutDaySummaryForDay(yesterdayKey);
  const { state: prefState } = usePreferences();
  const massUnit = prefState.preferences?.units?.mass ?? "lb";

  return useMemo((): DashRecapViewModel => {
    const summaryLoading = workoutSummaryState.status === "partial";
    const factsLoading = factsState.status === "partial";

    if (factsLoading || summaryLoading) {
      return { kind: "loading" };
    }

    if (factsState.status === "error") {
      return {
        kind: "error",
        message: factsState.error,
        requestId: factsState.requestId,
        retry: () => {
          void factsState.refetch();
          void workoutSummaryState.refetch();
        },
      };
    }

    const cardioMerge: DashRecapCardioSessionsMerge =
      workoutSummaryState.status === "ready"
        ? { kind: "ready", count: workoutSummaryState.data.cardioSessionCount }
        : { kind: "unavailable" };

    const buildMergedRows = (factRows: readonly DashRecapRow[]) =>
      mergeCardioSessionsIntoDashRecapRows(factRows, cardioMerge);

    if (factsState.status === "missing") {
      const factRows = buildDashRecapPlaceholderRows();
      return {
        kind: "missing_doc",
        dayKey: yesterdayKey,
        rows: buildMergedRows(factRows),
      };
    }

    const factRows = buildDashRecapRows({ facts: factsState.data, massUnit });
    const allFactsPlaceholder = dashRecapRowsAllPlaceholders(factRows);

    if (allFactsPlaceholder && cardioMerge.kind === "unavailable") {
      return {
        kind: "empty",
        dayKey: yesterdayKey,
        rows: buildMergedRows(factRows),
      };
    }

    return {
      kind: "ready",
      dayKey: yesterdayKey,
      rows: buildMergedRows(factRows),
    };
  }, [factsState, massUnit, workoutSummaryState, yesterdayKey]);
}
