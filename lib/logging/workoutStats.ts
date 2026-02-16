// lib/logging/workoutStats.ts
export type WorkoutSet = { reps?: number; weight?: number; rpe?: number };
export type WorkoutExercise = { name: string; sets: WorkoutSet[] };
export type WorkoutPayload = { exercises: WorkoutExercise[]; durationMs?: number };

export type WorkoutStats = {
  totalSets: number;
  totalVolumeKg?: number; // optional, present only when > 0
};

export function deriveWorkoutStats(payload: unknown): WorkoutStats {
  const p = (payload as WorkoutPayload) ?? { exercises: [] };
  const exs = Array.isArray(p.exercises) ? p.exercises : [];
  let totalSets = 0;
  let totalVolumeKg = 0;

  for (const ex of exs) {
    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
    for (const s of sets) {
      totalSets += 1;
      if (typeof s.reps === "number" && typeof s.weight === "number") {
        totalVolumeKg += s.reps * s.weight;
      }
    }
  }

  const res: WorkoutStats = { totalSets };
  if (totalVolumeKg > 0) res.totalVolumeKg = totalVolumeKg; // don’t assign undefined
  return res;
}
