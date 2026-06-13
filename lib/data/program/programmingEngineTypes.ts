// lib/data/program/programmingEngineTypes.ts
/**
 * Types for the Program Design Programming Engine.
 *
 * The engine is a pure, deterministic function: given the six user inputs it produces a full
 * training prescription (weekly sets by muscle, frequency, rep range, RIR/RPE, progression model,
 * and a weekly-split day structure). No IO, no React, no Firebase/API. See
 * {@link ./buildProgrammingPrescription} for the orchestrator.
 */
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  ProgramGoal,
  ProgramVolumeSex,
  TrainingType,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** Whether a prescribed value came from the engine or was manually overridden by the user. */
export type ProgrammingSource = "engine" | "manual";

/**
 * Role of a muscle group for intensity prescription. "primary" = heavy compound-driven groups
 * (chest, back, quads, hams, glutes); "accessory" = smaller/isolation groups. Some training types
 * (Powerlifting, Athletic Performance) prescribe different rep/RIR by role.
 */
export type MuscleRole = "primary" | "accessory";

/** Rep range + proximity-to-failure targets for a block of work. Strings keep ranges faithful. */
export type IntensityPrescription = {
  /** e.g. "5–15". */
  repRange: string;
  /** Reps-in-reserve target, e.g. "1–2" or "3". */
  rirTarget: string;
  /** RPE target, e.g. "8–9". */
  rpeTarget: string;
};

/** The complete generated (or overridden) prescription for one muscle group. */
export type MusclePrescription = {
  muscleGroupId: ProgramDesignMuscleGroup;
  label: string;
  weeklySets: number;
  frequencyPerWeek: number;
  repRange: string;
  rirTarget: string;
  rpeTarget: string;
  progressionModel: string;
  source: ProgrammingSource;
};

/** One day in the generated weekly split. */
export type ProgrammingSplitDay = {
  /** Stable position id, e.g. "day-1". */
  id: string;
  name: string;
  source: ProgrammingSource;
};

/** The validated inputs required to generate a prescription. */
export type ProgrammingInputs = {
  sex: ProgramVolumeSex;
  /** Informational; does not alter the prescription math in the current engine spec. */
  age: number | null;
  trainingLevel: ProgramDesignTrainingLevel;
  /** 2..6 training days per week. */
  trainingDays: number;
  /** Informational; see {@link ProgramGoal}. */
  goal: ProgramGoal | null;
  trainingType: TrainingType;
};

/** Manual customizations layered on top of the engine output (survive regeneration). */
export type ProgrammingOverrides = {
  muscleVolume?: Partial<Record<ProgramDesignMuscleGroup, number>>;
  /** Per-muscle weekly frequency override (times trained per week); clamped to 1..trainingDays. */
  frequency?: Partial<Record<ProgramDesignMuscleGroup, number>>;
  splitDayNames?: Record<string, string>;
};

/** The full generated prescription returned by the engine. */
export type ProgrammingPrescription = {
  inputs: ProgrammingInputs;
  /** One entry per canonical muscle group, in {@link PROGRAM_DESIGN_MUSCLE_GROUP_ORDER}. */
  muscles: MusclePrescription[];
  totalWeeklySets: number;
  weeklySplit: { dayCount: number; days: ProgrammingSplitDay[] };
  progressionModel: string;
  /** Headline intensity (primary-role work) shown in the preview. */
  headline: IntensityPrescription;
  /** Frequency span across trained muscles, for the preview summary. */
  frequencyRange: { min: number; max: number };
};
