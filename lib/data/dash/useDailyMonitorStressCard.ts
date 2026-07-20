/**
 * Daily Monitor Stress — bounded single-day Oura stress range.
 */

import { useMemo } from "react";

import {
  buildDailyMonitorStressCardModel,
  resolveStressMonitorPresence,
  type DailyMonitorStressCardModel,
} from "@/lib/data/dash/buildDailyMonitorStressCardModel";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import { useOuraStressRange } from "@/lib/data/dash/useOuraStressRange";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDailyMonitorStressCardResult = {
  presence: DailyMonitorPresenceStatus;
  model: DailyMonitorStressCardModel | null;
  href: "/(app)/recovery/stress";
};

export function useDailyMonitorStressCard(requestedDay: DayKey): UseDailyMonitorStressCardResult {
  const { user, initializing } = useAuth();
  const enabled = Boolean(user) && !initializing;
  const presenceState = useOuraPresence();
  const stressRange = useOuraStressRange(requestedDay, requestedDay, { enabled });

  return useMemo(() => {
    const ouraDisconnected =
      presenceState.status === "ready" && presenceState.data.connected === false;
    const dayDto =
      stressRange.status === "ready" || stressRange.status === "error"
        ? stressRange.days.find((d) => d.day === requestedDay) ?? null
        : null;
    const model = buildDailyMonitorStressCardModel({
      requestedDay,
      day: dayDto,
    });
    const loading =
      (enabled && presenceState.status === "partial") || stressRange.status === "partial";
    const error =
      stressRange.status === "error"
        ? stressRange.error
        : presenceState.status === "error"
          ? presenceState.error
          : null;

    return {
      presence: resolveStressMonitorPresence({
        loading,
        error,
        ouraDisconnected,
        model,
      }),
      model,
      href: "/(app)/recovery/stress" as const,
    };
  }, [enabled, presenceState, stressRange, requestedDay]);
}
