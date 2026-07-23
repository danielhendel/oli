/**
 * Daily Monitor Activity — reuses DailyFacts session cache (same day as Energy).
 * Workout/Cardio step rows require session applicability from Monitor session models.
 */

import { useMemo } from "react";

import {
  buildDailyMonitorActivityCardModel,
  resolveActivityMonitorPresence,
  type DailyMonitorActivityCardModel,
  type DailyMonitorActivitySessionApplicability,
} from "@/lib/data/dash/buildDailyMonitorActivityCardModel";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDailyMonitorActivityCardResult = {
  presence: DailyMonitorPresenceStatus;
  model: DailyMonitorActivityCardModel | null;
  href: "/(app)/activity";
  /** Shared DailyFacts refetch (also notified via session-cache invalidation). */
  refetch: (opts?: { cacheBust?: string }) => void;
};

export function useDailyMonitorActivityCard(
  requestedDay: DayKey,
  sessionApplicability?: DailyMonitorActivitySessionApplicability,
): UseDailyMonitorActivityCardResult {
  const facts = useDailyFacts(requestedDay);

  return useMemo(() => {
    const readyFacts =
      facts.status === "ready" && facts.data.date === requestedDay ? facts.data : null;
    const model = buildDailyMonitorActivityCardModel({
      requestedDay,
      facts: readyFacts,
      sessionApplicability: sessionApplicability ?? {
        hasCurrentDayWorkout: false,
        hasCurrentDayCardio: false,
      },
    });
    const presence = resolveActivityMonitorPresence({
      loading: facts.status === "partial",
      error: facts.status === "error" ? facts.error : null,
      model,
      factsDay: facts.status === "ready" ? facts.data.date : null,
      requestedDay,
    });
    return {
      presence,
      model,
      href: "/(app)/activity" as const,
      refetch: facts.refetch,
    };
  }, [facts, requestedDay, sessionApplicability]);
}
