import { buildExerciseMediaBlueprint } from "./buildExerciseMediaBlueprint";
import {
  buildBenchPressPilotMasterMediaPackage,
  isBenchPressPilotExercise,
} from "./data/benchPressMasterMediaPackage";
import {
  DIFFICULTY_LEVELS,
  MASTER_MEDIA_PACKAGE_VERSION,
  TEACHING_STYLES,
  VISUAL_EMPHASIS_OPTIONS,
  type ExerciseMediaBlueprint,
  type MasterMediaPackage,
  type MasterMediaPackageStatus,
} from "./types";

function computePackageStatus(slots: MasterMediaPackage["slots"]): MasterMediaPackageStatus {
  if (slots.length === 0) return "missing";
  const approved = slots.filter((slot) => slot.status === "approved").length;
  const planned = slots.filter((slot) => slot.status === "planned").length;
  if (approved === slots.length) return "complete";
  if (planned === slots.length) return "planned";
  if (approved > 0 || planned > 0) return "partial";
  return "missing";
}

function computeQualityScore(slots: MasterMediaPackage["slots"]): number {
  if (slots.length === 0) return 0;
  const weights: Record<MasterMediaPackage["slots"][number]["status"], number> = {
    missing: 0,
    planned: 60,
    draft: 70,
    reviewed: 85,
    approved: 100,
  };
  const total = slots.reduce((sum, slot) => sum + weights[slot.status], 0);
  return Math.round(total / slots.length);
}

/** Planned master media package — all slots planned, no asset URLs. */
export function buildPlannedMasterMediaPackage(
  blueprint: ExerciseMediaBlueprint,
): MasterMediaPackage {
  const slots = [...blueprint.requiredSlots, ...blueprint.optionalSlots].map((slot) => ({
    ...slot,
    status: "planned" as const,
  }));

  const estimatedDurationSeconds = slots.reduce(
    (sum, slot) => sum + slot.recommendedDurationSeconds,
    0,
  );

  return {
    exerciseId: blueprint.exerciseId,
    packageVersion: MASTER_MEDIA_PACKAGE_VERSION,
    status: computePackageStatus(slots),
    slots,
    availableTeachingStyles: [...TEACHING_STYLES],
    availableDifficultyLevels: [...DIFFICULTY_LEVELS],
    availableVisualEmphasis: [...VISUAL_EMPHASIS_OPTIONS],
    estimatedDurationSeconds,
    qualityScore: computeQualityScore(slots),
  };
}

export function buildPlannedMasterMediaPackageForExercise(input: {
  exerciseId: string;
  exerciseName: string;
}): MasterMediaPackage {
  return resolveMasterMediaPackage(buildExerciseMediaBlueprint(input));
}

/** Resolve planned or pilot master package for an exercise blueprint. */
export function resolveMasterMediaPackage(blueprint: ExerciseMediaBlueprint): MasterMediaPackage {
  if (isBenchPressPilotExercise(blueprint.exerciseId)) {
    return buildBenchPressPilotMasterMediaPackage();
  }
  return buildPlannedMasterMediaPackage(blueprint);
}
