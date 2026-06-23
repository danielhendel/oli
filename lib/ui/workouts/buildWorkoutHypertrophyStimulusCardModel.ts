/**
 * UI adapter for post-workout hypertrophy stimulus summary (derived only).
 * Pure — no React, no IO.
 */

import {
  buildHypertrophyStimulusSessionSummary,
  type HypertrophyStimulusSessionSetInput,
} from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusSessionSummary";
import type { RegionalStimulusV1 } from "@/lib/workouts/exercises/intelligence/exerciseIntelligenceV1Types";

export const WORKOUT_HYPERTROPHY_STIMULUS_CARD_TITLE = "Muscle Stimulus" as const;

export type WorkoutHypertrophyStimulusCompletedSetInput = {
  exerciseId: string;
  reps: number;
  loadKg?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
};

export type BuildWorkoutHypertrophyStimulusCardModelInput = {
  sessionId: string;
  sets: readonly WorkoutHypertrophyStimulusCompletedSetInput[];
};

export type WorkoutHypertrophyStimulusRegionRow = {
  label: string;
  stimulusLabel: string;
};

export type WorkoutHypertrophyStimulusCardModel = {
  title: typeof WORKOUT_HYPERTROPHY_STIMULUS_CARD_TITLE;
  topRegions: readonly WorkoutHypertrophyStimulusRegionRow[];
  estimatedFatigue: string;
  recoveryDemand: string;
  fallbackNote: string | null;
};

const REGION_DISPLAY_LABELS: Record<keyof RegionalStimulusV1, string> = {
  upperChest: "Upper chest",
  midChest: "Chest",
  lowerChest: "Lower chest",
  lats: "Lats",
  upperBack: "Upper back",
  frontDelts: "Front delts",
  sideDelts: "Side delts",
  rearDelts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  forearms: "Forearms",
  tibialis: "Tibialis",
};

const TOP_REGION_LIMIT = 3;
const FALLBACK_NOTE_MIN_EXERCISES = 2;
const FALLBACK_NOTE_MAJORITY_RATIO = 0.5;

function formatRoundedStimulus(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 10) return value.toFixed(1);
  return String(Math.round(value));
}

function formatWorkloadBand(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Minimal";
  if (value < 15) return "Low";
  if (value < 40) return "Moderate";
  return "High";
}

function buildFallbackNote(fallbackCount: number, totalExercises: number): string | null {
  if (fallbackCount <= 0 || totalExercises <= 0) return null;
  if (fallbackCount === totalExercises) {
    return "Stimulus estimates aren't available for these exercises yet.";
  }
  if (
    fallbackCount >= FALLBACK_NOTE_MIN_EXERCISES ||
    fallbackCount / totalExercises >= FALLBACK_NOTE_MAJORITY_RATIO
  ) {
    return "Some exercises aren't in the stimulus catalog yet.";
  }
  return null;
}

function countUniqueExercises(
  sets: readonly WorkoutHypertrophyStimulusCompletedSetInput[],
): number {
  const ids = new Set<string>();
  for (const set of sets) {
    if (set.isWarmup === true) continue;
    const exerciseId = set.exerciseId.trim();
    if (exerciseId.length > 0) ids.add(exerciseId);
  }
  return ids.size;
}

function toSessionSets(
  sets: readonly WorkoutHypertrophyStimulusCompletedSetInput[],
): HypertrophyStimulusSessionSetInput[] {
  const out: HypertrophyStimulusSessionSetInput[] = [];
  for (const set of sets) {
    if (set.isWarmup === true) continue;
    const exerciseId = set.exerciseId.trim();
    if (exerciseId.length === 0) continue;
    if (!Number.isFinite(set.reps) || set.reps <= 0) continue;
    const row: HypertrophyStimulusSessionSetInput = {
      exerciseId,
      reps: set.reps,
    };
    if (set.loadKg !== undefined) row.loadKg = set.loadKg;
    if (set.rpe !== undefined) row.rpe = set.rpe;
    out.push(row);
  }
  return out;
}

/** Map manual workout exercise summaries into flat hypertrophy stimulus set inputs. */
export function mapManualWorkoutExercisesToHypertrophyStimulusSets(
  exercises: readonly {
    exerciseId: string;
    sets: readonly {
      reps: number | null;
      weightKg?: number | null;
      intensity?: number | null;
      isWarmup?: boolean;
    }[];
  }[],
): WorkoutHypertrophyStimulusCompletedSetInput[] {
  const sets: WorkoutHypertrophyStimulusCompletedSetInput[] = [];
  for (const exercise of exercises) {
    const exerciseId = exercise.exerciseId.trim();
    if (exerciseId.length === 0) continue;
    for (const set of exercise.sets) {
      if (set.isWarmup === true) continue;
      if (typeof set.reps !== "number" || !Number.isFinite(set.reps) || set.reps <= 0) continue;
      const row: WorkoutHypertrophyStimulusCompletedSetInput = {
        exerciseId,
        reps: set.reps,
      };
      if (set.weightKg !== undefined) row.loadKg = set.weightKg;
      if (set.intensity !== undefined) row.rpe = set.intensity;
      sets.push(row);
    }
  }
  return sets;
}

/**
 * Build a display-safe Muscle Stimulus card model for a completed workout.
 * Returns null when there are no countable working sets (card hidden).
 */
export function buildWorkoutHypertrophyStimulusCardModel(
  input: BuildWorkoutHypertrophyStimulusCardModelInput,
): WorkoutHypertrophyStimulusCardModel | null {
  const sessionSets = toSessionSets(input.sets);
  if (sessionSets.length === 0) return null;

  const summary = buildHypertrophyStimulusSessionSummary({
    sessionId: input.sessionId,
    sets: sessionSets,
  });

  const topRegions = summary.topStimulusRegions.slice(0, TOP_REGION_LIMIT).map((row) => ({
    label: REGION_DISPLAY_LABELS[row.region],
    stimulusLabel: formatRoundedStimulus(row.stimulus),
  }));

  const totalExercises = countUniqueExercises(input.sets);

  return {
    title: WORKOUT_HYPERTROPHY_STIMULUS_CARD_TITLE,
    topRegions,
    estimatedFatigue: formatWorkloadBand(summary.estimatedFatigue),
    recoveryDemand: formatWorkloadBand(summary.recoveryDemand),
    fallbackNote: buildFallbackNote(summary.sourceCounts.fallback, totalExercises),
  };
}
