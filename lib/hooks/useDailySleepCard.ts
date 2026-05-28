import { useEffect, useMemo } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildDailySleepCardViewModel,
  sleepNightIsAttributedToCalendarDay,
  type DailySleepCardViewModel,
} from "@/lib/data/dash/dailySleepCardViewModel";
import { runSleepTodayRecoveryIfMissing } from "@/lib/data/sleep/runSleepTodayRecoveryIfMissing";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
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
  const { user, getIdToken } = useAuth();
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

  // Today-recovery: when the canonical SleepNight view is settled-and-missing
  // for the local today, trigger the canonical refresh path once (rate-limited
  // per uid:day). All Firebase / API access stays in the data layer.
  const uid = user?.uid ?? "";
  const refetchSleep = sleepNight.refetch;
  useEffect(() => {
    if (!enabled) return;
    if (!uid) return;
    if (vm.status !== "missing") return;
    if (day !== getTodayDayKeyLocal()) return;
    void runSleepTodayRecoveryIfMissing({
      uid,
      requestedDay: day,
      isMissing: true,
      getIdToken,
      refetchSleep,
    });
  }, [enabled, uid, vm.status, day, getIdToken, refetchSleep]);

  const refetch = useMemo(
    () => (opts?: TruthGetOptions) => {
      void sleepNight.refetch(opts);
    },
    [sleepNight.refetch],
  );

  return { vm, refetch, truthDebug };
}
