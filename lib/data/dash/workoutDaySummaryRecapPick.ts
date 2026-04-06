// lib/data/dash/workoutDaySummaryRecapPick.ts
import type { WorkoutDaySummariesResponseDto, WorkoutDaySummaryItemDto } from "@oli/contracts";

/**
 * Returns the validated workout-day summary row for a single calendar day, if present in the API response.
 * Caller must request `start === end === dayKey` for a single-day read.
 */
export function pickWorkoutDaySummaryItemForDay(
  response: WorkoutDaySummariesResponseDto,
  dayKey: string,
): WorkoutDaySummaryItemDto | null {
  const item = response.items.find((i) => i.day === dayKey);
  return item ?? null;
}
