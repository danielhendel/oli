import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useEvents } from "@/lib/data/useEvents";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { buildNutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import { resolveNutritionDisplayNutrition } from "@/lib/data/nutrition/nutritionDisplayNutrition";
import { rollupNutritionTotalsFromRawEvents } from "@/lib/data/nutrition/nutritionRawDayRollup";
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
import { buildNutritionThisWeekCardModel } from "@/lib/data/nutrition/nutritionThisWeekCardModel";
import { buildNutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";
import {
  buildNutritionYearlyCardModel,
  countNutritionLoggedDaysByMonthFromEvents,
} from "@/lib/data/nutrition/nutritionYearlyCardModel";
import {
  nutritionOverviewFactsDayKeys,
  weekBoundsForAnchor,
} from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import { useNutritionDailyFactsRollup } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { NutritionDayStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionWeeklyInsightsModel } from "@/lib/data/nutrition/nutritionWeeklyInsightsModel";
import type { NutritionThisWeekCardModel } from "@/lib/data/nutrition/nutritionThisWeekCardModel";
import type { NutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";
import type { NutritionYearlyCardModel } from "@/lib/data/nutrition/nutritionYearlyCardModel";
import {
  addCalendarDaysToDayKey,
  getTodayDayKeyLocal,
  getWeekDaysForAnchor,
} from "@/lib/ui/calendar/dateUtils";
import type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

const NUTRITION_EVENTS_LOOKBACK_DAYS = 366;
/** API `GET /users/me/events` max page size (`canonicalEventsListQuerySchema`). */
const NUTRITION_EVENTS_LIMIT = 500;

export type { NutritionEventsUi, NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";

export type NutritionRecentRawUi =
  | { readiness: "partial"; isLoading: true }
  | { readiness: "ready"; isLoading: false }
  | { readiness: "error"; isLoading: false };

export type NutritionOverviewScreenData = {
  todayKey: string;
  weekDays: readonly string[];
  todayCard: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  weeklyStripDays: CalendarDay<NutritionDayStripMeta>[];
  recentCard: NutritionRecentCardModel;
  hasDayRollup: boolean;
  totalsSyncing: boolean;
  recentRaw: NutritionRecentRawUi;
  weeklyInsights: NutritionWeeklyInsightsModel;
  thisWeekCard: NutritionThisWeekCardModel;
  baselineModel: NutritionBaselineModel;
  yearlyCardModel: NutritionYearlyCardModel;
  selectedWeekAnchorDay: string;
  setSelectedWeekAnchorDay: (day: string) => void;
  selectedNutritionYear: number;
  setSelectedNutritionYear: (year: number) => void;
  canGoPreviousWeek: boolean;
  canGoNextWeek: boolean;
  canGoPreviousYear: boolean;
  canGoNextYear: boolean;
  factsRollupLoading: boolean;
  events: NutritionEventsUi;
  refetch: () => void;
  refetchTodayFacts: () => void;
  refetchEvents: () => void;
};

export function useNutritionOverviewScreenData(selectedDayKey = getTodayDayKeyLocal()): NutritionOverviewScreenData {
  const { user, initializing } = useAuth();
  const todayKey = getTodayDayKeyLocal();
  const todayYear = Number.parseInt(todayKey.slice(0, 4), 10);
  const [selectedWeekAnchorDay, setSelectedWeekAnchorDay] = useState(todayKey);
  const [selectedNutritionYear, setSelectedNutritionYear] = useState(todayYear);

  const weekDaysFull = getWeekDaysForAnchor(todayKey);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const { previousWeekStart, previousWeekEnd } = previousWeekBoundsFromWeekStart(weekStart);
  const eventsStart = addCalendarDaysToDayKey(todayKey, -NUTRITION_EVENTS_LOOKBACK_DAYS);

  const factsDayKeys = useMemo(
    () =>
      nutritionOverviewFactsDayKeys({
        todayDayKey: todayKey,
        weekAnchorDay: selectedWeekAnchorDay,
      }),
    [todayKey, selectedWeekAnchorDay],
  );

  const factsRollup = useNutritionDailyFactsRollup(factsDayKeys);

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
      factsRollup.refetch({ cacheBust: String(Date.now()) });
    }, [facts.refetch, events.refetch, rawNutritionDay.refetch, factsRollup.refetch]),
  );

  const refetchTodayFacts = useCallback(() => {
    void facts.refetch();
    factsRollup.refetch({ cacheBust: String(Date.now()) });
  }, [facts.refetch, factsRollup.refetch]);

  const refetchEvents = useCallback(() => {
    void events.refetch();
  }, [events.refetch]);

  const refetch = useCallback(() => {
    void facts.refetch();
    void events.refetch();
    void rawNutritionDay.refetch();
    factsRollup.refetch({ cacheBust: String(Date.now()) });
  }, [facts.refetch, events.refetch, rawNutritionDay.refetch, factsRollup.refetch]);

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

  const selectedWeekBounds = useMemo(
    () => weekBoundsForAnchor(selectedWeekAnchorDay),
    [selectedWeekAnchorDay],
  );

  const thisWeekCard = useMemo(
    () =>
      buildNutritionThisWeekCardModel({
        weekStart: selectedWeekBounds.weekStart,
        weekEnd: selectedWeekBounds.weekEnd,
        byDay: factsRollup.byDay,
        nutritionEvents: eventItems,
      }),
    [selectedWeekBounds, factsRollup.byDay, eventItems],
  );

  const baselineModel = useMemo(
    () =>
      buildNutritionBaselineModel({
        todayDayKey: todayKey,
        byDay: factsRollup.byDay,
        nutritionEvents: eventItems,
      }),
    [todayKey, factsRollup.byDay, eventItems],
  );

  const yearlyCardModel = useMemo(() => {
    const monthlyDayCounts = countNutritionLoggedDaysByMonthFromEvents(eventItems, selectedNutritionYear);
    return buildNutritionYearlyCardModel({
      selectedYear: selectedNutritionYear,
      todayDayKey: todayKey,
      monthlyDayCounts,
      byDay: factsRollup.byDay,
    });
  }, [eventItems, selectedNutritionYear, todayKey, factsRollup.byDay]);

  const rawRollup = useMemo(() => {
    if (rawNutritionDay.status !== "ready") return null;
    return rollupNutritionTotalsFromRawEvents(rawNutritionDay.data.items);
  }, [rawNutritionDay]);

  const displayNutrition = useMemo(() => {
    const factsNutrition = facts.status === "ready" ? facts.data.nutrition : undefined;
    return resolveNutritionDisplayNutrition({
      factsNutrition,
      rawRollup,
      rawEventsReady: rawNutritionDay.status === "ready",
    });
  }, [facts, rawRollup, rawNutritionDay.status]);

  const todayCard = useMemo(
    () => buildNutritionTodayCardModel({ nutrition: displayNutrition.nutrition }),
    [displayNutrition.nutrition],
  );

  const hasDayRollup = useMemo(
    () => hasNutritionRollupFacts(displayNutrition.nutrition),
    [displayNutrition.nutrition],
  );

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

  const canGoPreviousWeek = selectedWeekBounds.weekStart > eventsStart;
  const canGoNextWeek = selectedWeekBounds.weekEnd < todayKey;

  const canGoPreviousYear = selectedNutritionYear > todayYear - 5;
  const canGoNextYear = selectedNutritionYear < todayYear;

  return {
    todayKey,
    weekDays: weekDaysFull,
    todayCard,
    todayFacts,
    weeklyStripDays,
    recentCard,
    hasDayRollup,
    totalsSyncing: displayNutrition.totalsSyncing,
    recentRaw,
    weeklyInsights,
    thisWeekCard,
    baselineModel,
    yearlyCardModel,
    selectedWeekAnchorDay,
    setSelectedWeekAnchorDay,
    selectedNutritionYear,
    setSelectedNutritionYear,
    canGoPreviousWeek,
    canGoNextWeek,
    canGoPreviousYear,
    canGoNextYear,
    factsRollupLoading: factsRollup.status === "partial" || factsRollup.isRefreshing,
    events: eventsUi,
    refetch,
    refetchTodayFacts,
    refetchEvents,
  };
}
