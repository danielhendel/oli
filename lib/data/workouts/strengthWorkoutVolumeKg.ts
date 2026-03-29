import { kgToLbs } from "@/lib/metrics/metricUnits";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function loadKg(load: number, unit: string): number | null {
  if (!Number.isFinite(load) || load <= 0) return null;
  if (unit === "kg") return load;
  if (unit === "lb") return load / kgToLbs(1);
  return null;
}

/**
 * Total training volume (kg) from a manual `strength_workout` ingest payload (`exercises[].sets[]`).
 * Mirrors `lib/workouts/strength/strengthVolumeKg.ts`: warmup sets excluded; reps/load positive finite.
 */
export function computeStrengthVolumeKgFromStrengthWorkoutPayload(payload: unknown): number | null {
  if (!isRecord(payload)) return null;
  const exercises = payload.exercises;
  if (!Array.isArray(exercises)) return null;
  let total = 0;
  let has = false;
  for (const ex of exercises) {
    if (!isRecord(ex)) continue;
    const sets = ex.sets;
    if (!Array.isArray(sets)) continue;
    for (const set of sets) {
      if (!isRecord(set)) continue;
      if (set.isWarmup === true) continue;
      const reps = set.reps;
      const load = set.load;
      const unit = set.unit;
      if (typeof reps !== "number" || !Number.isFinite(reps) || reps <= 0) continue;
      if (typeof load !== "number" || !Number.isFinite(load) || load <= 0) continue;
      if (unit !== "kg" && unit !== "lb") continue;
      const kg = loadKg(load, unit);
      if (kg == null) continue;
      total += reps * kg;
      has = true;
    }
  }
  return has ? total : null;
}
