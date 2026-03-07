/**
 * Read-only previous workout comparison for the logger UI.
 * Uses journal + reducer only; no Firebase. Fail-closed when load fails.
 */

import { listWorkoutJournalSessionIds } from "@/lib/workouts/journal/sessionIndex";
import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";

const LB_PER_KG = 1 / 0.45359237;

/** Single set from previous session for comparison. */
export type PreviousSetComparison = {
  ordinal: number;
  reps?: number;
  loadLb?: number;
  rpe?: number;
};

/** Per-exercise comparison: sets by ordinal + optional summary. */
export type PreviousExerciseComparison = {
  summaryText: string | null;
  setsByOrdinal: Record<number, PreviousSetComparison>;
};

/**
 * Returns the last completed workout's sets for the given exercise, keyed by ordinal.
 * Sessions are scanned newest-first (last in index). First completed session containing
 * the exercise wins. No Firebase; uses journal + reducer only.
 */
export async function getPreviousExerciseComparison(
  uid: string,
  exerciseId: string,
): Promise<PreviousExerciseComparison> {
  const sessionIds = await listWorkoutJournalSessionIds(uid);
  if (sessionIds.length === 0)
    return { summaryText: null, setsByOrdinal: {} };

  // Newest last in list; iterate reverse to get last completed first.
  for (let i = sessionIds.length - 1; i >= 0; i--) {
    const sessionId = sessionIds[i]!;
    const events = await listWorkoutJournalEvents(uid, sessionId).catch(() => []);
    if (events.length === 0) continue;

    const reduced = reduceWorkoutSessionV1(events);
    if (reduced.status !== "completed") continue;

    const ex = reduced.exercises.find(
      (e) => !e.removed && e.exerciseId === exerciseId,
    );
    if (!ex) continue;

    const setsByOrdinal: Record<number, PreviousSetComparison> = {};
    const sortedSets = [...ex.sets].sort((a, b) => a.ordinal - b.ordinal);

    for (const s of ex.sets) {
      const loadLb =
        s.loadKg != null && s.loadKg > 0
          ? s.loadKg * LB_PER_KG
          : undefined;
      setsByOrdinal[s.ordinal] = {
        ordinal: s.ordinal,
        reps: s.reps,
        ...(loadLb != null && { loadLb }),
        ...(s.rpe != null && { rpe: s.rpe }),
      };
    }

    const first = sortedSets[0];
    const summaryText =
      first != null && first.reps != null
        ? (() => {
            const n = sortedSets.length;
            const w =
              first.loadKg != null && first.loadKg > 0
                ? `${(first.loadKg * LB_PER_KG).toFixed(1)} lb`
                : "BW";
            return `${n} × ${first.reps} @ ${w}`;
          })()
        : null;

    return { summaryText, setsByOrdinal };
  }

  return { summaryText: null, setsByOrdinal: {} };
}

/**
 * Format a previous set for the Last column: "10×90" or "8×135 @8".
 * Compact; no "lb" suffix (main Weight column implies lb).
 */
export function formatPreviousSetDisplay(set: PreviousSetComparison): string {
  const reps = set.reps ?? 0;
  const load = set.loadLb;
  const rpe = set.rpe;
  if (reps <= 0 && load == null) return "";
  const weightStr =
    load != null && load > 0
      ? Number.isInteger(load)
        ? String(load)
        : load.toFixed(1)
      : "BW";
  const base = reps > 0 ? `${reps}×${weightStr}` : weightStr;
  return rpe != null ? `${base} @${rpe}` : base;
}
