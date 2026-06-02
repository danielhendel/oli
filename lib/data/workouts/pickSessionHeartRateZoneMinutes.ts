/**
 * Workout Physiology v1 — session-level HR zone fallback picker.
 *
 * Walks a {@link ReconciledWorkoutSession}'s constituent {@link WorkoutHistoryItem}s and
 * returns the first valid `heartRateZoneMinutes` tuple it finds. Used by the Strength
 * and Cardio HR detail modals as a fallback when the daily aggregate
 * (`dailyFacts.{strength,cardio}.heartRateZoneMinutes`) is missing — typically the
 * window between Phase C deploy and the next `recomputeForDay` for that day.
 *
 * Contracts:
 * - Read-only. Does not mutate the session or its workouts.
 * - Returns `null` when no contributing workout carries a valid 5-tuple. Callers must
 *   render "—" / unavailable copy in that case — never invent values.
 * - Picks the FIRST valid tuple deterministically (input order from the reconciliation
 *   step is already stable: by chronological start, then id).
 */

import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  validateHeartRateZoneMinutesTuple,
  type HeartRateZoneMinutesTuple,
} from "@/lib/data/workouts/heartRateZonePresentation";

export function pickSessionHeartRateZoneMinutes(
  session: ReconciledWorkoutSession | null | undefined,
): HeartRateZoneMinutesTuple | null {
  if (session == null) return null;
  for (const w of session.workouts) {
    const tuple = validateHeartRateZoneMinutesTuple(w.heartRateZoneMinutes);
    if (tuple != null) return tuple;
  }
  return null;
}
