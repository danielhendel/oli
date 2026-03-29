import { logStrengthWorkout } from "@/lib/api/usersMe";
import { buildManualStrengthWorkoutPayload, type ManualStrengthWorkoutPayload } from "@/lib/events/manualStrengthWorkout";
import { loadReducedSession } from "@/lib/workouts/sessionEngine/selectors";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";
import { loadCustomExerciseNameById, resolveExerciseDisplayName } from "@/lib/workouts/exercises/displayName";

function buildPayloadFromReducedSession(
  reduced: ReducedSessionV1,
  customExerciseNameById: ReadonlyMap<string, string>,
): ManualStrengthWorkoutPayload | null {
  if (reduced.startedAt == null || reduced.startedAt.trim() === "") return null;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const exercises: ManualStrengthWorkoutPayload["exercises"] = [];
  for (const exercise of reduced.exercises) {
    if (exercise.removed) continue;
    const sets = [...exercise.sets]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((set) => ({
        reps: set.reps,
        load: set.loadKg ?? 0,
        unit: "kg" as const,
        ...(set.isWarmup ? { isWarmup: true } : {}),
        ...(set.rpe != null ? { rpe: set.rpe } : {}),
        ...(set.note != null && set.note.trim().length > 0 ? { notes: set.note.trim() } : {}),
      }));
    if (sets.length === 0) continue;
    exercises.push({
      name: resolveExerciseDisplayName(exercise.exerciseId, customExerciseNameById),
      sets,
    });
  }

  if (exercises.length === 0) return null;

  return buildManualStrengthWorkoutPayload({
    startedAt: reduced.startedAt,
    timeZone,
    exercises,
  });
}

/**
 * Persist a completed journal session into canonical strength workout history.
 * Returns `true` when ingest is attempted, `false` when session has no ingestible sets.
 */
export async function persistCompletedSessionToHistory(
  uid: string,
  sessionId: string,
  idToken: string,
): Promise<boolean> {
  const reduced = await loadReducedSession(uid, sessionId);
  if (reduced.status !== "completed") {
    throw new Error("Cannot persist history for a non-completed session.");
  }
  const customExerciseNameById = await loadCustomExerciseNameById(uid);
  const payload = buildPayloadFromReducedSession(reduced, customExerciseNameById);
  if (payload == null) return false;
  const res = await logStrengthWorkout(payload, idToken);
  if (!res.ok) {
    throw new Error(res.error ?? "Failed to persist completed workout.");
  }
  return true;
}
