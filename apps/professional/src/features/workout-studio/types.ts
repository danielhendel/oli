/** Workout Studio domain types — prototype only, local state. */

import type { MediaComposerState } from "../exercise-media-os/types";

export const WORKOUT_BLOCK_TYPES = [
  "warmUp",
  "movementPrep",
  "activation",
  "primaryLift",
  "secondaryLift",
  "set",
  "accessory",
  "superset",
  "circuit",
  "conditioning",
  "coolDown",
  "mobility",
  "prehabRehab",
  "finisher",
  "reflection",
  "custom",
] as const;

export type WorkoutBlockType = (typeof WORKOUT_BLOCK_TYPES)[number];

export const WORKOUT_BLOCK_TYPE_LABELS: Record<WorkoutBlockType, string> = {
  warmUp: "Warm Up",
  movementPrep: "Movement Prep",
  activation: "Activation",
  primaryLift: "Primary Lift",
  secondaryLift: "Secondary Lift",
  set: "Set",
  accessory: "Accessory",
  superset: "Superset",
  circuit: "Circuit",
  conditioning: "Conditioning",
  coolDown: "Cool Down",
  mobility: "Mobility",
  prehabRehab: "Prehab / Rehab",
  finisher: "Finisher",
  reflection: "Reflection",
  custom: "Custom",
};

/** @deprecated — use WORKOUT_BLOCK_TYPES */
export const WORKOUT_SECTION_KINDS = WORKOUT_BLOCK_TYPES;

/** @deprecated — use WorkoutBlockType */
export type WorkoutSectionKind = WorkoutBlockType;

/** @deprecated — use WORKOUT_BLOCK_TYPE_LABELS */
export const WORKOUT_SECTION_LABELS = WORKOUT_BLOCK_TYPE_LABELS;

export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced" | "elite";

export type ExerciseSource = "canonical" | "custom";

export type ExerciseCoachingCue = {
  id: string;
  text: string;
};

export type ExerciseCommonMistake = {
  id: string;
  text: string;
};

export type ExerciseFeelGuide = {
  id: string;
  text: string;
};

export type ExerciseProgressionRule = {
  id: string;
  text: string;
};

/** Per-set prescription designed by the professional */
export type WorkoutDesignedSet = {
  setId: string;
  setNumber: number;
  reps: number | null;
  repRange: string;
  loadGuidance: string;
  rpeTarget: number | null;
  rirTarget: number | null;
  restSeconds: number | null;
  tempo: string;
  notes: string;
};

/** A) Professional design / education fields */
export type ExerciseDesignFields = {
  whyThisExercise: string;
  whyToday: string;
  coachingIntent: string;
  setupInstructions: string;
  executionInstructions: string;
  coachingCues: ExerciseCoachingCue[];
  commonMistakes: ExerciseCommonMistake[];
  shouldFeel: ExerciseFeelGuide[];
  shouldNotFeel: ExerciseFeelGuide[];
  educationNotes: string;
  mediaNotes: string;
};

/** B) Global prescription fallback — designedSets[] is primary */
export type ExercisePrescriptionFields = {
  sets: number | null;
  reps: number | null;
  repRange: string;
  loadGuidance: string;
  tempo: string;
  restSeconds: number | null;
  rirTarget: number | null;
  rpeTarget: number | null;
  failurePolicy: string;
};

export const LOGGING_FIELD_KINDS = [
  "weight",
  "reps",
  "setsCompleted",
  "rpe",
  "rir",
  "pain",
  "confidence",
  "techniqueQuality",
  "notes",
  "videoUrl",
] as const;

export type LoggingFieldKind = (typeof LOGGING_FIELD_KINDS)[number];

export const LOGGING_FIELD_LABELS: Record<LoggingFieldKind, string> = {
  weight: "Weight",
  reps: "Reps",
  setsCompleted: "Sets Completed",
  rpe: "RPE",
  rir: "RIR",
  pain: "Pain",
  confidence: "Confidence",
  techniqueQuality: "Technique Quality",
  notes: "Notes",
  videoUrl: "Video URL",
};

export type ExerciseLoggingField = {
  kind: LoggingFieldKind;
  enabled: boolean;
  label?: string;
};

/** C) Logging schema — aligns with journal strength_set_logged payload */
export type ExerciseLoggingSchema = {
  fields: ExerciseLoggingField[];
};

export type WorkoutExerciseCard = {
  /** Studio instance id */
  id: string;
  /** Canonical app exerciseId (snake_case) when source is canonical */
  exerciseId: string | null;
  source: ExerciseSource;
  exerciseName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  movementPattern: string | null;
  designedSets: WorkoutDesignedSet[];
  design: ExerciseDesignFields;
  prescription: ExercisePrescriptionFields;
  logging: ExerciseLoggingSchema;
  progressionRules: ExerciseProgressionRule[];
  regressionOptions: string[];
  substitutionOptions: string[];
  /** Media OS composer state — session/client media experience customization. */
  mediaComposer: MediaComposerState;
};

export type WorkoutBlock = {
  /** blockId */
  id: string;
  blockType: WorkoutBlockType;
  customTitle: string;
  notes: string;
  order: number;
  exercises: WorkoutExerciseCard[];
};

/** @deprecated — use WorkoutBlock */
export type WorkoutSection = WorkoutBlock;

/** Workout overview (formerly purpose) */
export type WorkoutOverview = {
  objective: string;
  desiredAdaptation: string;
  roleInHealthSystem: string;
};

/** @deprecated alias — use WorkoutOverview */
export type WorkoutPurpose = WorkoutOverview;

export type WorkoutExperience = {
  id: string;
  title: string;
  clientName: string;
  overview: WorkoutOverview;
  estimatedDurationMinutes: number | null;
  difficulty: WorkoutDifficulty;
  blocks: WorkoutBlock[];
  createdAt: string;
  updatedAt: string;
};

export type WorkoutPreviewExercise = {
  id: string;
  exerciseId: string | null;
  name: string;
  designedSets: WorkoutDesignedSet[];
  whyThisExercise: string;
  whyToday: string;
  what: string;
  why: string;
  how: string;
  cues: string[];
  shouldFeel: string[];
  shouldNotFeel: string[];
  commonMistakes: string[];
  progressionRules: string[];
  loggingFields: ExerciseLoggingField[];
  educationNotes: string;
};

export type WorkoutPreviewBlock = {
  id: string;
  blockType: WorkoutBlockType;
  title: string;
  notes: string;
  exercises: WorkoutPreviewExercise[];
};

/** @deprecated — use WorkoutPreviewBlock */
export type WorkoutPreviewSection = WorkoutPreviewBlock;

export type WorkoutExperiencePreview = {
  id: string;
  title: string;
  clientName: string;
  objective: string;
  desiredAdaptation: string;
  roleInHealthSystem: string;
  estimatedDurationMinutes: number | null;
  difficulty: WorkoutDifficulty;
  blocks: WorkoutPreviewBlock[];
};

/** @deprecated — use WorkoutExperiencePreview */
export type WorkoutPreview = WorkoutExperiencePreview;
