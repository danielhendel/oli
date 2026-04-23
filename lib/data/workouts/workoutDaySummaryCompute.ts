import type { RawEventDoc } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import {
  mergeManualExercisesIntoStrengthTaxonomyMaps,
  createEmptyStrengthTaxonomyMaps,
  serializeStrengthTaxonomyMaps,
  type StrengthTaxonomySerialized,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";
import {
  parseStrengthIngestExercisesFromPayload,
  parseWorkoutHistoryItem,
} from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  deriveSessionTypeFlags,
  reconcileWorkoutSessionsForDay,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  deriveOverviewTabSessionCounts,
  sortWorkoutsChronologicalAsc,
} from "@/lib/data/workouts/workoutsCalendarModel";
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

function computeStrengthTaxonomyForUiDay(uiDay: DayKey, rawDocs: RawEventDoc[]): StrengthTaxonomySerialized | undefined {
  const maps = createEmptyStrengthTaxonomyMaps();
  for (const doc of rawDocs) {
    if (!isWorkoutCalendarKind(doc.kind)) continue;
    if (deriveWorkoutDayKey(doc) !== uiDay) continue;
    if (doc.kind !== "strength_workout") continue;
    const payloadRaw = doc.payload;
    const payload = payloadRaw != null && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : null;
    if (payload == null) continue;
    const exercises = parseStrengthIngestExercisesFromPayload(doc.id, payload);
    if (exercises == null || exercises.length === 0) continue;
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, exercises, undefined);
  }
  const serialized = serializeStrengthTaxonomyMaps(maps);
  return serialized ?? undefined;
}

export type WorkoutDaySummaryPayload = {
  schemaVersion: typeof WORKOUT_DAY_SUMMARY_SCHEMA_VERSION;
  day: DayKey;
  computedAt: string;
  reconcileVersion: string;
  hasStrength: boolean;
  hasCardio: boolean;
  rawWorkoutCount: number;
  /** Count of reconciled sessions with `sessionType === "strength"` (overview Strength tab). */
  strengthSessionCount: number;
  /** Count of reconciled sessions with `sessionType === "cardio"` (overview Cardio tab). */
  cardioSessionCount: number;
  /** Optional aggregated strength taxonomy derived from parsed `strength_workout` payloads (PR 4). */
  strengthTaxonomy?: StrengthTaxonomySerialized;
};

/**
 * Same marker semantics as Calendar: {@link reconcileWorkoutSessionsForDay} → {@link deriveSessionTypeFlags}.
 * Tab session counts: {@link deriveOverviewTabSessionCounts} (strict strength vs cardio; excludes mixed/unknown).
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
  const tabCounts = deriveOverviewTabSessionCounts(sessions);
  const strengthTaxonomy = computeStrengthTaxonomyForUiDay(uiDay, rawDocs);
  return {
    schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
    day: uiDay,
    computedAt,
    reconcileVersion: WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
    hasStrength: flags.hasStrength,
    hasCardio: flags.hasCardio,
    rawWorkoutCount: sorted.length,
    strengthSessionCount: tabCounts.strengthSessionCount,
    cardioSessionCount: tabCounts.cardioSessionCount,
    ...(strengthTaxonomy != null ? { strengthTaxonomy } : {}),
  };
}
