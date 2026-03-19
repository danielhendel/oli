/**
 * Bounded multi-pass Apple Health workout history backfill.
 * Reuses runAnchoredWorkoutsSync only (same ingestion + anchor semantics).
 */

import {
  runAnchoredWorkoutsSync,
  type RunAnchoredWorkoutsSyncDeps,
} from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";

export const DEFAULT_WORKOUT_BACKFILL_MAX_PASSES = 3;

export type RunWorkoutHistoryBackfillResult =
  | { ok: true; passesRun: number; mayHaveMoreWorkouts: boolean }
  | { ok: false; error: string; requestId: string | null; passesRun: number };

/**
 * Runs up to `maxPasses` anchored sync passes in sequence.
 * Stops early when a pull returns fewer than `limit` workouts (no more pages).
 * Fail-closed: any pass failure aborts; anchor was already advanced only for completed passes.
 */
export async function runWorkoutHistoryBackfillPasses(
  opts: { uid: string; token: string; limit: number; maxPasses?: number },
  deps: RunAnchoredWorkoutsSyncDeps,
): Promise<RunWorkoutHistoryBackfillResult> {
  const maxPasses = opts.maxPasses ?? DEFAULT_WORKOUT_BACKFILL_MAX_PASSES;
  let passesRun = 0;

  for (let i = 0; i < maxPasses; i++) {
    const r = await runAnchoredWorkoutsSync(
      { uid: opts.uid, token: opts.token, limit: opts.limit },
      deps,
    );

    if (!r.ok) {
      return {
        ok: false,
        error: r.error,
        requestId: r.requestId,
        passesRun,
      };
    }

    passesRun += 1;
    if (!r.mayHaveMoreWorkouts) {
      return { ok: true, passesRun, mayHaveMoreWorkouts: false };
    }
  }

  return { ok: true, passesRun, mayHaveMoreWorkouts: true };
}
