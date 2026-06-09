// lib/data/program/workoutBuilderTypes.ts
/**
 * Workout Builder v1 — typed local draft + view-model types.
 *
 * These describe a *program draft* (authoring intent), distinct from canonical logged
 * workout truth. Nothing here is persisted; the draft is deterministic local seed data
 * (see buildDefaultWorkoutProgramDraft). The shapes are designed to grow toward the full
 * programming model (per-set tempo/RIR/BWR, weekly volume reconciliation) without reshaping.
 */

/** Days of the week, Sunday-first to match the seed schedule. */
export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export const WEEKDAYS: readonly Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Type/category of a training day in the weekly schedule. */
export type WorkoutTrainingDayType =
  | "upper"
  | "lower"
  | "full_body"
  | "cardio"
  | "recovery"
  | "rest";

export const WORKOUT_TRAINING_DAY_TYPES: readonly WorkoutTrainingDayType[] = [
  "upper",
  "lower",
  "full_body",
  "cardio",
  "recovery",
  "rest",
] as const;

/** Human label for a training day type. */
export const WORKOUT_TRAINING_DAY_TYPE_LABEL: Record<WorkoutTrainingDayType, string> = {
  upper: "Upper",
  lower: "Lower",
  full_body: "Full Body",
  cardio: "Cardio",
  recovery: "Recovery",
  rest: "Rest",
};

/** Standard training level. */
export type TrainingLevel = "beginner" | "intermediate" | "advanced";

/**
 * Program-domain weekly volume muscle targets. This is the *programming* taxonomy (delts split
 * into front/side/rear for volume planning) — intentionally distinct from the analytics
 * `MuscleGroup` taxonomy in lib/workouts/exercises/taxonomy.ts. A future selector can map
 * between the two; we do not force-fit here.
 */
export type ProgramMuscleTarget =
  | "chest"
  | "back"
  | "side_delts"
  | "rear_delts"
  | "front_delts"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export const PROGRAM_MUSCLE_TARGET_ORDER: readonly ProgramMuscleTarget[] = [
  "chest",
  "back",
  "side_delts",
  "rear_delts",
  "front_delts",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

export const PROGRAM_MUSCLE_TARGET_LABEL: Record<ProgramMuscleTarget, string> = {
  chest: "Chest",
  back: "Back",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  front_delts: "Front Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

/** Program setup fields. Kept as display-ready typed data (no hidden persistence). */
export type WorkoutProgramSetup = {
  name: string;
  goal: string;
  trainingLevel: TrainingLevel;
  durationWeeks: number;
  notes: string;
};

/** One day in the weekly schedule. `sessionName` is null for non-session days (rest). */
export type WorkoutScheduleDay = {
  weekday: Weekday;
  type: WorkoutTrainingDayType;
  sessionName: string | null;
};

/** A weekly volume target for a muscle group. */
export type MuscleVolumeTarget = {
  muscle: ProgramMuscleTarget;
  label: string;
  targetSetsPerWeek: number;
};

/**
 * A single prescribed exercise. `reps`/`tempo`/`rest`/`loadTarget` are display strings so v1 can
 * faithfully represent ranges (e.g. "8–10", "3-1-1", "2:00", "BWR 0.6 / RPE 8") without lossy parsing.
 */
export type WorkoutExercisePrescription = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  restSeconds: number;
  rir: number;
  /** Load or bodyweight-ratio target, e.g. "~72% 1RM" or "BWR 0.6". Null when unspecified. */
  loadTarget: string | null;
};

/** A drafted workout day (strength/full-body session with prescribed exercises). */
export type WorkoutDayDraft = {
  id: string;
  weekday: Weekday;
  sessionName: string;
  type: WorkoutTrainingDayType;
  exercises: WorkoutExercisePrescription[];
};

/** The complete typed workout program draft. */
export type WorkoutProgramDraft = {
  setup: WorkoutProgramSetup;
  schedule: WorkoutScheduleDay[];
  volumeTargets: MuscleVolumeTarget[];
  days: WorkoutDayDraft[];
};

/** Derived per-day summary for the Workout Days card. */
export type WorkoutDaySummary = {
  id: string;
  weekday: Weekday;
  sessionName: string;
  focusLabel: string;
  exerciseCount: number;
  estimatedSets: number;
  /** v1: deep day editing not in scope. */
  editable: boolean;
};

/** Derived review summary for the Review & Save card. */
export type WorkoutReviewSummary = {
  trainingDays: number;
  weeklySets: number;
  cardioSessions: number;
  recoveryRestDays: number;
  /** v1: persistence not approved. */
  saveEnabled: boolean;
  saveHint: string;
};

/** Complete view-model for the Workout Builder screen. */
export type WorkoutBuilderModel = {
  draft: WorkoutProgramDraft;
  daySummaries: WorkoutDaySummary[];
  exercisePreview: WorkoutExercisePrescription[];
  review: WorkoutReviewSummary;
};
