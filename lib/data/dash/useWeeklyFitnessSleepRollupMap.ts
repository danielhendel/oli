import { useMemo } from "react";

import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeeklyFitnessSleepRollupHookState = {
  status: "partial" | "ready";
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  isRefreshing: boolean;
  refetch: (opts?: { cacheBust?: string }) => void;
};

/**
 * Fetches GET /users/me/sleep-night for elapsed week days only (no future days).
 * Uses the same attribution rules as Dash Daily Sleep; incomplete nights are omitted from averages.
 */
export function useWeeklyFitnessSleepRollupMap(
  weekDayKeys: readonly DayKey[],
): WeeklyFitnessSleepRollupHookState {
  const rollup = useSleepNightRollupMap(weekDayKeys);
  return useMemo(
    () => ({
      status: rollup.status,
      sleepNightByDay: rollup.sleepNightByDay,
      isRefreshing: rollup.isRefreshing,
      refetch: rollup.refetch,
    }),
    [rollup.isRefreshing, rollup.refetch, rollup.sleepNightByDay, rollup.status],
  );
}
