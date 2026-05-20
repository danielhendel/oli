import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { resolveExerciseIntelligenceForAnalytics } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type {
  ManualWorkoutDaySummary,
  ManualWorkoutExerciseSummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export const WORKOUT_DETAIL_MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

const CANONICAL_MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

export type WorkoutDetailMuscleSetCountRow = {
  muscleGroup: MuscleGroup;
  setCount: number;
};

/** Per-exercise contribution row used by the Today card muscle drill-down sheet. */
export type WorkoutDetailMuscleExerciseSetCountRow = {
  /** Display name as it appeared in the journal/ingest summary. */
  exerciseName: string;
  /** Number of qualifying sets (filter applied by the caller, e.g. RPE 7–10). */
  setCount: number;
};

export type WorkoutDetailMuscleVolumeAggregation = {
  totalVolumeRows: WorkoutDetailMuscleSetCountRow[];
  workingSetVolumeRows: WorkoutDetailMuscleSetCountRow[];
  totalUnassignedSetCount: number;
  workingUnassignedSetCount: number;
};

function normalizeExerciseIdKey(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v.length > 0 ? v : null;
}

/** Cache key per exercise row (logged id or stable name key). */
function resolutionCacheKey(exercise: ManualWorkoutExerciseSummary): string {
  const id = normalizeExerciseIdKey(exercise.exerciseId);
  if (id != null) return id;
  const name = exercise.name.trim();
  return name.length > 0 ? `name:${name.toLowerCase()}` : "unknown";
}

/**
 * Id passed to analytics resolver. Synthetic `exercise:name:…` when logged id is missing so
 * `resolveExerciseIntelligenceForAnalytics` can run name fallback (empty id returns unknown).
 */
function loggedExerciseIdForAnalyticsResolution(exercise: ManualWorkoutExerciseSummary): string {
  const id = normalizeExerciseIdKey(exercise.exerciseId);
  if (id != null) return id;
  const name = exercise.name.trim();
  if (name.length === 0) return "";
  return `exercise:name:${name.toLowerCase().replace(/\s+/g, "_")}`;
}

/**
 * Workout Details Total Volume: every logged/completed set on the exercise (includes warm-up and unrated).
 * Intentionally broader than weekly `countedNonWarmupSets`.
 */
export function countWorkoutDetailTotalVolumeSetsForExercise(
  exercise: ManualWorkoutExerciseSummary,
): number {
  return exercise.sets.length;
}

export function sumWorkoutDetailTotalVolumeSets(
  exercises: readonly ManualWorkoutExerciseSummary[],
): number {
  let total = 0;
  for (const exercise of exercises) {
    total += countWorkoutDetailTotalVolumeSetsForExercise(exercise);
  }
  return total;
}

export function sumMuscleSetCountRows(rows: readonly WorkoutDetailMuscleSetCountRow[]): number {
  return rows.reduce((sum, row) => sum + row.setCount, 0);
}

/** Working sets: finite RPE 7–10 inclusive. */
export function isWorkoutDetailWorkingSet(intensity: number | null | undefined): boolean {
  return typeof intensity === "number" && Number.isFinite(intensity) && intensity >= 7 && intensity <= 10;
}

function sortMuscleRows(rows: WorkoutDetailMuscleSetCountRow[]): WorkoutDetailMuscleSetCountRow[] {
  return rows.sort((a, b) => {
    if (b.setCount !== a.setCount) return b.setCount - a.setCount;
    return (
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) -
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup)
    );
  });
}

type MergeResult = {
  rows: WorkoutDetailMuscleSetCountRow[];
  unassignedSetCount: number;
};

