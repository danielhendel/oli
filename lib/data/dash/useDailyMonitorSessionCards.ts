/**
 * Daily Monitor Workout + Cardio from one bounded current-day calendar hydrate.
 */

import { useMemo } from "react";

import {
  buildDailyMonitorCardioCardModel,
  buildDailyMonitorWorkoutCardModel,
  resolveCardioMonitorPresence,
  resolveWorkoutMonitorPresence,
  type DailyMonitorCardioCardModel,
  type DailyMonitorWorkoutCardModel,
} from "@/lib/data/dash/buildDailyMonitorSessionCards";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import { useWorkoutsCalendarRange } from "@/lib/data/workouts/useWorkoutsCalendar";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseDailyMonitorSessionCardsResult = {
  workoutPresence: DailyMonitorPresenceStatus;
  workoutModel: DailyMonitorWorkoutCardModel | null;
  workoutHref: "/(app)/workouts";
  cardioPresence: DailyMonitorPresenceStatus;
  cardioModel: DailyMonitorCardioCardModel | null;
  cardioHref: "/(app)/cardio";
};

export function useDailyMonitorSessionCards(
  requestedDay: DayKey,
): UseDailyMonitorSessionCardsResult {
  const range = useWorkoutsCalendarRange(requestedDay, requestedDay);

  return useMemo(() => {
    const loading = range.status === "partial";
    const error = range.status === "error" ? range.error : null;
    const days = range.status === "ready" ? range.days : [];
    const durable = range.status === "ready" ? range.durableTitlesByWorkoutId : {};

    const workoutModel =
      !loading && error == null
        ? buildDailyMonitorWorkoutCardModel({
            requestedDay,
            calendarDays: days,
            durableTitlesByWorkoutId: durable,
          })
        : null;
    const cardioModel =
      !loading && error == null
        ? buildDailyMonitorCardioCardModel({
            requestedDay,
            calendarDays: days,
            durableTitlesByWorkoutId: durable,
          })
        : null;

    return {
      workoutPresence: resolveWorkoutMonitorPresence({ loading, error, model: workoutModel }),
      workoutModel,
      workoutHref: "/(app)/workouts" as const,
      cardioPresence: resolveCardioMonitorPresence({ loading, error, model: cardioModel }),
      cardioModel,
      cardioHref: "/(app)/cardio" as const,
    };
  }, [range, requestedDay]);
}
