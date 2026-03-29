import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";
import type { ReducedSessionV1, WorkoutSessionStatus } from "@/lib/workouts/journal/types";

/**
 * Session Engine Selectors
 * Pure view of session state derived from journal events.
 */

export async function loadReducedSession(
  uid: string,
  sessionId: string,
): Promise<ReducedSessionV1> {
  const events = await listWorkoutJournalEvents(uid, sessionId);
  return reduceWorkoutSessionV1(events);
}

const RESUMABLE_WORKOUT_STATUSES: ReadonlySet<WorkoutSessionStatus> = new Set([
  "draft",
  "planned",
  "active",
]);

/**
 * Canonical resumability predicate for persisted sessions.
 * Completed/abandoned/archived sessions must not be resumed.
 */
export function isResumableWorkoutSessionStatus(status: WorkoutSessionStatus): boolean {
  return RESUMABLE_WORKOUT_STATUSES.has(status);
}

export function isResumableWorkoutSession(
  reduced: Pick<ReducedSessionV1, "status">,
): boolean {
  return isResumableWorkoutSessionStatus(reduced.status);
}