function mergeMuscleSetCountRows(
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx: ExerciseAnalyticsResolutionContext | undefined,
  includeSet: (set: ManualWorkoutExerciseSummary["sets"][number]) => boolean,
): MergeResult {
  const resolvedByCacheKey = new Map<string, ReturnType<typeof resolveExerciseIntelligenceForAnalytics>>();
  const byMuscle = new Map<MuscleGroup, number>();
  let unassignedSetCount = 0;

  const resolveOne = (exercise: ManualWorkoutExerciseSummary) => {
    const cacheKey = resolutionCacheKey(exercise);
    let row = resolvedByCacheKey.get(cacheKey);
    if (row == null) {
      const loggedId = loggedExerciseIdForAnalyticsResolution(exercise);
      row = resolveExerciseIntelligenceForAnalytics(loggedId, analyticsCtx, {
        fallbackLoggedExerciseName: exercise.name,
      });
      resolvedByCacheKey.set(cacheKey, row);
    }
    return row;
  };

  for (const exercise of exercises) {
    const resolved = resolveOne(exercise);
    const primary = resolved.primaryMuscleGroup;

    for (const set of exercise.sets) {
      if (!includeSet(set)) continue;
      if (primary == null) {
        unassignedSetCount += 1;
        continue;
      }
      byMuscle.set(primary, (byMuscle.get(primary) ?? 0) + 1);
    }
  }

  const rows = [...byMuscle.entries()]
    .map(([muscleGroup, setCount]) => ({ muscleGroup, setCount }))
    .filter((row) => row.setCount > 0);

  return { rows: sortMuscleRows(rows), unassignedSetCount };
}

/**
 * Workout Details muscle set rollup (primary muscle only; no secondary distribution).
 * Uses the same analytics resolver as weekly strength cards when `analyticsContext` is provided.
 */
export function aggregateWorkoutDetailMuscleSetVolume(
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): WorkoutDetailMuscleVolumeAggregation {
  const total = mergeMuscleSetCountRows(exercises, analyticsCtx, () => true);
  const working = mergeMuscleSetCountRows(exercises, analyticsCtx, (set) =>
    isWorkoutDetailWorkingSet(set.intensity),
  );
  return {
    totalVolumeRows: total.rows,
    workingSetVolumeRows: working.rows,
    totalUnassignedSetCount: total.unassignedSetCount,
    workingUnassignedSetCount: working.unassignedSetCount,
  };
}

/** All logged sets by primary muscle (Workout Details Total Volume card). */
export function buildWorkoutDetailMuscleVolumeRows(
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): WorkoutDetailMuscleSetCountRow[] {
  return aggregateWorkoutDetailMuscleSetVolume(exercises, analyticsCtx).totalVolumeRows;
}

/** RPE 7–10 sets by primary muscle (Workout Details Total Working Set Volume card). */
export function buildWorkoutDetailWorkingSetVolumeRows(
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): WorkoutDetailMuscleSetCountRow[] {
  return aggregateWorkoutDetailMuscleSetVolume(exercises, analyticsCtx).workingSetVolumeRows;
}

/**
 * Per-exercise breakdown of RPE 7–10 sets, grouped by primary muscle.
 *
 * Reuses {@link resolveExerciseIntelligenceForAnalytics} via the same cache-key path
 * (`exerciseId` → `name:<lower>` fallback) and the same {@link isWorkoutDetailWorkingSet}
 * filter as {@link aggregateWorkoutDetailMuscleSetVolume}. Per-exercise rows are merged by
 * the same cache key so duplicate journal rows for the same exercise collapse into one
 * `{exerciseName, setCount}` row. Sum of `setCount` per muscle equals the corresponding
 * row in {@link buildWorkoutDetailWorkingSetVolumeRows} by construction (no new aggregation
 * algorithm).
 *
 * Returns a partial map keyed by primary muscle. Muscles with zero qualifying sets are
 * omitted. Sets without a resolvable primary muscle are dropped (no "unassigned" bucket
 * exposed here; the parent rows aggregation already records the unassigned count).
 *
 * Exercise rows within each muscle are ordered by `setCount` desc, then by display name
 * ascending (stable, locale-insensitive).
 */
