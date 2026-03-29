/**
 * Canonical **training volume** for logged strength work (manual journal + matching display rules).
 *
 * Rules (single source of truth for session totals, exercise totals, per-set display volume, weekly rollups):
 *
 * - **Unit**: kilograms internally (`reps × loadKg`). UI may show lb via `kgToLbs` / `LB_PER_KG`.
 * - **Included sets**: finite reps > 0, finite loadKg > 0.
 * - **Excluded**: warmup sets (`isWarmup === true`), missing/invalid reps or load, zero load (bodyweight-only
 *   for load-based logging — no volume; bodyweight-only workouts use rep counts elsewhere, not this path).
 * - **Removed sets/exercises**: already omitted before data reaches these helpers (journal reducer).
 * - **Corrections**: use resolved `reps` / `loadKg` from the reduced session (last correction wins).
 *
 * Session total volume = sum of `trainingVolumeKgForManualExercise` over non-removed exercises.
 * It matches the sum of per-exercise volumes and equals `computeStrengthMetricsFromExercises(...).totalVolume`.
 */

/** Minimal set shape for volume (matches `ManualWorkoutExerciseSet` in manual summaries). */
export type TrainingVolumeManualSetLike = {
  reps: number | null;
  weightKg: number | null;
  isWarmup?: boolean;
};

export type TrainingVolumeManualExerciseLike = {
  sets: readonly TrainingVolumeManualSetLike[];
};

/** Per-set training volume (kg). Warmup sets contribute 0. */
export function trainingVolumeKgForManualSet(set: TrainingVolumeManualSetLike): number {
  if (set.isWarmup === true) return 0;
  if (
    typeof set.reps === "number" &&
    Number.isFinite(set.reps) &&
    set.reps > 0 &&
    typeof set.weightKg === "number" &&
    Number.isFinite(set.weightKg) &&
    set.weightKg > 0
  ) {
    return set.reps * set.weightKg;
  }
  return 0;
}

/** Sum of included set volumes for one exercise. */
export function trainingVolumeKgForManualExercise(exercise: TrainingVolumeManualExerciseLike): number {
  let volume = 0;
  for (const set of exercise.sets) {
    volume += trainingVolumeKgForManualSet(set);
  }
  return volume;
}

/** Sum of exercise training volumes (session total when `exercises` is the full completed session). */
export function trainingVolumeKgForManualExercises(exercises: readonly TrainingVolumeManualExerciseLike[]): number {
  let total = 0;
  for (const exercise of exercises) {
    total += trainingVolumeKgForManualExercise(exercise);
  }
  return total;
}

/**
 * @deprecated Prefer `trainingVolumeKgForManualExercise` — kept for incremental migration.
 */
export function totalVolumeKgForManualExercise(exercise: TrainingVolumeManualExerciseLike): number {
  return trainingVolumeKgForManualExercise(exercise);
}
