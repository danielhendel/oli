/**
 * Deterministic idempotency keys for Apple Health–derived events.
 * Used as Firestore doc ids for rawEvents; must be stable and Firestore-safe (no '/').
 * No Date.now() or randomness.
 */

const PREFIX = "appleHealth";

/** Firestore doc id safe: no '/'. Replace with underscore. */
function sanitizeForDocId(s: string): string {
  return s.replace(/\//g, "_").trim();
}

/**
 * Idempotency key for daily steps (one key per day).
 * Based only on day (YYYY-MM-DD).
 */
export function stepsIdempotencyKey(day: string): string {
  const safe = sanitizeForDocId(day);
  if (!safe) throw new Error("stepsIdempotencyKey: day is required");
  return `${PREFIX}:steps:${safe}`;
}

/**
 * Idempotency key for a workout.
 * Based on startIso, endIso, activityId, and sourceId (if present).
 */
export function workoutIdempotencyKey(params: {
  startIso: string;
  endIso: string;
  activityId: number;
  sourceId?: string | null;
}): string {
  const start = sanitizeForDocId(params.startIso);
  const end = sanitizeForDocId(params.endIso);
  const activityId = String(params.activityId);
  const sourceId = params.sourceId != null ? sanitizeForDocId(String(params.sourceId)) : "";
  if (!start || !end) throw new Error("workoutIdempotencyKey: startIso and endIso are required");
  const parts = [start, end, activityId, sourceId].filter(Boolean);
  return `${PREFIX}:workout:${parts.join("_")}`;
}

/**
 * Idempotency key for a resting heart rate sample.
 * Based on sample timestamp and sample id (if provided).
 */
export function restingHeartRateIdempotencyKey(params: {
  timestampIso: string;
  sampleId?: string | null;
}): string {
  const ts = sanitizeForDocId(params.timestampIso);
  if (!ts) throw new Error("restingHeartRateIdempotencyKey: timestampIso is required");
  const id = params.sampleId != null ? sanitizeForDocId(String(params.sampleId)) : "";
  const suffix = id ? `_${id}` : "";
  return `${PREFIX}:restingHr:${ts}${suffix}`;
}

/**
 * Idempotency key for daily apple exercise time (one key per day).
 */
export function appleExerciseTimeIdempotencyKey(day: string): string {
  const safe = sanitizeForDocId(day);
  if (!safe) throw new Error("appleExerciseTimeIdempotencyKey: day is required");
  return `${PREFIX}:appleExerciseTime:${safe}`;
}

/**
 * Idempotency key for daily active energy (one key per day).
 */
export function activeEnergyIdempotencyKey(day: string): string {
  const safe = sanitizeForDocId(day);
  if (!safe) throw new Error("activeEnergyIdempotencyKey: day is required");
  return `${PREFIX}:activeEnergy:${safe}`;
}
