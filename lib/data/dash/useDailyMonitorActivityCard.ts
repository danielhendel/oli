/**
 * Daily Monitor Activity — reuses DailyFacts session cache (same day as Energy).
 */

import { useMemo } from "react";

import {
  buildDailyMonitorActivityCardModel,
  resolveActivityMonitorPresence,
  type DailyMonitorActivityCardModel,
} from "@/lib/data/dash/buildDailyMonitorActivityCardModel";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDailyMonitorActivityCardResult = {
  presence: DailyMonitorPresenceStatus;
  model: DailyMonitorActivityCardModel | null;
  href: "/(app)/activity";
};

export function useDailyMonitorActivityCard(requestedDay: DayKey): UseDailyMonitorActivityCardResult {
  const facts = useDailyFacts(requestedDay);

  return useMemo(() => {
    const readyFacts =
      facts.status === "ready" && facts.data.date === requestedDay ? facts.data : null;
    const model = buildDailyMonitorActivityCardModel({
      requestedDay,
      facts: readyFacts,
    });
    const presence = resolveActivityMonitorPresence({
      loading: facts.status === "partial",
      error: facts.status === "error" ? facts.error : null,
      model,
      factsDay: facts.status === "ready" ? facts.data.date : null,
      requestedDay,
    });
    return { presence, model, href: "/(app)/activity" as const };
  }, [facts, requestedDay]);
}
