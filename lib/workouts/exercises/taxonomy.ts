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
 * Refines "Machine" for gym-aware availability. Only used when equipment === "Machine".
 * Subtypes match actual catalog entries (e.g. machine_leg_press_vertical → LegPress).
 */
export type MachineSubtype =
  | "LegPress"
  | "LegExtension"
  | "LegCurl"
  | "CalfRaise"
  | "ChestPress"
  | "PecFly"
  | "ChestFly"
  | "ShoulderPress"
  | "LateralRaise"
  | "RearDeltFly"
  | "Pulldown"
  | "Row"
  | "BicepCurl"
  | "PreacherCurl"
  | "TricepDip"
  | "HipAbduction"
  | "HipAdduction"
  | "BackExtension"
  | "InclineChestPress"
  | "DeclineChestPress"
  | "VerticalChestPress"
  | "SmithMachine";

/**
 * Refines "CardioMachine" for gym-aware availability. Only used when equipment === "CardioMachine".
 */
export type CardioSubtype =
  | "Treadmill"
  | "Rower"
  | "StationaryBike"
  | "AssaultBike"
  | "Elliptical"
  | "StairClimber"
  | "SkiErg";

/** Optional refinement for Machine or CardioMachine. Improves trust of gym filtering. */
export type EquipmentSubtype = MachineSubtype | CardioSubtype;

/**
 * Small helper to turn an equipment subtype into a user-friendly label.
 * Keeps casing stable and inserts spaces between words (e.g. LegPress → "Leg press").
 */
export function formatEquipmentSubtypeLabel(subtype: EquipmentSubtype): string {
  const withSpaces = subtype.replace(/([A-Z])/g, " $1").trim();
  if (!withSpaces) return subtype;
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

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
