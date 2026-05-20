import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { buildStrengthTodayCompletedSummaryLine } from "@/lib/data/workouts/strengthTodayCardModel";
import { formatWorkoutDurationLabel } from "@/lib/data/workouts/workoutDisplay";
import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

const META_SEGMENT_SEP = " • ";

/**
 * Compact This Week row metadata: journal/ingest set + focus summary (same rules as Today card)
 * plus optional duration. Omits unavailable segments — no placeholders.
 */
export function buildStrengthThisWeekSessionMetadataLine(
  journal: ManualWorkoutDaySummary | null,
  actionWorkout: WorkoutHistoryItem,
  durationMinutes: number | null,
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): string {
  const exerciseLine = buildStrengthTodayCompletedSummaryLine(journal, actionWorkout, analyticsCtx).trim();
  const durationPart =
    durationMinutes != null && Number.isFinite(durationMinutes) && durationMinutes > 0
      ? formatWorkoutDurationLabel(durationMinutes)
      : "";
  const parts: string[] = [];
  if (exerciseLine.length > 0) {
    parts.push(exerciseLine.split(" · ").join(META_SEGMENT_SEP));
  }
  if (durationPart.length > 0) parts.push(durationPart);
  return parts.join(META_SEGMENT_SEP);
}
