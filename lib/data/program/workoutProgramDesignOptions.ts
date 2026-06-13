// lib/data/program/workoutProgramDesignOptions.ts
/**
 * Static option taxonomies + labels for Workout Program Design.
 *
 * Pure data only (no IO, no React). Single source of truth for the order and human labels of every
 * Program Design category (Sex, Age, Training Level, Training Days, Goal, Training Type). Screens,
 * the summary builder, and the engine read from here so the UI and tests never re-declare lists.
 */
import type {
  ProgramDesignCategoryId,
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  ProgramGoal,
  ProgramVolumeSex,
  TrainingType,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** A selectable option for single-select category screens. */
export type ProgramDesignOption<TId extends string> = {
  id: TId;
  label: string;
  /** Optional coach-style explainer shown under the label (Training Level, Goal, Training Type). */
  description?: string;
};

// ── Sex ───────────────────────────────────────────────────────────────────────
export const PROGRAM_DESIGN_SEX_ORDER: readonly ProgramVolumeSex[] = ["male", "female"] as const;

export const PROGRAM_DESIGN_SEX_LABEL: Record<ProgramVolumeSex, string> = {
  male: "Male",
  female: "Female",
};

export const PROGRAM_DESIGN_SEX_OPTIONS: readonly ProgramDesignOption<ProgramVolumeSex>[] =
  PROGRAM_DESIGN_SEX_ORDER.map((id) => ({ id, label: PROGRAM_DESIGN_SEX_LABEL[id] }));

// ── Age ─────────────────────────────────────────────────────────────────────--
export const PROGRAM_DESIGN_AGE_MIN = 13;
export const PROGRAM_DESIGN_AGE_MAX = 90;

/** Human label for an age, e.g. 28 → "28 years". */
export function formatAgeLabel(age: number): string {
  return `${age} ${age === 1 ? "year" : "years"}`;
}

/** Age options as string-id selectable rows (id is the age as a string). */
export const PROGRAM_DESIGN_AGE_OPTIONS: readonly ProgramDesignOption<string>[] = Array.from(
  { length: PROGRAM_DESIGN_AGE_MAX - PROGRAM_DESIGN_AGE_MIN + 1 },
  (_unused, index) => {
    const age = PROGRAM_DESIGN_AGE_MIN + index;
    return { id: String(age), label: formatAgeLabel(age) };
  },
);

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

export const PROGRAM_DESIGN_TRAINING_LEVEL_DESCRIPTION: Record<
  ProgramDesignTrainingLevel,
  string
> = {
  beginner: "0–1 years; learning technique and consistency",
  novice: "1–2 years; building repeatable strength and volume tolerance",
  intermediate: "2–5 years; structured progression and higher weekly volume",
  advanced: "5–10 years; specialized volume, intensity, and recovery management",
  elite: "10+ years; highly individualized programming",
};

export const PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS: readonly ProgramDesignOption<ProgramDesignTrainingLevel>[] =
  PROGRAM_DESIGN_TRAINING_LEVEL_ORDER.map((id) => ({
    id,
    label: PROGRAM_DESIGN_TRAINING_LEVEL_LABEL[id],
    description: PROGRAM_DESIGN_TRAINING_LEVEL_DESCRIPTION[id],
  }));

// ── Training Days ─────────────────────────────────────────────────────────────
export const TRAINING_DAYS_MIN = 2;
export const TRAINING_DAYS_MAX = 6;

/** All selectable training-day counts, 2..6. */
export const TRAINING_DAYS_COUNT_OPTIONS: readonly number[] = Array.from(
  { length: TRAINING_DAYS_MAX - TRAINING_DAYS_MIN + 1 },
  (_unused, index) => TRAINING_DAYS_MIN + index,
);

/** Human label for a day count, e.g. 4 → "4 days". */
export function formatTrainingDaysLabel(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Training-day options as string-id selectable rows (id is the day count as a string). */
export const TRAINING_DAYS_OPTIONS: readonly ProgramDesignOption<string>[] =
  TRAINING_DAYS_COUNT_OPTIONS.map((days) => ({
    id: String(days),
    label: formatTrainingDaysLabel(days),
  }));

// ── Goal ──────────────────────────────────────────────────────────────────────
export const PROGRAM_DESIGN_GOAL_ORDER: readonly ProgramGoal[] = [
  "general_health",
  "build_muscle",
  "gain_strength",
  "lose_fat",
  "athletic_performance",
] as const;

export const PROGRAM_DESIGN_GOAL_LABEL: Record<ProgramGoal, string> = {
  general_health: "General Health",
  build_muscle: "Build Muscle",
  gain_strength: "Gain Strength",
  lose_fat: "Lose Fat",
  athletic_performance: "Athletic Performance",
};

export const PROGRAM_DESIGN_GOAL_DESCRIPTION: Record<ProgramGoal, string> = {
  general_health: "Balanced strength, cardio, recovery, and consistency",
  build_muscle: "Maximize hypertrophy with progressive volume",
  gain_strength: "Improve force output and key lift performance",
  lose_fat: "Preserve muscle while improving energy balance and conditioning",
  athletic_performance: "Improve athletic output, power, speed, and work capacity",
};

export const PROGRAM_DESIGN_GOAL_OPTIONS: readonly ProgramDesignOption<ProgramGoal>[] =
  PROGRAM_DESIGN_GOAL_ORDER.map((id) => ({
    id,
    label: PROGRAM_DESIGN_GOAL_LABEL[id],
    description: PROGRAM_DESIGN_GOAL_DESCRIPTION[id],
  }));

// ── Training Type ─────────────────────────────────────────────────────────────
export const TRAINING_TYPE_ORDER: readonly TrainingType[] = [
  "general_fitness",
  "hypertrophy",
  "strength",
  "powerlifting",
  "athletic_performance",
  "conditioning",
] as const;

export const TRAINING_TYPE_LABEL: Record<TrainingType, string> = {
  general_fitness: "General Fitness",
  hypertrophy: "Hypertrophy",
  strength: "Strength",
  powerlifting: "Powerlifting",
  athletic_performance: "Athletic Performance",
  conditioning: "Conditioning",
};

export const TRAINING_TYPE_DESCRIPTION: Record<TrainingType, string> = {
  general_fitness: "Balanced strength and health",
  hypertrophy: "Muscle growth and physique development",
  strength: "High-force training with lower rep ranges",
  powerlifting: "Squat, bench, and deadlift performance",
  athletic_performance: "Power, speed, movement quality",
  conditioning: "Work capacity, circuits, density, and endurance support",
};

export const TRAINING_TYPE_OPTIONS: readonly ProgramDesignOption<TrainingType>[] =
  TRAINING_TYPE_ORDER.map((id) => ({
    id,
    label: TRAINING_TYPE_LABEL[id],
    description: TRAINING_TYPE_DESCRIPTION[id],
  }));

// ── Muscle Group Volume (used by the generated prescription + stepper) ─────────
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

const PROGRAM_DESIGN_MUSCLE_GROUP_SET: ReadonlySet<string> = new Set(
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
);

/** Type guard for a Program Design muscle group id (e.g. validating a route param). */
export function isProgramDesignMuscleGroup(value: string): value is ProgramDesignMuscleGroup {
  return PROGRAM_DESIGN_MUSCLE_GROUP_SET.has(value);
}

/** Per-muscle weekly set bounds + step used by the stepper UI when overriding generated values. */
export const MUSCLE_VOLUME_MIN_SETS = 0;
export const MUSCLE_VOLUME_MAX_SETS = 30;
export const MUSCLE_VOLUME_STEP_SETS = 1;

/** Stable id for the nth (1-based) split day. Shared by the engine + overrides. */
export function weeklySplitDayId(position: number): string {
  return `day-${position}`;
}

// ── Category metadata (rows on the Program Design card) ────────────────────────
export const PROGRAM_DESIGN_CATEGORY_ORDER: readonly ProgramDesignCategoryId[] = [
  "sex",
  "age",
  "trainingLevel",
  "trainingDays",
  "goal",
  "trainingType",
] as const;

export const PROGRAM_DESIGN_CATEGORY_TITLE: Record<ProgramDesignCategoryId, string> = {
  sex: "Sex",
  age: "Age",
  trainingLevel: "Training Level",
  trainingDays: "Training Days",
  goal: "Goal",
  trainingType: "Training Type",
};

/**
 * Destination routes for each category setup page. Single source of truth for navigation;
 * these resolve to app/(app)/program/workout/* (see the route files).
 */
export const PROGRAM_DESIGN_CATEGORY_ROUTE: Record<ProgramDesignCategoryId, string> = {
  sex: "/(app)/program/workout/sex",
  age: "/(app)/program/workout/age",
  trainingLevel: "/(app)/program/workout/training-level",
  trainingDays: "/(app)/program/workout/training-days",
  goal: "/(app)/program/workout/goal",
  trainingType: "/(app)/program/workout/training-type",
};

/** Routes for the generated-program customization pages (reached from the preview). */
export const PROGRAM_DESIGN_MUSCLE_VOLUME_ROUTE = "/(app)/program/workout/muscle-group-volume";
export const PROGRAM_DESIGN_WEEKLY_SPLIT_ROUTE = "/(app)/program/workout/weekly-split";

/** Base path for the per-muscle-group exercise pages (reached from the Muscle Group Volume card). */
function programMuscleGroupBasePath(muscleGroupId: ProgramDesignMuscleGroup): string {
  return `/(app)/program/workout/muscle-group/${muscleGroupId}`;
}

/** Main per-muscle-group exercise selection page. */
export function programMuscleGroupExercisesRoute(muscleGroupId: ProgramDesignMuscleGroup): string {
  return programMuscleGroupBasePath(muscleGroupId);
}

/** Editable metric on a muscle group exercise page. */
export type ProgramMuscleMetric =
  | "weekly-set-target"
  | "frequency"
  | "exercise-count"
  | "training-days";

/** Edit page for one muscle-group metric (weekly set target, frequency, exercise count, training days). */
export function programMuscleGroupMetricRoute(
  muscleGroupId: ProgramDesignMuscleGroup,
  metric: ProgramMuscleMetric,
): string {
  return `${programMuscleGroupBasePath(muscleGroupId)}/${metric}`;
}

/** Exercise selection page for one slot (used for both "Select exercise" and "Swap"). */
export function programExerciseSlotRoute(
  muscleGroupId: ProgramDesignMuscleGroup,
  slotId: string,
): string {
  return `${programMuscleGroupBasePath(muscleGroupId)}/exercise-slot/${slotId}`;
}

/** Day workout page for one training-split day (reached from the Weekly Split card). */
export function programDayWorkoutRoute(dayId: string): string {
  return `/(app)/program/workout/day/${dayId}`;
}

/** Empty-state label shared across all category rows. */
export const PROGRAM_DESIGN_NOT_SET_LABEL = "Not set";