export function buildWorkoutDetailWorkingSetExerciseRowsByMuscle(
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): Partial<Record<MuscleGroup, WorkoutDetailMuscleExerciseSetCountRow[]>> {
  const resolvedByCacheKey = new Map<string, ReturnType<typeof resolveExerciseIntelligenceForAnalytics>>();

  type Bucket = { exerciseName: string; setCount: number };
  const byMuscleByCacheKey = new Map<MuscleGroup, Map<string, Bucket>>();

  const resolveOne = (exercise: ManualWorkoutExerciseSummary) => {
    const cacheKey = resolutionCacheKey(exercise);
    let row = resolvedByCacheKey.get(cacheKey);
    if (row == null) {
      const loggedId = loggedExerciseIdForAnalyticsResolution(exercise);
      row = resolveExerciseIntelligenceForAnalytics(loggedId, analyticsCtx, {
        fallbackLoggedExerciseName: exercise.name,
      });
      resolvedByCacheKey.set(cacheKey, row);
    }
    return row;
  };

  for (const exercise of exercises) {
    const resolved = resolveOne(exercise);
    const primary = resolved.primaryMuscleGroup;
    if (primary == null) continue;

    let qualifyingSets = 0;
    for (const set of exercise.sets) {
      if (isWorkoutDetailWorkingSet(set.intensity)) qualifyingSets += 1;
    }
    if (qualifyingSets <= 0) continue;

    const exerciseCacheKey = resolutionCacheKey(exercise);
    let bucketsForMuscle = byMuscleByCacheKey.get(primary);
    if (bucketsForMuscle == null) {
      bucketsForMuscle = new Map<string, Bucket>();
      byMuscleByCacheKey.set(primary, bucketsForMuscle);
    }
    const existing = bucketsForMuscle.get(exerciseCacheKey);
    if (existing) {
      existing.setCount += qualifyingSets;
    } else {
      const displayName = exercise.name.trim().length > 0 ? exercise.name.trim() : "Exercise";
      bucketsForMuscle.set(exerciseCacheKey, { exerciseName: displayName, setCount: qualifyingSets });
    }
  }

  const out: Partial<Record<MuscleGroup, WorkoutDetailMuscleExerciseSetCountRow[]>> = {};
  for (const [muscle, buckets] of byMuscleByCacheKey) {
    const rows = [...buckets.values()]
      .filter((row) => row.setCount > 0)
      .sort((a, b) => {
        if (b.setCount !== a.setCount) return b.setCount - a.setCount;
        return a.exerciseName.localeCompare(b.exerciseName);
      });
    if (rows.length > 0) out[muscle] = rows;
  }
  return out;
}

export type BuildWeeklyWorkingSetVolumeOptions = {
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  analyticsCtx?: ExerciseAnalyticsResolutionContext;
};

/**
 * Strength overview “Weekly Working Volume”: sums RPE 7–10 sets across journal summaries
 * in the calendar week window. Primary muscle only; same resolver as Workout Details.
 */
export function buildWeeklyWorkingSetVolumeRows(
  summaries: readonly ManualWorkoutDaySummary[],
  options: BuildWeeklyWorkingSetVolumeOptions,
): WorkoutDetailMuscleSetCountRow[] {
  const exercises = flattenWeekExercises(summaries, options);
  return mergeMuscleSetCountRows(exercises, options.analyticsCtx, (set) =>
    isWorkoutDetailWorkingSet(set.intensity),
  ).rows;
}

function flattenWeekExercises(
  summaries: readonly ManualWorkoutDaySummary[],
  options: BuildWeeklyWorkingSetVolumeOptions,
): ManualWorkoutExerciseSummary[] {
  const daysInWeek = new Set(enumerateDaysInclusive(options.weekStartDay, options.weekEndDay));
  const exercises: ManualWorkoutExerciseSummary[] = [];
  for (const summary of summaries) {
    if (!daysInWeek.has(summary.day as DayKey)) continue;
    exercises.push(...summary.exercises);
  }
  return exercises;
}

/**
 * Per-exercise breakdown for the weekly working-volume card drill-down.
 *
 * Thin window-wrapper over {@link buildWorkoutDetailWorkingSetExerciseRowsByMuscle} — flattens
 * the week's qualifying journal summaries into a single exercise list and delegates to the
 * same per-exercise selector used by the Today card. No new aggregation algorithm.
 *
 * Sum across exercises within a muscle equals the muscle's `setCount` from
 * {@link buildWeeklyWorkingSetVolumeRows} by construction.
 */
export function buildWeeklyWorkingSetExerciseRowsByMuscle(
  summaries: readonly ManualWorkoutDaySummary[],
  options: BuildWeeklyWorkingSetVolumeOptions,
): Partial<Record<MuscleGroup, WorkoutDetailMuscleExerciseSetCountRow[]>> {
  const exercises = flattenWeekExercises(summaries, options);
  return buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises, options.analyticsCtx);
}
