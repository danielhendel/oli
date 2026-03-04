import { listWorkoutJournalSessionIds } from "@/lib/workouts/journal/sessionIndex";
import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";

export type ExerciseLibrarySections = {
  recentIds: string[];
  popularIds: string[];
};

type Opts = {
  recentLimit?: number;
  popularLimit?: number;
};

function safeParseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

/**
 * Deterministic, offline-first exercise library sections:
 * - Recent: last performed timestamp (completed sessions only)
 * - Popular: count of completed sessions containing the exercise
 *
 * Fail-closed:
 * - Corrupt/missing events => skip that session
 * - Unparseable timestamps => ignore those sets
 */
export async function buildExerciseLibrarySections(uid: string, opts?: Opts): Promise<ExerciseLibrarySections> {
  const recentLimit = Math.max(0, opts?.recentLimit ?? 6);
  const popularLimit = Math.max(0, opts?.popularLimit ?? 6);

  const sessionIds = await listWorkoutJournalSessionIds(uid);
  if (sessionIds.length === 0) return { recentIds: [], popularIds: [] };

  const lastMsByExercise: Record<string, number> = {};
  const sessionCountByExercise: Record<string, number> = {};

  for (const sid of sessionIds) {
    const events = await listWorkoutJournalEvents(uid, sid).catch(() => []);
    if (events.length === 0) continue;

    const reduced = reduceWorkoutSessionV1(events);
    if (reduced.status !== "completed") continue;

    const seenInThisSession = new Set<string>();

    for (const ex of reduced.exercises) {
      if (ex.removed) continue;

      let hasQualifyingSet = false;

      for (const s of ex.sets) {
        if (s.loadKg == null) continue; // fail-closed: require load
        const ms = safeParseMs(s.occurredAt);
        if (ms == null) continue; // fail-closed: require parseable time

        hasQualifyingSet = true;

        const prev = lastMsByExercise[ex.exerciseId];
        if (prev == null || ms > prev) lastMsByExercise[ex.exerciseId] = ms;
      }

      if (hasQualifyingSet) seenInThisSession.add(ex.exerciseId);
    }

    for (const exerciseId of seenInThisSession) {
      sessionCountByExercise[exerciseId] = (sessionCountByExercise[exerciseId] ?? 0) + 1;
    }
  }

  const recentIds = Object.entries(lastMsByExercise)
    .sort((a, b) => {
      const ams = a[1];
      const bms = b[1];
      if (ams !== bms) return bms - ams;
      return a[0].localeCompare(b[0]);
    })
    .map(([id]) => id)
    .slice(0, recentLimit);

  const popularIds = Object.entries(sessionCountByExercise)
    .sort((a, b) => {
      const ac = a[1];
      const bc = b[1];
      if (ac !== bc) return bc - ac;
      return a[0].localeCompare(b[0]);
    })
    .map(([id]) => id)
    .slice(0, popularLimit);

  return { recentIds, popularIds };
}
