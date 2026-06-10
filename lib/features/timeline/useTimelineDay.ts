// lib/features/timeline/useTimelineDay.ts
// Composition hook for the single-day Timeline. Wires existing read-only data hooks
// (one day, bounded) into a memoized TimelineDayVm. No Firebase, no heavy aggregation,
// and never the multi-day GET /users/me/timeline.

import { useCallback, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { GetOptions } from "@/lib/api/http";
import { useEvents } from "@/lib/data/useEvents";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { buildTimelineDayVm } from "@/lib/features/timeline/buildTimelineDayVm";
import type { TimelineDayStatus } from "@/lib/features/timeline/types";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export type UseTimelineDayResult = {
  day: string;
  /** Valid YYYY-MM-DD. Errors surface as a `status: "error"` for invalid params. */
  status: TimelineDayStatus;
  refetchAll: (opts?: GetOptions) => void;
};

/**
 * Orchestrates one day of timeline data. The canonical events list is the primary source
 * and the only one that gates the error state; sleep / daily-facts / insights are best-effort
 * enrichments that never blank the screen if they fail.
 */
export function useTimelineDay(day: string): UseTimelineDayResult {
  const isFocused = useIsFocused();
  const valid = YYYY_MM_DD.test(day);
  const enabled = isFocused && valid;

  const startIso = valid ? `${day}T00:00:00.000Z` : "";
  const endIso = valid ? `${day}T23:59:59.999Z` : "";

  const events = useEvents(
    { start: startIso, end: endIso, limit: 100 },
    { enabled },
  );

  const raw = useRawEvents(
    { start: day, end: day, kinds: ["nutrition", "incomplete"], includePayload: true, limit: 100 },
    { enabled },
  );

  const sleep = useSleepNight(day, { enabled });
  const facts = useDailyFacts(day, { enabled });
  const insights = useInsights(day);

  const refetchAll = useCallback(
    (opts?: GetOptions) => {
      events.refetch(opts);
      raw.refetch(opts);
      sleep.refetch(opts);
      facts.refetch(opts);
      insights.refetch(opts);
    },
    [events, raw, sleep, facts, insights],
  );

  const status: TimelineDayStatus = useMemo(() => {
    if (!valid) {
      return { status: "error", error: "Invalid day", requestId: null, reason: "unknown" };
    }
    if (events.status === "partial") {
      return { status: "partial" };
    }
    if (events.status === "error") {
      return {
        status: "error",
        error: events.error,
        requestId: events.requestId,
        reason: events.reason,
      };
    }

    const vm = buildTimelineDayVm({
      day,
      events: events.data.items,
      ...(raw.status === "ready" ? { rawItems: raw.data.items } : {}),
      ...(sleep.view ? { sleepNight: sleep.view } : {}),
      ...(facts.status === "ready" ? { dailyFacts: facts.data } : {}),
      ...(insights.status === "ready" ? { insights: insights.data.items } : {}),
    });

    return { status: "ready", vm };
  }, [valid, day, events, raw, sleep.view, facts, insights]);

  return { day, status, refetchAll };
}
