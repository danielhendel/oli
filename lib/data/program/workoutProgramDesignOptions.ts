// lib/data/program/workoutProgramDesignOptions.ts
/**
 * Static option taxonomies + labels for Workout Program Design.
 *
 * Pure data only (no IO, no React). Single source of truth for the order and human labels
 * of every Program Design category. Screens and the summary builder read from here so the
 * UI and tests never re-declare option lists.
 */
import type {
  ProgramDesignCategoryId,
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  WeeklySplitDay,
  WorkoutProgramType,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** A selectable option for single-select category screens. */
export type ProgramDesignOption<TId extends string> = {
  id: TId;
  label: string;
};

// ── Type ────────────────────────────────────────────────────────────────────
export const WORKOUT_PROGRAM_TYPE_ORDER: readonly WorkoutProgramType[] = [
  "hypertrophy",
  "power_lifting",
  "strength_training",
  "functional_training",
  "circuit_training",
] as const;

export const WORKOUT_PROGRAM_TYPE_LABEL: Record<WorkoutProgramType, string> = {
  hypertrophy: "Hypertrophy",
  power_lifting: "Power Lifting",
  strength_training: "Strength Training",
  functional_training: "Functional Training",
  circuit_training: "Circuit Training",
};

export const WORKOUT_PROGRAM_TYPE_OPTIONS: readonly ProgramDesignOption<WorkoutProgramType>[] =
  WORKOUT_PROGRAM_TYPE_ORDER.map((id) => ({ id, label: WORKOUT_PROGRAM_TYPE_LABEL[id] }));

// ── Training Level ────────────────────────────────────────────────────────────
export const PROGRAM_DESIGN_TRAINING_LEVEL_ORDER: readonly ProgramDesignTrainingLevel[] = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const;

export const PROGRAM_DESIGN_TRAINING_LEVEL_LABEL: Record<ProgramDesignTrainingLevel, string> = {
  beginner: "Beginner",
  novice: "Novice",
  intermediate: "Intermediate",
  advanced: "Advanced",
  elite: "Elite",
};

export const PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS: readonly ProgramDesignOption<ProgramDesignTrainingLevel>[] =
  PROGRAM_DESIGN_TRAINING_LEVEL_ORDER.map((id) => ({
    id,
    label: PROGRAM_DESIGN_TRAINING_LEVEL_LABEL[id],
  }));

// ── Duration ──────────────────────────────────────────────────────────────────
export const PROGRAM_DURATION_MIN_WEEKS = 1;
export const PROGRAM_DURATION_MAX_WEEKS = 52;

/** All selectable durations, 1..52 weeks. */
export const PROGRAM_DURATION_WEEK_OPTIONS: readonly number[] = Array.from(
  { length: PROGRAM_DURATION_MAX_WEEKS - PROGRAM_DURATION_MIN_WEEKS + 1 },
  (_unused, index) => PROGRAM_DURATION_MIN_WEEKS + index,
);

/** Human label for a week count, e.g. 1 → "1 week", 8 → "8 weeks". */
export function formatDurationWeeksLabel(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/** Duration options as string-id selectable rows (id is the week number as a string). */
export const PROGRAM_DURATION_OPTIONS: readonly ProgramDesignOption<string>[] =
  PROGRAM_DURATION_WEEK_OPTIONS.map((weeks) => ({
    id: String(weeks),
    label: formatDurationWeeksLabel(weeks),
  }));

// ── Muscle Group Volume ───────────────────────────────────────────────────────
export const PROGRAM_DESIGN_MUSCLE_GROUP_ORDER: readonly ProgramDesignMuscleGroup[] = [
  "upper_chest",
  "mid_chest",
  "lats",
  "upper_back",
  "front_delts",
  "side_delts",
  "rear_delts",
  "triceps",
  "biceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "lower_traps",
  "rotator_cuff",
  "adductors",
  "forearms",
  "neck",
  "tibialis",
] as const;

export const PROGRAM_DESIGN_MUSCLE_GROUP_LABEL: Record<ProgramDesignMuscleGroup, string> = {
  upper_chest: "Upper Chest",
  mid_chest: "Mid Chest",
  lats: "Lats",
  upper_back: "Upper Back",
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  triceps: "Triceps",
  biceps: "Biceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  lower_traps: "Lower Traps",
  rotator_cuff: "Rotator Cuff",
  adductors: "Adductors",
  forearms: "Forearms",
  neck: "Neck",
  tibialis: "Tibialis",
};

/** Per-muscle weekly set bounds + step used by the stepper UI. */
export const MUSCLE_VOLUME_MIN_SETS = 0;
export const MUSCLE_VOLUME_MAX_SETS = 30;
export const MUSCLE_VOLUME_STEP_SETS = 1;

// ── Weekly Split ──────────────────────────────────────────────────────────────
export const WEEKLY_SPLIT_MIN_DAYS = 2;
export const WEEKLY_SPLIT_MAX_DAYS = 6;

/** All selectable training-day counts, 2..6. */
export const WEEKLY_SPLIT_DAY_COUNT_OPTIONS: readonly number[] = Array.from(
  { length: WEEKLY_SPLIT_MAX_DAYS - WEEKLY_SPLIT_MIN_DAYS + 1 },
  (_unused, index) => WEEKLY_SPLIT_MIN_DAYS + index,
);

/** Stable id for the nth (1-based) split day. */
export function weeklySplitDayId(position: number): string {
  return `day-${position}`;
}

// ── Category metadata (rows on the Program Design card) ────────────────────────
export const PROGRAM_DESIGN_CATEGORY_ORDER: readonly ProgramDesignCategoryId[] = [
  "type",
  "trainingLevel",
  "duration",
  "muscleGroupVolume",
  "weeklySplit",
] as const;

export const PROGRAM_DESIGN_CATEGORY_TITLE: Record<ProgramDesignCategoryId, string> = {
  type: "Type",
  trainingLevel: "Training Level",
  duration: "Duration",
  muscleGroupVolume: "Muscle Group Volume",
  weeklySplit: "Weekly Split",
};

/**
 * Destination routes for each category setup page. Single source of truth for navigation;
 * these resolve to app/(app)/program/workout/* (see the route files).
 */
export const PROGRAM_DESIGN_CATEGORY_ROUTE: Record<ProgramDesignCategoryId, string> = {
  type: "/(app)/program/workout/type",
  trainingLevel: "/(app)/program/workout/training-level",
  duration: "/(app)/program/workout/duration",
  muscleGroupVolume: "/(app)/program/workout/muscle-group-volume",
  weeklySplit: "/(app)/program/workout/weekly-split",
};

/** Empty-state label shared across all category rows. */
export const PROGRAM_DESIGN_NOT_SET_LABEL = "Not set";

/**
 * Build the day list for a chosen day count, preserving previously entered names by position.
 * Pure: returns a fresh array; callers own the resulting `WeeklySplitDraft`.
 */
export function buildWeeklySplitDays(
  dayCount: number,
  previous: readonly WeeklySplitDay[] = [],
): WeeklySplitDay[] {
  return Array.from({ length: dayCount }, (_unused, index) => {
    const id = weeklySplitDayId(index + 1);
    const existing = previous[index];
    return { id, name: existing ? existing.name : "" };
  });
}
