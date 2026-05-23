/**
 * Phase 2B — Selects {@link DailyFactsDto.activity.stepsAllocation} (and the matching
 * `activity.steps` total) for the current local calendar day.
 *
 * Pure projection over {@link useDailyFacts}: no formatting, no aggregation, no Firebase/API
 * calls of its own. Used by {@link useActivityOverviewScreenData} to decide whether DailyFacts
 * is the authority for the Today headline and to drive the allocation rows on Activity Today.
 *
 * Status mapping mirrors {@link useDailyFacts}: `partial` (loading), `missing` (no DailyFacts
 * doc yet), `error` (fetch error), `ready` (DailyFacts available — allocation may still be
 * undefined for fail-closed days).
 */

import { useMemo } from "react";

import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Allocation buckets the UI consumes (display-only projection, no `modelVersion` or inputs). */
export type ActivityTodayStepsAllocationBuckets = {
  neatSteps: number;
  strengthSteps: number;
  cardioSteps: number;
};

export type ActivityTodayStepsAllocationState =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error" }
  | {
      status: "ready";
      /** Present only when DailyFacts.activity.stepsAllocation exists (backend fail-closed). */
      allocation: ActivityTodayStepsAllocationBuckets | undefined;
      /** DailyFacts.activity.steps when numeric; undefined otherwise. */
      allocationTotalSteps: number | undefined;
    };

export type UseActivityTodayStepsAllocationOptions = {
  /** Forwarded to {@link useDailyFacts}. When false the hook returns `partial`. Default true. */
  enabled?: boolean;
};

function selectAllocationBuckets(
  facts: DailyFactsDto,
): ActivityTodayStepsAllocationBuckets | undefined {
  const a = facts.activity?.stepsAllocation;
  if (a == null) return undefined;
  return {
    neatSteps: a.neatSteps,
    strengthSteps: a.strengthSteps,
    cardioSteps: a.cardioSteps,
  };
}

function selectTotalSteps(facts: DailyFactsDto): number | undefined {
  const s = facts.activity?.steps;
  return typeof s === "number" && Number.isFinite(s) && s >= 0 ? s : undefined;
}

export function useActivityTodayStepsAllocation(
  todayDayKey: DayKey,
  options?: UseActivityTodayStepsAllocationOptions,
): ActivityTodayStepsAllocationState {
  const enabled = options?.enabled ?? true;
  const dailyFacts = useDailyFacts(todayDayKey, { enabled });

  return useMemo<ActivityTodayStepsAllocationState>(() => {
    switch (dailyFacts.status) {
      case "partial":
        return { status: "partial" };
      case "missing":
        return { status: "missing" };
      case "error":
        return { status: "error" };
      case "ready":
        return {
          status: "ready",
          allocation: selectAllocationBuckets(dailyFacts.data),
          allocationTotalSteps: selectTotalSteps(dailyFacts.data),
        };
      default: {
        const _exhaustive: never = dailyFacts;
        void _exhaustive;
        return { status: "missing" };
      }
    }
  }, [dailyFacts]);
}
