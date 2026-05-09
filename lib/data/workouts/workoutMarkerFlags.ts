import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { classifyWorkoutEvidence } from "@/lib/data/workouts/workoutEligibility";

export type WorkoutMarkerFlags = {
  hasStrength: boolean;
  hasCardio: boolean;
};

export function classifyWorkoutType(input: {
  rawKind?: string | null | undefined;
  title?: string | null | undefined;
  sport?: string | null | undefined;
  activityName?: string | null | undefined;
  distanceMeters?: number | null | undefined;
  hkActivityId?: number | null | undefined;
}): "strength" | "cardio" | undefined {
  return classifyWorkoutEvidence(input);
}

export function deriveWorkoutMarkerFlags(workouts: WorkoutHistoryItem[]): WorkoutMarkerFlags {
  let hasStrength = false;
  let hasCardio = false;

  for (const workout of workouts) {
    const type =
      workout.workoutType ??
      classifyWorkoutType({
        rawKind: workout.rawKind,
        title: workout.title,
        sport: workout.sport,
        activityName: workout.activityName,
        distanceMeters: workout.distanceMeters,
        hkActivityId: workout.hk?.activityId,
      });
    if (type === "strength") {
      hasStrength = true;
      continue;
    }
    if (type === "cardio") {
      hasCardio = true;
    }
  }

  return { hasStrength, hasCardio };
}
