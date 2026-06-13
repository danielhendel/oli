// lib/data/program/programExerciseRecommendationTypes.ts
/**
 * Types for the Program Builder exercise STRUCTURE engine.
 *
 * The engine guides structure first — how many exercise slots a muscle group gets, how its weekly
 * sets are allocated, and which training day each slot lands on — and leaves the actual exercise
 * choice to the user. It does NOT prefill specific exercises. The user fills each slot from the
 * EXISTING exercise library (`lib/workouts/exercises/library.v1.ts`); there is no second library.
 *
 * Every selected exercise references a stable `exerciseId` that is used end-to-end by workout
 * logging and analytics, so program selections and historical logs share one identifier space.
 *
 * Pure data only — no IO, no React, no Firebase/API.
 */
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import type { MovementPattern } from "@/lib/workouts/exercises/metadata";
import type { Equipment } from "@/lib/workouts/exercises/taxonomy";

/**
 * One selectable exercise option, projected from a library item (bundled or custom). The
 * `exerciseId` is the stable log/analytics identifier and is never rewritten.
 */
export interface ProgramExerciseOption {
  exerciseId: string;
  name: string;
  equipment: Equipment;
  movement: MovementPattern;
  /** True when the exercise's PRIMARY muscles include the target group; false = secondary/assisting. */
  isPrimaryMatch: boolean;
  /** Library origin. Custom (user-created) exercises are surfaced as a lower-confidence tier. */
  origin: "bundled" | "custom";
}

/**
 * One exercise slot within a muscle group. Empty by default — the engine generates the slot
 * structure (sets, targets, day) but NOT a specific exercise. `source` is "empty" until the user
 * selects an exercise, then "manual".
 */
export interface ProgramExerciseSlot {
  /** Stable per-muscle slot id, e.g. `"upper_chest-slot-1"`. */
  slotId: string;
  muscleGroupId: ProgramDesignMuscleGroup;
  /** 1-based slot position. */
  position: number;
  /** Assigned training-day id (e.g. "day-1"), or null when no split is available. */
  dayId: string | null;
  /** Assigned training-day display name (custom-aware), or null. */
  dayName: string | null;
  /** Working sets allocated to this slot. */
  sets: number;
  repRange: string;
  rirTarget: string;
  rpeTarget: string;
  progressionModel: string;
  /** Stable exercise id the user selected, or null when the slot is still empty. */
  selectedExerciseId: string | null;
  /** Resolved display name of the selected exercise (safe even for archived ids), or null. */
  selectedExerciseName: string | null;
  /** "empty" = awaiting selection; "manual" = user-selected. */
  source: "empty" | "manual";
  /** Whether the training-day assignment was set by the engine or moved manually by the user. */
  dayAssignmentSource: "engine" | "manual";
}

/** Editable per-muscle structure settings (all reflect the draft store + engine). */
export interface ProgramMuscleGroupSettings {
  weeklySetTarget: number;
  frequencyPerWeek: number;
  exerciseCount: number;
  /** Training-day ids this muscle is assigned to (first `frequencyPerWeek` program days). */
  trainingDayIds: string[];
}

/** The full exercise plan for one muscle group: editable settings + (initially empty) slots. */
export interface ProgramMuscleGroupExercisePlan {
  muscleGroupId: ProgramDesignMuscleGroup;
  label: string;
  settings: ProgramMuscleGroupSettings;
  repRange: string;
  rirTarget: string;
  rpeTarget: string;
  progressionModel: string;
  slots: ProgramExerciseSlot[];
  /** Training-day display names this muscle is assigned to (custom-aware). */
  trainingDayNames: string[];
  /**
   * True when the library offers fewer than {@link MIN_DESIRED_SWAP_OPTIONS} real options for this
   * group (i.e. the library should be expanded). Never fabricates exercises to hide this.
   */
  libraryExpansionNeeded: boolean;
}

/** Manual per-slot exercise selections, keyed by muscle group then slot id. */
export type ProgramExerciseSelectionMap = Partial<
  Record<ProgramDesignMuscleGroup, Record<string, string>>
>;

/** Desired minimum number of options to present per slot when the library allows. */
export const MIN_DESIRED_SWAP_OPTIONS = 5;

/** Bounds for the editable per-muscle exercise count. */
export const EXERCISE_COUNT_MIN = 0;
export const EXERCISE_COUNT_MAX = 8;
