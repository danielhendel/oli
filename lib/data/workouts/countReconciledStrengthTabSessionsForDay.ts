import type { DayKey } from "@/lib/ui/calendar/types";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { classifyWorkoutType } from "@/lib/data/workouts/workoutMarkerFlags";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  deriveOverviewTabSessionCounts,
  sortWorkoutsChronologicalAsc,
} from "@/lib/data/workouts/workoutsCalendarModel";

/** Minimal canonical workout shapes for server dailyFacts aggregation (no functions types dep). */
export type CanonicalWorkoutEventForReconcile =
  | {
      kind: "workout";
      id: string;
      sourceId: string;
      start: string;
      end: string;
      sport: string;
      durationMinutes: number;
      distanceMeters?: number | null;
    }
  | {
      kind: "strength_workout";
      id: string;
      sourceId: string;
      start: string;
      end: string;
      exercises: readonly { exercise: string }[];
    };

function durationMinutesFromStartEnd(start: string, end: string): number | null {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return Math.max(1, Math.round((endMs - startMs) / 60_000));
}

function workoutCanonicalToHistoryItem(e: CanonicalWorkoutEventForReconcile & { kind: "workout" }): WorkoutHistoryItem {
  const sport = e.sport;
  const title = sport.trim().length > 0 ? sport : "";
  const workoutType = classifyWorkoutType({
    rawKind: "workout",
    title,
    sport,
    distanceMeters: e.distanceMeters,
  });
  return {
    id: e.id,
    observedAt: e.start,
    sourceId: e.sourceId,
    provider: e.sourceId,
    rawKind: "workout",
    title,
    ...(workoutType != null ? { workoutType } : {}),
    sport,
    start: e.start,
    end: e.end,
    durationMinutes: e.durationMinutes,
    calories: null,
    ...(e.distanceMeters != null ? { distanceMeters: e.distanceMeters } : {}),
  };
}

function strengthWorkoutCanonicalToHistoryItem(
  e: CanonicalWorkoutEventForReconcile & { kind: "strength_workout" },
): WorkoutHistoryItem {
  const firstEx = e.exercises[0]?.exercise?.trim() ?? "";
  const title = firstEx.length > 0 ? firstEx : "Strength workout";
  return {
    id: e.id,
    observedAt: e.start,
    sourceId: e.sourceId,
    provider: e.sourceId,
    rawKind: "strength_workout",
    title,
    workoutType: "strength",
    start: e.start,
    end: e.end,
    durationMinutes: durationMinutesFromStartEnd(e.start, e.end),
    calories: null,
  };
}

export function workoutHistoryItemsFromCanonicalWorkoutEvents(
  events: readonly CanonicalWorkoutEventForReconcile[],
): WorkoutHistoryItem[] {
  const out: WorkoutHistoryItem[] = [];
  for (const e of events) {
    if (e.kind === "workout") out.push(workoutCanonicalToHistoryItem(e));
    else out.push(strengthWorkoutCanonicalToHistoryItem(e));
  }
  return out;
}

/**
 * Strength-tab session count for a calendar day — same rules as Strength Overview / This Week
 * ({@link reconcileWorkoutSessionsForDay} + {@link deriveOverviewTabSessionCounts}).
 */
export function countReconciledStrengthTabSessionsForDay(
  day: DayKey,
  events: readonly CanonicalWorkoutEventForReconcile[],
): number {
  const items = sortWorkoutsChronologicalAsc(workoutHistoryItemsFromCanonicalWorkoutEvents(events));
  const sessions = reconcileWorkoutSessionsForDay(day, items);
  return deriveOverviewTabSessionCounts(sessions).strengthSessionCount;
}
