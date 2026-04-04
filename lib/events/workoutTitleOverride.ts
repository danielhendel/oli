import type { WorkoutTitleOverridePayload } from "@oli/contracts";

/**
 * Build payload for append-only `workout_title_override` raw events.
 * Each save uses a fresh idempotency key so renames stack as new events (latest wins client-side).
 */
export function buildWorkoutTitleOverridePayload(input: {
  targetWorkoutId: string;
  displayName: string;
  appliedAtIso: string;
  timeZone?: string;
}): WorkoutTitleOverridePayload {
  const targetWorkoutId = input.targetWorkoutId.trim();
  const displayName = input.displayName.trim().slice(0, 120);
  const appliedAt = input.appliedAtIso.trim();
  const timeZone = typeof input.timeZone === "string" ? input.timeZone.trim() : "";
  const out: WorkoutTitleOverridePayload = {
    targetWorkoutId,
    displayName,
    appliedAt,
    ...(timeZone.length > 0 ? { timeZone } : {}),
  };
  return out;
}

/**
 * Idempotency key for POST /ingest — unique per save so repeated renames create distinct docs.
 */
export function workoutTitleOverrideIdempotencyKey(): string {
  const t = Date.now();
  const r = Math.floor(Math.random() * 1e9);
  return `wtitle_${t}_${r}`;
}
