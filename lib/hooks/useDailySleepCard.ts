import { useMemo } from "react";

import {
  buildDailySleepCardViewModel,
  sleepNightIsAttributedToCalendarDay,
  type DailySleepCardViewModel,
} from "@/lib/data/dash/dailySleepCardViewModel";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import type { DayKey } from "@/lib/ui/calendar/types";

import type { TruthGetOptions } from "@/lib/api/usersMe";

export type DailySleepCardTruthDebug = {
  blockedStale: boolean;
  sleepSettled: boolean;
  sleepResolution: string | null;
  sleepRequestedDay: string | null;
};

export type UseDailySleepCardResult = {
  vm: DailySleepCardViewModel;
  refetch: (opts?: TruthGetOptions) => void;
  truthDebug: DailySleepCardTruthDebug;
};

/**
 * Dash Daily Sleep truth boundary: `GET /users/me/sleep-night` + calendar-day guards.
 * Never surfaces bounded prior-night fallback or sticky prior-day UI state as today's truth.
 */
export function useDailySleepCard(day: DayKey, options?: { enabled?: boolean }): UseDailySleepCardResult {
  const enabled = options?.enabled ?? true;
  const sleepNight = useSleepNight(day, { enabled });

  const vm = useMemo(
    () => buildDailySleepCardViewModel({ day, sleepNight }),
    [day, sleepNight.view, sleepNight.loading, sleepNight.settled, sleepNight.error],
  );

  const truthDebug = useMemo((): DailySleepCardTruthDebug => {
    const blockedStale =
      sleepNight.settled &&
      sleepNight.view != null &&
      !sleepNightIsAttributedToCalendarDay(day, sleepNight.view);
    return {
      blockedStale,
      sleepSettled: sleepNight.settled,
      sleepResolution: sleepNight.view?.resolution ?? null,
      sleepRequestedDay: sleepNight.view?.requestedDay ?? null,
    };
  }, [day, sleepNight.settled, sleepNight.view]);

  const refetch = useMemo(
    () => (opts?: TruthGetOptions) => {
      void sleepNight.refetch(opts);
    },
    [sleepNight.refetch],
  );

  return { vm, refetch, truthDebug };
}
