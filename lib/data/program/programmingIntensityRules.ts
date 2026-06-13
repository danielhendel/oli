// lib/data/program/programmingIntensityRules.ts
/**
 * Intensity + progression rules for the Programming Engine (step 7).
 *
 * Pure data + pure functions only. Maps (training type, training level, muscle role) → rep range,
 * RIR target, RPE target, and (training type) → progression model.
 *
 * SCIENTIFIC INTENT (encoded from the spec):
 *  - Hypertrophy: moderate-to-high reps; failure proximity increases with level.
 *  - Strength: lower reps, higher intensity, more conservative failure exposure by level.
 *  - Powerlifting: main lifts low reps / high intensity; accessories moderate reps. (Role-split.)
 *  - Athletic Performance: avoids failure, prioritizes power quality. (Role-split.)
 *  - Conditioning: higher reps, lower failure proximity, density/work-capacity framing.
 *  - General Fitness: balanced, sustainable moderate work. (Defaults — not given in spec.)
 */
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  TrainingType,
} from "@/lib/data/program/workoutProgramDesignTypes";
import type {
  IntensityPrescription,
  MuscleRole,
} from "@/lib/data/program/programmingEngineTypes";

/**
 * Primary-role (heavy compound-driven) muscle groups. Everything else is accessory. Used by
 * training types that prescribe different intensity for main lifts vs accessories.
 */
export const PRIMARY_ROLE_MUSCLES: ReadonlySet<ProgramDesignMuscleGroup> = new Set([
  "mid_chest",
  "upper_chest",
  "lats",
  "upper_back",
  "quads",
  "hamstrings",
  "glutes",
]);

/** Classify a muscle group as a primary (compound) or accessory mover. */
export function muscleRole(muscle: ProgramDesignMuscleGroup): MuscleRole {
  return PRIMARY_ROLE_MUSCLES.has(muscle) ? "primary" : "accessory";
}

/** Hypertrophy intensity by level (rep range widens with experience; failure proximity rises). */
export const HYPERTROPHY_INTENSITY: Record<ProgramDesignTrainingLevel, IntensityPrescription> = {
  beginner: { repRange: "8–15", rirTarget: "3", rpeTarget: "7" },
  novice: { repRange: "6–15", rirTarget: "2–3", rpeTarget: "7–8" },
  intermediate: { repRange: "5–15", rirTarget: "1–2", rpeTarget: "8–9" },
  advanced: { repRange: "5–15", rirTarget: "0–2", rpeTarget: "8–10" },
  elite: { repRange: "4–15", rirTarget: "0–1", rpeTarget: "9–10" },
};

/** Strength intensity by level (lower reps, higher intensity). */
export const STRENGTH_INTENSITY: Record<ProgramDesignTrainingLevel, IntensityPrescription> = {
  beginner: { repRange: "5–8", rirTarget: "3", rpeTarget: "7" },
  novice: { repRange: "4–8", rirTarget: "2–3", rpeTarget: "7–8" },
  intermediate: { repRange: "3–8", rirTarget: "1–2", rpeTarget: "8–9" },
  advanced: { repRange: "2–6", rirTarget: "1", rpeTarget: "9" },
  elite: { repRange: "1–5", rirTarget: "0–1", rpeTarget: "9–10" },
};

/** Powerlifting intensity by muscle role (main lifts vs accessories). Level-independent. */
const POWERLIFTING_INTENSITY: Record<MuscleRole, IntensityPrescription> = {
  primary: { repRange: "1–5", rirTarget: "0–2", rpeTarget: "8–9" },
  accessory: { repRange: "6–12", rirTarget: "1–2", rpeTarget: "7–8" },
};

/** Athletic Performance intensity by role. Avoids failure (high RIR), prioritizes quality. */
const ATHLETIC_INTENSITY: Record<MuscleRole, IntensityPrescription> = {
  primary: { repRange: "3–6", rirTarget: "2–3", rpeTarget: "7" },
  accessory: { repRange: "1–5", rirTarget: "3–4", rpeTarget: "6–7" },
};

/** General Fitness — balanced moderate work (spec gave a progression model but no intensity). */
const GENERAL_FITNESS_INTENSITY: IntensityPrescription = {
  repRange: "8–12",
  rirTarget: "2–3",
  rpeTarget: "7",
};

/** Conditioning — higher reps, sub-failure, density-focused. */
const CONDITIONING_INTENSITY: IntensityPrescription = {
  repRange: "12–20",
  rirTarget: "3–4",
  rpeTarget: "6",
};

/**
 * Resolve the intensity prescription for a (training type, level, role) tuple. Role only matters
 * for Powerlifting and Athletic Performance; the other types prescribe a single per-level dose.
 */
export function getIntensityPrescription(
  type: TrainingType,
  level: ProgramDesignTrainingLevel,
  role: MuscleRole,
): IntensityPrescription {
  switch (type) {
    case "hypertrophy":
      return HYPERTROPHY_INTENSITY[level];
    case "strength":
      return STRENGTH_INTENSITY[level];
    case "powerlifting":
      return POWERLIFTING_INTENSITY[role];
    case "athletic_performance":
      return ATHLETIC_INTENSITY[role];
    case "conditioning":
      return CONDITIONING_INTENSITY;
    case "general_fitness":
      return GENERAL_FITNESS_INTENSITY;
  }
}

/** Progression model per training type. */
export const PROGRESSION_MODEL: Record<TrainingType, string> = {
  general_fitness: "Linear progression",
  hypertrophy: "Double progression",
  strength: "Load progression (top set + back-off)",
  powerlifting: "Percentage / RPE based",
  athletic_performance: "Quality-first progression",
  conditioning: "Density progression",
};

/** Return the progression model name for a training type. */
export function getProgressionModel(type: TrainingType): string {
  return PROGRESSION_MODEL[type];
}
