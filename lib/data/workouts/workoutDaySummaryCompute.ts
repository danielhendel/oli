import type { RawEventDoc } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import { parseWorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  deriveSessionTypeFlags,
  reconcileWorkoutSessionsForDay,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import { sortWorkoutsChronologicalAsc } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  type WorkoutCalendarRawEventKind,
} from "@/lib/data/workouts/workoutsCalendarRawEventKinds";
import {
  WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
  WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
} from "../../contracts/workoutDaySummary";

const KIND_SET = new Set<string>(DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS);

function isWorkoutCalendarKind(kind: string): kind is WorkoutCalendarRawEventKind {
  return KIND_SET.has(kind);
}

export type WorkoutDaySummaryPayload = {
  schemaVersion: typeof WORKOUT_DAY_SUMMARY_SCHEMA_VERSION;
  day: DayKey;
  computedAt: string;
  reconcileVersion: string;
  hasStrength: boolean;
  hasCardio: boolean;
  rawWorkoutCount: number;
};

/**
 * Same marker semantics as Calendar: {@link reconcileWorkoutSessionsForDay} → {@link deriveSessionTypeFlags}.
 * `rawWorkoutCount` matches grouped raw items for that UI day (before session merge).
 */
export function computeWorkoutDaySummaryPayload(
  uiDay: DayKey,
  rawDocs: RawEventDoc[],
  computedAt: string,
): WorkoutDaySummaryPayload {
  const items: ReturnType<typeof parseWorkoutHistoryItem>[] = [];
  for (const doc of rawDocs) {
    if (!isWorkoutCalendarKind(doc.kind)) continue;
    const derived = deriveWorkoutDayKey(doc);
    if (derived !== uiDay) continue;
    items.push(parseWorkoutHistoryItem(doc));
  }
  const sorted = sortWorkoutsChronologicalAsc(items);
  const sessions = reconcileWorkoutSessionsForDay(uiDay, sorted);
  const flags = deriveSessionTypeFlags(sessions);
  return {
    schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
    day: uiDay,
    computedAt,
    reconcileVersion: WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
    hasStrength: flags.hasStrength,
    hasCardio: flags.hasCardio,
    rawWorkoutCount: sorted.length,
  };
}
