import { useMemo } from "react";

import {
  buildDailySleepCardViewModel,
  sleepNightIsAttributedToCalendarDay,
  type DailySleepCardViewModel,
} from "@/lib/data/dash/dailySleepCardViewModel";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
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
  /**
   * Exact-day resting HR from the attributed SleepNight for this calendar day.
   * Null when sleep is not attributed, missing physiology, or unsettled.
   */
  exactDayRestingHeartRateBpm: number | null;
};

/**
 * Dash Daily Sleep truth boundary: `GET /users/me/sleep-night` + calendar-day guards.
 * Never surfaces bounded prior-night fallback or sticky prior-day UI state as today's truth.
 *
 * Does not auto-invoke `sleep-day-refresh` on mount/focus/missing. Normal Dash rendering
 * relies on the authenticated SleepNight read path; maintenance refresh stays explicit
 * (Sleep overview / pull-to-refresh coordinators).
 */
export function useDailySleepCard(day: DayKey, options?: { enabled?: boolean }): UseDailySleepCardResult {
  const enabled = options?.enabled ?? true;
  const sleepNight = useSleepNight(day, { enabled });
  const ouraPresence = useOuraPresence();

  /**
   * Authoritative "Oura disconnected" signal: only true once presence is settled (`ready`) and
   * `connected === false`. Partial/error keeps this false so the reconnect prompt never flashes
   * during loading or a transient status API error.
   */
  const ouraDisconnected =
    ouraPresence.status === "ready" && ouraPresence.data.connected === false;

  const vm = useMemo(
    () => buildDailySleepCardViewModel({ day, sleepNight, ouraDisconnected }),
    [
      day,
      sleepNight.view,
      sleepNight.loading,
      sleepNight.settled,
      sleepNight.error,
      ouraDisconnected,
    ],
  );

  const exactDayRestingHeartRateBpm = useMemo((): number | null => {
    if (!sleepNight.settled || sleepNight.view == null) return null;
    if (!sleepNightIsAttributedToCalendarDay(day, sleepNight.view)) return null;
    const bpm = sleepNight.view.sleepNight.lowestHeartRateBpm;
    if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm < 30 || bpm > 220) return null;
    return Math.round(bpm);
  }, [day, sleepNight.settled, sleepNight.view]);

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

  return { vm, refetch, truthDebug, exactDayRestingHeartRateBpm };
}
