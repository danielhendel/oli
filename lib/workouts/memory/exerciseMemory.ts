import { listWorkoutJournalSessionIds } from "@/lib/workouts/journal/sessionIndex";
import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";

export type ExerciseSetSummary = {
  reps: number;
  loadKg: number;
  occurredAt: string;
};

export type ExerciseMemory = {
  last: ExerciseSetSummary | null;
  best: ExerciseSetSummary | null; // best by e1RM
  bestE1RmKg: number | null;
};

export type ExerciseMemoryMap = Record<string, ExerciseMemory>;

function epleyE1RmKg(loadKg: number, reps: number): number {
  // Deterministic formula: Epley
  // e1RM = w * (1 + reps/30)
  return loadKg * (1 + reps / 30);
}

function pickLast(a: ExerciseSetSummary | null, b: ExerciseSetSummary): ExerciseSetSummary {
  if (!a) return b;
  const ta = Date.parse(a.occurredAt);
  const tb = Date.parse(b.occurredAt);
  if (tb !== ta) return tb > ta ? b : a;
  // tie-break deterministic: higher load, then higher reps
  if (b.loadKg !== a.loadKg) return b.loadKg > a.loadKg ? b : a;
  return b.reps > a.reps ? b : a;
}

function pickBest(
  current: { best: ExerciseSetSummary | null; bestE1RmKg: number | null },
  cand: ExerciseSetSummary,
): { best: ExerciseSetSummary; bestE1RmKg: number } {
  const e1 = epleyE1RmKg(cand.loadKg, cand.reps);
  if (current.best == null || current.bestE1RmKg == null) return { best: cand, bestE1RmKg: e1 };
  if (e1 !== current.bestE1RmKg)
    return e1 > current.bestE1RmKg
      ? { best: cand, bestE1RmKg: e1 }
      : { best: current.best, bestE1RmKg: current.bestE1RmKg };
  // tie-break deterministic: higher load, then higher reps
  if (cand.loadKg !== current.best.loadKg)
    return cand.loadKg > current.best.loadKg
      ? { best: cand, bestE1RmKg: e1 }
      : { best: current.best, bestE1RmKg: current.bestE1RmKg };
  return cand.reps > current.best.reps ? { best: cand, bestE1RmKg: e1 } : { best: current.best, bestE1RmKg: current.bestE1RmKg };
}

/**
 * Build exercise memory by scanning indexed sessions (offline-first).
 * Only counts sessions whose reduced status is "completed" (fail-closed).
 */
export async function buildExerciseMemory(uid: string): Promise<ExerciseMemoryMap> {
  const sessionIds = await listWorkoutJournalSessionIds(uid);
  if (sessionIds.length === 0) return {};

  const out: ExerciseMemoryMap = {};

  for (const sid of sessionIds) {
    const events = await listWorkoutJournalEvents(uid, sid).catch(() => []);
    if (events.length === 0) continue;
    const reduced = reduceWorkoutSessionV1(events);
    if (reduced.status !== "completed") continue;

    for (const ex of reduced.exercises) {
      if (ex.removed) continue;
      const exerciseId = ex.exerciseId;
      for (const s of ex.sets) {
        if (s.loadKg == null) continue; // fail-closed: ignore missing load
        const cand: ExerciseSetSummary = { reps: s.reps, loadKg: s.loadKg, occurredAt: s.occurredAt };
        const cur = out[exerciseId] ?? { last: null, best: null, bestE1RmKg: null };
        const last = pickLast(cur.last, cand);
        const bestPick = pickBest({ best: cur.best, bestE1RmKg: cur.bestE1RmKg }, cand);
        out[exerciseId] = { last, best: bestPick.best, bestE1RmKg: bestPick.bestE1RmKg };
      }
    }
  }

  return out;
}
