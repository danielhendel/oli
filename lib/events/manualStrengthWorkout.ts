// lib/events/manualStrengthWorkout.ts
/**
 * Strength workout payload shape (matches rawEvent manualStrengthWorkoutPayloadSchema).
 */
type StrengthSet = {
  reps: number;
  load: number;
  unit: "lb" | "kg";
  isWarmup?: boolean;
  rpe?: number;
  rir?: number;
  notes?: string;
};

export type ManualStrengthWorkoutPayload = {
  startedAt: string;
  timeZone: string;
  exercises: { name: string; sets: StrengthSet[] }[];
};

export type ManualStrengthWorkoutInput = {
  startedAt: string;
  timeZone: string;
  exercises: { name: string; sets: StrengthSet[] }[];
};

/**
 * Round load to 2 decimals for stable idempotency across platforms.
 */
const roundLoad = (n: number): number => Math.round(n * 100) / 100;

/**
 * Build a normalized payload suitable for ingestion.
 * Ensures deterministic shape for idempotency hashing.
 */
export const buildManualStrengthWorkoutPayload = (
  input: ManualStrengthWorkoutInput,
): ManualStrengthWorkoutPayload => {
  const exercises = input.exercises.map((ex) => ({
    name: ex.name.trim(),
    sets: ex.sets.map((s) => ({
      reps: s.reps,
      load: roundLoad(s.load),
      unit: s.unit,
      ...(s.isWarmup !== undefined ? { isWarmup: s.isWarmup } : {}),
      ...(s.rpe !== undefined ? { rpe: s.rpe } : {}),
      ...(s.rir !== undefined ? { rir: s.rir } : {}),
      ...(s.notes !== undefined && s.notes.trim() !== "" ? { notes: s.notes.trim().slice(0, 256) } : {}),
    })),
  }));

  return {
    startedAt: input.startedAt,
    timeZone: input.timeZone,
    exercises,
  };
};

/**
 * Pure-JS hash for idempotency (works in React Native without Node crypto).
 * Deterministic 32-char hex from string input.
 */
function hashString32(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0;
  return (h1.toString(16) + h2.toString(16)).slice(0, 32);
}

/**
 * Stable, deterministic idempotency key from normalized payload.
 * Uses hash of canonical JSON similar to manualWeight patterns.
 */
export const manualStrengthWorkoutIdempotencyKey = (payload: ManualStrengthWorkoutPayload): string => {
  const canonical = JSON.stringify(payload);
  const hash = hashString32(canonical);
  return `msw_${payload.startedAt}_${hash}`.replace(/[^\w.-]/g, "_");
};
