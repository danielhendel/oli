export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Kettlebell"
  | "Machine"
  | "Cable"
  | "Bodyweight"
  | "Band"
  | "MedicineBall"
  | "Sled"
  | "CardioMachine"
  | "Other";

/**
 * UI bucket labels (MUST remain stable to preserve existing UX).
 */
export type PrimaryBucket =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Core"
  | "Full body";

/**
 * Coarse muscle groups (used for future filtering/analytics; NOT necessarily displayed yet).
 */
export type MuscleGroupCoarse =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Core"
  | "Legs"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Hips"
  | "FullBody";

/**
 * Detailed/anatomical muscle groups (used for precision; NOT necessarily displayed yet).
 */
export type MuscleGroupDetailed =
  | "Pecs"
  | "UpperPecs"
  | "LowerPecs"
  | "Lats"
  | "Traps"
  | "UpperTraps"
  | "MidTraps"
  | "LowerTraps"
  | "Rhomboids"
  | "SpinalErectors"
  | "DeltsAnterior"
  | "DeltsMedial"
  | "DeltsPosterior"
  | "RotatorCuff"
  | "Biceps"
  | "Triceps"
  | "Brachialis"
  | "ForearmFlexors"
  | "ForearmExtensors"
  | "Abs"
  | "Obliques"
  | "TransverseAbdominis"
  | "HipFlexors"
  | "GluteMax"
  | "GluteMed"
  | "Adductors"
  | "Abductors"
  | "Quads"
  | "Hamstrings"
  | "Calves"
  | "TibialisAnterior";
