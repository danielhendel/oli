import { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useEvents } from "@/lib/data/useEvents";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import {
  buildNutritionRecentMealRowsFromRaw,
  type NutritionRecentCardModel,
} from "@/lib/data/nutrition/nutritionRecentCardModel";
import { buildNutritionWeeklyStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import {
  buildNutritionWeeklyInsightsModel,
  previousWeekBoundsFromWeekStart,
} from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import { hasNutritionRollupFacts } from "@/lib/data/nutrition/nutritionRollupPresence";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { NutritionDayStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionWeeklyInsightsModel } from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

const NUTRITION_EVENTS_LOOKBACK_DAYS = 120;
/** API `GET /users/me/events` max page size (`canonicalEventsListQuerySchema`). */
const NUTRITION_EVENTS_LIMIT = 500;

export type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

/** Raw-event fetch for the overview’s selected day (meal rows with food labels). */
export type NutritionRecentRawUi =
  | { readiness: "partial"; isLoading: true }
  | { readiness: "ready"; isLoading: false }
  | { readiness: "error"; isLoading: false };

export type NutritionOverviewScreenData = {
  /** Calendar anchor (today in local TZ). */
  todayKey: string;
  weekDays: readonly string[];
  todayCard: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  weeklyStripDays: CalendarDay<NutritionDayStripMeta>[];
  recentCard: NutritionRecentCardModel;
  /** True when DailyFacts for the selected day show any positive macro rollup. */
  hasDayRollup: boolean;
  recentRaw: NutritionRecentRawUi;
  weeklyInsights: NutritionWeeklyInsightsModel;
  events: NutritionEventsUi;
  refetch: () => void;
  refetchTodayFacts: () => void;
  refetchEvents: () => void;
};

/**
 * Overview feed: {@link useDailyFacts} for the selected day’s rollup; raw nutrition rows for Recent;
 * canonical {@link useEvents} for week strip markers (and weekly insights model).
 */
export function useNutritionOverviewScreenData(selectedDayKey = getTodayDayKeyLocal()): NutritionOverviewScreenData {
  const { user, initializing } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const weekDaysFull = getWeekDaysForAnchor(todayKey);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const { previousWeekStart, previousWeekEnd } = previousWeekBoundsFromWeekStart(weekStart);
  const eventsStart = addCalendarDaysToDayKey(todayKey, -NUTRITION_EVENTS_LOOKBACK_DAYS);

  const facts = useDailyFacts(selectedDayKey);
  const rawNutritionDay = useRawEvents(
    {
      start: selectedDayKey,
      end: selectedDayKey,
      kinds: ["nutrition"],
      includePayload: true,
      limit: 100,
    },
    { enabled: !initializing && !!user },
  );

  const events = useEvents(
    {
      start: eventsStart,
      end: todayKey,
      kinds: ["nutrition"],
      limit: NUTRITION_EVENTS_LIMIT,
    },
    { enabled: !initializing && !!user, degradeHttpErrorsToEmpty: true },
  );

  useFocusEffect(
    useCallback(() => {
      void facts.refetch();
      void events.refetch();
      void rawNutritionDay.refetch();
    }, [facts.refetch, events.refetch, rawNutritionDay.refetch]),
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
    void rawNutritionDay.refetch();
  }, [facts.refetch, events.refetch, rawNutritionDay.refetch]);

  const eventItems = events.status === "ready" ? events.data.items : [];

  const weeklyStripDays = useMemo(
    () => buildNutritionWeeklyStripMeta(weekDaysFull, eventItems),
    [weekDaysFull, eventItems],
  );

  const recentCard = useMemo((): NutritionRecentCardModel => {
    if (rawNutritionDay.status !== "ready") return { rows: [] };
    return { rows: buildNutritionRecentMealRowsFromRaw(rawNutritionDay.data.items, 3) };
  }, [rawNutritionDay]);

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

  const hasDayRollup = useMemo(() => {
    if (facts.status !== "ready") return false;
    return hasNutritionRollupFacts(facts.data.nutrition);
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

  const recentRaw = useMemo((): NutritionRecentRawUi => {
    if (initializing || !user) return { readiness: "partial", isLoading: true };
    if (rawNutritionDay.status === "partial") return { readiness: "partial", isLoading: true };
    if (rawNutritionDay.status === "error") return { readiness: "error", isLoading: false };
    return { readiness: "ready", isLoading: false };
  }, [rawNutritionDay, initializing, user]);

  return {
    todayKey,
    weekDays: weekDaysFull,
    todayCard,
    todayFacts,
    weeklyStripDays,
    recentCard,
    hasDayRollup,
    recentRaw,
    weeklyInsights,
    events: eventsUi,
    refetch,
    refetchTodayFacts,
    refetchEvents,
  };
}
