/**
 * Pure Workout + Cardio Monitor models from current-day calendar sessions.
 * Strength sessions → Workout; cardio-classified sessions → Cardio.
 * Rest days are absent (no empty rest cards on Daily Monitor).
 */

import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import { buildStrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import { buildCardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";

export type DailyMonitorWorkoutCardModel = {
  day: DayKey;
  sessionCount: number;
  /** Strength or existing session title for a single session. */
  primaryTitle: string;
  durationLabel: string;
  subtitle: string;
  accessibilityLabel: string;
};

export type DailyMonitorCardioCardModel = {
  day: DayKey;
  sessionCount: number;
  primaryTitle: string;
  primaryLine: string;
  metaLine: string;
  accessibilityLabel: string;
};

export function buildDailyMonitorWorkoutCardModel(input: {
  requestedDay: DayKey;
  calendarDays: readonly WorkoutCalendarDayLike[];
  overridesByWorkoutId?: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId?: Record<string, string | undefined>;
}): DailyMonitorWorkoutCardModel | null {
  const strengthDays = mapWorkoutCalendarDaysForDomain(input.calendarDays, "strength");
  const todayModel = buildStrengthTodayCardModel({
    strengthCalendarDays: strengthDays,
    todayDayKey: input.requestedDay,
    overridesByWorkoutId: input.overridesByWorkoutId ?? {},
    durableTitlesByWorkoutId: input.durableTitlesByWorkoutId ?? {},
  });
  if (todayModel.kind !== "completed") return null;

  const dayRow = strengthDays.find((d) => d.day === input.requestedDay);
  const sessions = dayRow
    ? collectStrengthOverviewTabSessions([{ day: input.requestedDay, workouts: dayRow.workouts }])
    : [];
  const sessionCount = Math.max(1, sessions.length);
  const primaryTitle =
    sessionCount > 1
      ? `${sessionCount} workouts`
      : todayModel.primaryTitle.trim().length > 0
        ? todayModel.primaryTitle
        : "Strength";

  return {
    day: input.requestedDay,
    sessionCount,
    primaryTitle,
    durationLabel: todayModel.durationLabel,
    subtitle: todayModel.subtitle,
    accessibilityLabel: `Workout. ${primaryTitle}. ${todayModel.durationLabel}. ${todayModel.subtitle}`.trim(),
  };
}

export function buildDailyMonitorCardioCardModel(input: {
  requestedDay: DayKey;
  calendarDays: readonly WorkoutCalendarDayLike[];
  overridesByWorkoutId?: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId?: Record<string, string | undefined>;
}): DailyMonitorCardioCardModel | null {
  const cardioDays = mapWorkoutCalendarDaysForDomain(input.calendarDays, "cardio");
  const todayModel = buildCardioTodayCardModel({
    cardioCalendarDays: cardioDays,
    todayDayKey: input.requestedDay,
    overridesByWorkoutId: input.overridesByWorkoutId ?? {},
    durableTitlesByWorkoutId: input.durableTitlesByWorkoutId ?? {},
  });
  if (todayModel.kind !== "completed" || todayModel.sessions.length === 0) return null;

  const sessionCount = todayModel.sessions.length;
  const first = todayModel.sessions[0]!;
  const modalityFromMeta = first.metaLine.includes(" · ")
    ? first.metaLine.split(" · ")[0]!.trim()
    : first.metaLine.trim();
  const primaryTitle =
    sessionCount > 1
      ? `${sessionCount} cardio sessions`
      : modalityFromMeta.length > 0
        ? modalityFromMeta
        : "Cardio";
  const primaryLine = first.primaryLine === "—" ? "Unavailable" : first.primaryLine;
  const metaLine = first.metaLine === "—" ? "" : first.metaLine;

  return {
    day: input.requestedDay,
    sessionCount,
    primaryTitle,
    primaryLine,
    metaLine,
    accessibilityLabel: `Cardio. ${primaryTitle}. ${primaryLine}. ${metaLine}`.trim(),
  };
}

export function resolveWorkoutMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  model: DailyMonitorWorkoutCardModel | null;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) return "refresh_error_with_cached_day_evidence";
  if (input.model == null) return "absent_no_day_evidence";
  return "present_complete";
}

export function resolveCardioMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  model: DailyMonitorCardioCardModel | null;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) return "refresh_error_with_cached_day_evidence";
  if (input.model == null) return "absent_no_day_evidence";
  return "present_complete";
}
