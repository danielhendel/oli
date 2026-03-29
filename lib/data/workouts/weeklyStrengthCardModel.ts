import type {
  ExerciseAnalyticsResolutionContext,
  ResolvedExerciseAnalytics,
} from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { resolveExerciseIntelligenceForAnalytics } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { getMuscleGroupForSubgroup, type MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  trainingVolumeKgForManualExercise,
  trainingVolumeKgForManualExercises,
} from "@/lib/workouts/strength/strengthVolumeKg";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";

/** Same title source as workout day detail: `resolveWorkoutDisplay(...).displayTitle` per reconciled session. */
export type WeeklySessionDisplayHint = {
  day: DayKey;
  startAt: string | null;
  displayTitle: string;
};

export type WeeklyStrengthWorkoutRow = {
  workoutId: string;
  workoutName: string;
  /** Session total volume (kg), from `ManualWorkoutDaySummary.totalVolume` when present — matches detail header. */
  totalVolume: number;
};

export type WeeklyStrengthMuscleRow = {
  muscleGroup: MuscleGroup;
  totalVolume: number;
};

/** Full training sets per top-level muscle (each exercise’s sets attributed to its primary muscle group). */
export type WeeklyStrengthMuscleSetsRow = {
  muscleGroup: MuscleGroup;
  totalSets: number;
};

