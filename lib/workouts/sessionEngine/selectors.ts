import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";

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
