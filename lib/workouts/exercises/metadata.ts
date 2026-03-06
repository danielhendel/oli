/**
 * Deterministic exercise metadata: equipment, primary muscle, cues, description.
 * Offline-first; no network. Used for list subtitles and detail modal.
 */

import type {
  Equipment,
  PrimaryBucket,
  MuscleGroupCoarse,
  MuscleGroupDetailed,
} from "./taxonomy";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";

export type MovementPattern =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "carry"
  | "core"
  | "isolation"
  | "lunge"
  | "rotation"
  | "gait";

export type TrainingType =
  | "mobility"
  | "strength"
  | "power"
  | "functional"
  | "conditioning"
  | "isolation";

export type ExerciseMeta = {
  equipment: Equipment;
  primary: PrimaryBucket;
  movement: MovementPattern;
  trainingType: TrainingType;
  cues: string[];
  description: string;
  primaryCoarse: MuscleGroupCoarse[];
  secondaryCoarse: MuscleGroupCoarse[];
  primaryDetailed: MuscleGroupDetailed[];
  secondaryDetailed: MuscleGroupDetailed[];
};

function genericCues(movement: MovementPattern, trainingType: TrainingType): string[] {
  if (trainingType === "mobility")
    return ["Move slowly", "Breathe steadily", "Stay within a comfortable range"];
  if (trainingType === "conditioning")
    return ["Maintain steady effort", "Focus on smooth pacing", "Breathe steadily"];
  if (trainingType === "power")
    return ["Stay braced", "Move explosively with control", "Reset between reps as needed"];

  switch (movement) {
    case "squat":
      return ["Stay braced", "Control the descent", "Drive up smoothly"];
    case "hinge":
      return ["Hinge at the hips", "Keep the torso stable", "Control the return"];
    case "push":
      return ["Keep the torso stable", "Press smoothly", "Control the return"];
    case "pull":
      return ["Set your posture", "Pull smoothly", "Control the return"];
    case "carry":
      return ["Stand tall", "Keep ribs down", "Walk with control"];
    case "lunge":
      return ["Stay balanced", "Control the descent", "Drive up smoothly"];
    case "rotation":
      return ["Move smoothly", "Control rotation", "Keep the torso stable"];
    case "gait":
      return ["Keep a steady rhythm", "Relax shoulders", "Breathe steadily"];
    case "isolation":
      return [
        "Move with control",
        "Avoid swinging",
        "Use a comfortable range of motion",
      ];
    case "core":
      return ["Brace gently", "Breathe steadily", "Control the movement"];
    default:
      return [
        "Move with control",
        "Maintain a stable torso",
        "Use a comfortable range of motion",
      ];
  }
}

function genericDescription(name: string, trainingType: TrainingType): string {
  if (trainingType === "mobility")
    return `${name} is used to improve mobility and range of motion.`;
  if (trainingType === "conditioning")
    return `${name} is used for conditioning and general fitness.`;
  if (trainingType === "power")
    return `${name} is used to develop power and athletic performance.`;
  if (trainingType === "functional")
    return `${name} is used to build functional strength and control.`;
  if (trainingType === "isolation")
    return `${name} targets a specific muscle group with controlled reps.`;
  return `${name} is used to build strength with controlled reps.`;
}

const DEFAULT_META: ExerciseMeta = {
  equipment: "Other",
  primary: "Full body",
  movement: "core",
  trainingType: "functional",
  cues: [
    "Move with control",
    "Maintain a stable torso",
    "Use a comfortable range of motion",
  ],
  description:
    "This exercise is used to support general fitness and movement.",
  primaryCoarse: ["FullBody"],
  secondaryCoarse: [],
  primaryDetailed: [],
  secondaryDetailed: [],
};

const META_BY_ID: Record<string, ExerciseMeta> = Object.fromEntries(
  EXERCISE_LIBRARY_V1.map((x) => [
    x.exerciseId,
    {
      equipment: x.equipment,
      primary: x.primaryBucket,
      movement: x.movement,
      trainingType: x.trainingType,
      cues: x.cues ?? genericCues(x.movement, x.trainingType),
      description: x.description ?? genericDescription(x.name, x.trainingType),
      primaryCoarse: x.primaryCoarse,
      secondaryCoarse: x.secondaryCoarse,
      primaryDetailed: x.primaryDetailed,
      secondaryDetailed: x.secondaryDetailed,
    } satisfies ExerciseMeta,
  ])
);


/**
 * Returns deterministic metadata for an exercise. Unknown ids get a safe default.
 */
export function getExerciseMeta(exerciseId: string): ExerciseMeta {
  return META_BY_ID[exerciseId] ?? DEFAULT_META;
}