export type WeeklyStrengthCardModel = {
  weekKey: string;
  totalWorkouts: number;
  totalVolume: number;
  workouts: WeeklyStrengthWorkoutRow[];
  muscleGroups: WeeklyStrengthMuscleRow[];
  muscleGroupsSets: WeeklyStrengthMuscleSetsRow[];
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

function stableSortByVolumeDesc<T extends { totalVolume: number }>(
  rows: T[],
  tieBreak: (a: T, b: T) => number,
): T[] {
  return rows.sort((a, b) => {
    if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume;
    return tieBreak(a, b);
  });
}

function stableSortBySetsDesc<T extends { totalSets: number }>(
  rows: T[],
  tieBreak: (a: T, b: T) => number,
): T[] {
  return rows.sort((a, b) => {
    if (b.totalSets !== a.totalSets) return b.totalSets - a.totalSets;
    return tieBreak(a, b);
  });
}

/** Earliest completion first: `ManualWorkoutDaySummary.startedAt` (journal session start / completion anchor). */
function sortWorkoutRowsByCompletionChronology(
  rows: WeeklyStrengthWorkoutRow[],
  summaries: ManualWorkoutDaySummary[],
): WeeklyStrengthWorkoutRow[] {
  const bySessionId = new Map(summaries.map((s) => [s.sessionId, s]));
  return [...rows].sort((a, b) => {
    const sa = bySessionId.get(a.workoutId)?.startedAt;
    const sb = bySessionId.get(b.workoutId)?.startedAt;
    const ma = sa != null && Number.isFinite(Date.parse(sa)) ? Date.parse(sa) : Number.POSITIVE_INFINITY;
    const mb = sb != null && Number.isFinite(Date.parse(sb)) ? Date.parse(sb) : Number.POSITIVE_INFINITY;
    if (ma !== mb) return ma - mb;
    return a.workoutId.localeCompare(b.workoutId);
  });
}

function normalizeName(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  return value.length > 0 ? value : null;
}

function isGenericSessionTitle(title: string): boolean {
  const normalized = normalizeName(title)?.toLowerCase();
  if (!normalized) return true;
  return normalized === "strength training" || normalized === "strength workout" || normalized === "workout";
}

function normalizedIsoMinute(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

function closestSessionDisplayTitleForSummary(
  summary: ManualWorkoutDaySummary,
  hints: readonly WeeklySessionDisplayHint[],
): string | null {
  const dayHints = hints
    .filter(
      (hint) =>
        hint.day === summary.day &&
        normalizeName(hint.displayTitle) != null &&
        !isGenericSessionTitle(hint.displayTitle),
    )
    .map((hint) => ({
      title: hint.displayTitle,
      ms: hint.startAt ? Date.parse(hint.startAt) : Number.NaN,
      minuteKey: normalizedIsoMinute(hint.startAt),
    }));
  if (dayHints.length === 0) return null;

  const summaryMinute = normalizedIsoMinute(summary.startedAt);
  if (summaryMinute) {
    const exact = dayHints.find((hint) => hint.minuteKey === summaryMinute);
    if (exact) return exact.title;
  }

  const summaryMs = summary.startedAt ? Date.parse(summary.startedAt) : Number.NaN;
  if (Number.isFinite(summaryMs)) {
    let best: { title: string; dist: number } | null = null;
    for (const hint of dayHints) {
      if (!Number.isFinite(hint.ms)) continue;
      const dist = Math.abs(hint.ms - summaryMs);
      if (best == null || dist < best.dist) {
        best = { title: hint.title, dist };
      }
    }
    if (best) return best.title;
  }

  return dayHints[0]?.title ?? null;
}

function deriveWorkoutName(
  summary: ManualWorkoutDaySummary,
  hints: readonly WeeklySessionDisplayHint[],
): string {
  const explicit = normalizeName(summary.customName);
  if (explicit) return explicit;

  const sessionLabel = normalizeName(closestSessionDisplayTitleForSummary(summary, hints));
  if (sessionLabel) return sessionLabel;

  const exerciseNames = summary.exercises
    .map((exercise) => normalizeName(exercise.name))
    .filter((name): name is string => name != null);

  if (exerciseNames.length === 1) return formatWorkoutTitle(exerciseNames[0]);
  if (exerciseNames.length === 2) return `${formatWorkoutTitle(exerciseNames[0])} + ${formatWorkoutTitle(exerciseNames[1])}`;
  if (exerciseNames.length > 2) {
    return `${formatWorkoutTitle(exerciseNames[0])} + ${exerciseNames.length - 1} more`;
  }
  return "Strength Training";
}

/** Session-level kg total: sum of canonical per-exercise volumes (matches detail page when both use the same exercises). */
function canonicalSessionVolumeKg(summary: ManualWorkoutDaySummary): number {
  return trainingVolumeKgForManualExercises(summary.exercises);
}

function defaultWeekKey(startDay: DayKey, endDay: DayKey): string {
  const start = startDay ?? "week";
  const end = endDay ?? start;
  return `${start}..${end}`;
}

export type BuildWeeklyStrengthCardModelOptions = {
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  weekKey?: string;
  /** Per reconciled session: `resolveWorkoutDisplay(representative, override).displayTitle` — matches day detail. */
  sessionDisplayHints?: readonly WeeklySessionDisplayHint[];
  /**
   * Unified analytics context (`resolveExerciseIntelligenceForAnalytics`).
   * Prefer passing `customExerciseById` from `listCustomExercises` for custom exercises.
   */
  analyticsContext?: ExerciseAnalyticsResolutionContext;
  /**
   * @deprecated Prefer `analyticsContext.customPrimaryMuscleGroupByExerciseId`.
   * Optional fallback primary-group mapping for custom exercise ids.
   */
  customPrimaryMuscleGroupByExerciseId?: ReadonlyMap<string, MuscleGroup>;
};

function mergeAnalyticsContext(options: BuildWeeklyStrengthCardModelOptions): ExerciseAnalyticsResolutionContext {
  const fromOption = options.analyticsContext;
  const out: ExerciseAnalyticsResolutionContext = {};
  if (fromOption?.customExerciseById != null) {
    out.customExerciseById = fromOption.customExerciseById;
  }
  const primaryMap =
    fromOption?.customPrimaryMuscleGroupByExerciseId ?? options.customPrimaryMuscleGroupByExerciseId;
  if (primaryMap != null) {
    out.customPrimaryMuscleGroupByExerciseId = primaryMap;
  }
  return out;
}

function countedSetCountForSetsTab(summaryExercise: ManualWorkoutDaySummary["exercises"][number]): number {
  let count = 0;
  for (const set of summaryExercise.sets) {
    if (set.isWarmup === true) continue;
    count += 1;
  }
  return count;
}

/** Builds deterministic weekly strength card data from weekly manual workout summaries. */
export function buildWeeklyStrengthCardModel(
  summaries: ManualWorkoutDaySummary[],
  options: BuildWeeklyStrengthCardModelOptions,
): WeeklyStrengthCardModel {
  const sessionDisplayHints = options.sessionDisplayHints ?? [];
  const analyticsCtx = mergeAnalyticsContext(options);
  const resolvedByExerciseId = new Map<string, ResolvedExerciseAnalytics>();
  const resolveCached = (exerciseId: string) => {
    let row = resolvedByExerciseId.get(exerciseId);
    if (row == null) {
      row = resolveExerciseIntelligenceForAnalytics(exerciseId, analyticsCtx);
      resolvedByExerciseId.set(exerciseId, row);
    }
    return row;
  };
  const daysInWeek = new Set(enumerateDaysInclusive(options.weekStartDay, options.weekEndDay));
  const weeklySummaries = summaries.filter((summary) => daysInWeek.has(summary.day));

  const workoutRows = weeklySummaries.map((summary) => ({
    workoutId: summary.sessionId,
    workoutName: deriveWorkoutName(summary, sessionDisplayHints),
    totalVolume: canonicalSessionVolumeKg(summary),
  }));

  const workouts = sortWorkoutRowsByCompletionChronology(workoutRows, weeklySummaries);
  const totalVolume = workouts.reduce((sum, row) => sum + row.totalVolume, 0);

  const muscleTotals = new Map<MuscleGroup, number>();
  const muscleSetsTotals = new Map<MuscleGroup, number>();
  for (const group of CANONICAL_MUSCLE_GROUP_ORDER) {
    muscleTotals.set(group, 0);
    muscleSetsTotals.set(group, 0);
  }

  for (const summary of weeklySummaries) {
    for (const exercise of summary.exercises) {
      const volumeKg = trainingVolumeKgForManualExercise(exercise);
      const exerciseId = normalizeName(exercise.exerciseId);
      if (!exerciseId) continue;
      const resolved = resolveCached(exerciseId);
      const contributions = resolved.contributions;

      if (
        resolved.hasContributionMap &&
        contributions != null &&
        contributions.length > 0 &&
        Number.isFinite(volumeKg) &&
        volumeKg > 0
      ) {
        for (const contribution of contributions) {
          const group = getMuscleGroupForSubgroup(contribution.subgroup);
          muscleTotals.set(group, (muscleTotals.get(group) ?? 0) + volumeKg * contribution.weight);
        }
      } else if (resolved.primaryMuscleGroup != null && Number.isFinite(volumeKg) && volumeKg > 0) {
        const g = resolved.primaryMuscleGroup;
        muscleTotals.set(g, (muscleTotals.get(g) ?? 0) + volumeKg);
      }

      const primary = resolved.primaryMuscleGroup;
      if (primary != null) {
        const contributingSets = countedSetCountForSetsTab(exercise);
        if (contributingSets > 0) {
          muscleSetsTotals.set(primary, (muscleSetsTotals.get(primary) ?? 0) + contributingSets);
        }
      }
    }
  }

  const muscleGroups = stableSortByVolumeDesc(
    CANONICAL_MUSCLE_GROUP_ORDER.map((muscleGroup) => ({
      muscleGroup,
      totalVolume: muscleTotals.get(muscleGroup) ?? 0,
    })).filter((row) => row.totalVolume > 0),
    (a, b) =>
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) -
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup),
  );

  const muscleGroupsSets = stableSortBySetsDesc(
    CANONICAL_MUSCLE_GROUP_ORDER.map((muscleGroup) => ({
      muscleGroup,
      totalSets: muscleSetsTotals.get(muscleGroup) ?? 0,
    })).filter((row) => row.totalSets > 0),
    (a, b) =>
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) -
      CANONICAL_MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup),
  );

  return {
    weekKey: options.weekKey ?? defaultWeekKey(options.weekStartDay, options.weekEndDay),
    totalWorkouts: workouts.length,
    totalVolume,
    workouts,
    muscleGroups,
    muscleGroupsSets,
  };
}
