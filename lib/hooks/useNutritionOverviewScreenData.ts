import { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useEvents } from "@/lib/data/useEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import { buildNutritionRecentCardModel } from "@/lib/data/nutrition/nutritionRecentCardModel";
import { buildNutritionWeeklyStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import {
  buildNutritionWeeklyInsightsModel,
  previousWeekBoundsFromWeekStart,
} from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { NutritionDayStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionRecentCardModel } from "@/lib/data/nutrition/nutritionRecentCardModel";
import type { NutritionWeeklyInsightsModel } from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

const NUTRITION_EVENTS_LOOKBACK_DAYS = 120;
const NUTRITION_EVENTS_LIMIT = 250;

export type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

export type NutritionOverviewScreenData = {
  todayKey: string;
  weekDays: readonly string[];
  todayCard: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  weeklyStripDays: CalendarDay<NutritionDayStripMeta>[];
  recentCard: NutritionRecentCardModel;
  weeklyInsights: NutritionWeeklyInsightsModel;
  events: NutritionEventsUi;
  refetch: () => void;
  refetchTodayFacts: () => void;
  refetchEvents: () => void;
};

/**
 * Overview feed: {@link useDailyFacts} for today's macro rollup; {@link useEvents} for `nutrition` canonical events (strip, recent, insights).
 */
export function useNutritionOverviewScreenData(): NutritionOverviewScreenData {
  const { user, initializing } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const weekDaysFull = getWeekDaysForAnchor(todayKey);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const { previousWeekStart, previousWeekEnd } = previousWeekBoundsFromWeekStart(weekStart);
  const eventsStart = addCalendarDaysToDayKey(todayKey, -NUTRITION_EVENTS_LOOKBACK_DAYS);

  const facts = useDailyFacts(todayKey);
  const events = useEvents(
    {
      start: eventsStart,
      end: todayKey,
      kinds: ["nutrition"],
      limit: NUTRITION_EVENTS_LIMIT,
    },
    { enabled: !initializing && !!user },
  );

  // Depend only on stable refetch fns — `useEvents`/`useDailyFacts` return objects that may change identity; `events` was previously a new object every render and retriggered this effect endlessly, aborting in-flight fetches (permanent partial).
  useFocusEffect(
    useCallback(() => {
      void facts.refetch();
      void events.refetch();
    }, [facts.refetch, events.refetch]),
  );

  const refetchTodayFacts = useCallback(() => {
    void facts.refetch();
  }, [facts.refetch]);

  const refetchEvents = useCallback(() => {
    void events.refetch();
  }, [events.refetch]);

  const refetch = useCallback(() => {
    void facts.refetch();
    void events.refetch();
  }, [facts.refetch, events.refetch]);

  const eventItems = events.status === "ready" ? events.data.items : [];

  const weeklyStripDays = useMemo(
    () => buildNutritionWeeklyStripMeta(weekDaysFull, eventItems),
    [weekDaysFull, eventItems],
  );

  const recentCard = useMemo(() => buildNutritionRecentCardModel(eventItems, 7), [eventItems]);

  const weeklyInsights = useMemo(
    () =>
      buildNutritionWeeklyInsightsModel({
        currentWeekStart: weekStart,
        currentWeekEnd: weekEnd,
        previousWeekStart,
        previousWeekEnd,
        nutritionEvents: eventItems,
      }),
    [eventItems, weekStart, weekEnd, previousWeekStart, previousWeekEnd],
  );

  const todayCard = useMemo(() => {
    if (facts.status === "ready") {
      return buildNutritionTodayCardModel({ nutrition: facts.data.nutrition });
    }
    return buildNutritionTodayCardModel({ nutrition: undefined });
  }, [facts]);

  const todayFacts = useMemo((): NutritionTodayFactsUi => {
    if (initializing || !user) return { readiness: "partial", isLoading: true };
    if (facts.status === "partial") return { readiness: "partial", isLoading: true };
    if (facts.status === "missing") return { readiness: "missing", isLoading: false };
    if (facts.status === "error") {
      return { readiness: "error", isLoading: false, message: facts.error, requestId: facts.requestId };
    }
    return { readiness: "ready", isLoading: false };
  }, [facts, initializing, user]);

  const eventsUi = useMemo((): NutritionEventsUi => {
    if (initializing || !user) return { readiness: "partial", isLoading: true };
    if (events.status === "partial") return { readiness: "partial", isLoading: true };
    if (events.status === "error") {
      return { readiness: "error", isLoading: false, message: events.error, requestId: events.requestId };
    }
    return { readiness: "ready", isLoading: false };
  }, [events, initializing, user]);

  return {
    todayKey,
    weekDays: weekDaysFull,
    todayCard,
    todayFacts,
    weeklyStripDays,
    recentCard,
    weeklyInsights,
    events: eventsUi,
    refetch,
    refetchTodayFacts,
    refetchEvents,
  };
}
