import { useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useEvents } from "@/lib/data/useEvents";
import { buildNutritionAnalyticsSummaryModel } from "@/lib/data/nutrition/nutritionAnalyticsSummaryModel";
import type { NutritionAnalyticsSummaryModel } from "@/lib/data/nutrition/nutritionAnalyticsSummaryModel";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

const LOOKBACK_DAYS = 90;
const LIMIT = 500;

export type NutritionAnalyticsDetailScreenData = {
  summary: NutritionAnalyticsSummaryModel | null;
  eventsReady: boolean;
  error: string | null;
  requestId: string | null;
  refetch: () => void;
};

/**
 * Analytics detail: single range query of canonical nutrition events + deterministic summary builder.
 */
export function useNutritionAnalyticsDetailScreenData(): NutritionAnalyticsDetailScreenData {
  const { user, initializing } = useAuth();
  const today = getTodayDayKeyLocal();
  const start = addCalendarDaysToDayKey(today, -LOOKBACK_DAYS);

  const events = useEvents(
    {
      start,
      end: today,
      kinds: ["nutrition"],
      limit: LIMIT,
    },
    { enabled: !initializing && !!user },
  );

  const summary = useMemo(() => {
    if (events.status !== "ready") return null;
    return buildNutritionAnalyticsSummaryModel(events.data.items, start, today);
  }, [events, start, today]);

  return {
    summary,
    eventsReady: events.status === "ready",
    error: events.status === "error" ? events.error : null,
    requestId: events.status === "error" ? events.requestId : null,
    refetch: events.refetch,
  };
}
