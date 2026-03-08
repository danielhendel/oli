/**
 * Per-exercise history from journal (completed sessions only).
 * Uses listWorkoutJournalSessionIds, listWorkoutJournalEvents, reduceWorkoutSessionV1.
 * No Firebase/API. Fail-closed: invalid sessions skipped.
 */

import { listWorkoutJournalSessionIds } from "@/lib/workouts/journal/sessionIndex";
import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";

/** Single set as stored in reduced session (for history display). */
export type ExerciseHistorySet = {
  ordinal: number;
  reps: number;
  loadKg: number | null;
  rpe: number | null;
  occurredAt: string;
};

/** One completed session containing this exercise. */
export type ExerciseHistorySession = {
  sessionId: string;
  /** ISO string; session start or earliest event. */
  startedAt: string;
  sets: ExerciseHistorySet[];
  /** Volume for this exercise in this session: sum(reps * loadKg) where loadKg present. */
  volumeKg: number;
  /** Best e1RM (Epley) in this session for this exercise; null if no set with load. */
  bestE1RmKg: number | null;
};

/** Top-level summary derived from history. */
export type ExerciseHistorySummary = {
  /** ISO string of most recent session that contained this exercise. */
  lastPerformedAt: string | null;
  totalSessions: number;
  /** Best e1RM (Epley) across all sets in history; null if no set with load. */
  bestE1RmKg: number | null;
  /** Human-readable "last" line e.g. "3 × 10 @ 135 lb". */
  lastSummaryText: string | null;
};

export type ExerciseHistoryResult = {
  summary: ExerciseHistorySummary;
  /** Newest first. */
  sessions: ExerciseHistorySession[];
};

const LB_PER_KG = 1 / 0.45359237;

/** Epley e1RM = loadKg * (1 + reps/30). Deterministic. */
function epleyE1RmKg(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

function formatLastSummaryText(sets: ExerciseHistorySet[]): string | null {
  const sorted = [...sets].sort((a, b) => a.ordinal - b.ordinal);
  const first = sorted[0];
  if (!first || first.reps == null) return null;
  const n = sets.length;
  const w =
    first.loadKg != null && first.loadKg > 0
      ? `${(first.loadKg * LB_PER_KG).toFixed(1)} lb`
      : "BW";
  return `${n} × ${first.reps} @ ${w}`;
}

/**
 * Load full exercise history for one exercise from the journal.
 * Only completed sessions are included. Sessions ordered newest first.
 */
export async function getExerciseHistory(
  uid: string,
  exerciseId: string,
): Promise<ExerciseHistoryResult> {
  const sessionIds = await listWorkoutJournalSessionIds(uid);
  const sessions: ExerciseHistorySession[] = [];
  let lastPerformedAt: string | null = null;
  let bestE1RmKg: number | null = null;
  let lastSummaryText: string | null = null;

  // Session index order: append order. Newest is last; iterate reverse for newest-first.
  for (let i = sessionIds.length - 1; i >= 0; i--) {
    const sessionId = sessionIds[i]!;
    const events = await listWorkoutJournalEvents(uid, sessionId).catch(() => []);
    if (events.length === 0) continue;

    const reduced: ReducedSessionV1 = reduceWorkoutSessionV1(events);
    if (reduced.status !== "completed") continue;

    const ex = reduced.exercises.find(
      (e) => !e.removed && e.exerciseId === exerciseId,
    );
    if (!ex) continue;

    const startedAt = reduced.startedAt ?? ex.sets[0]?.occurredAt ?? new Date().toISOString();
    const sets: ExerciseHistorySet[] = ex.sets.map((s) => ({
      ordinal: s.ordinal,
      reps: s.reps,
      loadKg: s.loadKg,
      rpe: s.rpe,
      occurredAt: s.occurredAt,
    }));

    let volumeKg = 0;
    let sessionBestE1RmKg: number | null = null;
    for (const s of ex.sets) {
      const load = s.loadKg;
      if (load != null && load > 0) {
        volumeKg += s.reps * load;
        const e1 = epleyE1RmKg(load, s.reps);
        if (sessionBestE1RmKg == null || e1 > sessionBestE1RmKg) sessionBestE1RmKg = e1;
      }
    }

    if (lastPerformedAt == null) {
      lastPerformedAt = startedAt;
      lastSummaryText = formatLastSummaryText(sets);
    }

    for (const s of ex.sets) {
      if (s.loadKg != null && s.loadKg > 0) {
        const e1 = epleyE1RmKg(s.loadKg, s.reps);
        if (bestE1RmKg == null || e1 > bestE1RmKg) bestE1RmKg = e1;
      }
    }

    sessions.push({ sessionId, startedAt, sets, volumeKg, bestE1RmKg: sessionBestE1RmKg });
  }

  return {
    summary: {
      lastPerformedAt,
      totalSessions: sessions.length,
      bestE1RmKg,
      lastSummaryText,
    },
    sessions,
  };
}
