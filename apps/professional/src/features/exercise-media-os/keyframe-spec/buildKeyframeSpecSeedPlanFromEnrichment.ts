import { getExerciseLibraryEnrichmentById } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import type { KeyframeRequirement } from "@oli/lib/workouts/exercises/enrichment/types";
import { buildBenchPressKeyframeSpec } from "./buildBenchPressKeyframeSpec";
import type { ExerciseKeyframePoseId } from "./types";

export type KeyframeSpecSeedPlanStatus =
  | "missing-enrichment"
  | "seed-ready"
  | "needs-expert-review"
  | "blocked";

export type KeyframePosePlan = {
  readonly poseId: string;
  readonly poseLabel: string;
  readonly poseRole: KeyframeRequirement["poseRole"];
  readonly sortOrder: number;
  readonly requiredForImagePack: boolean;
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly coachingCaption: string;
};

export type KeyframeSpecSeedPlan = {
  readonly exerciseId: string;
  readonly characterIds: readonly string[];
  readonly requiredPoseCount: number;
  readonly requiredViews: readonly string[];
  readonly renderTargets: readonly string[];
  readonly keyframePosePlans: readonly KeyframePosePlan[];
  readonly commonGenerationFailures: readonly string[];
  readonly qaFocus: readonly string[];
  readonly status: KeyframeSpecSeedPlanStatus;
  readonly warnings: readonly string[];
};

const BENCH_PRESS_M9_POSE_IDS: readonly ExerciseKeyframePoseId[] = [
  "setup",
  "start_lockout",
  "bottom_chest_pause",
  "finish_lockout",
];

function mapKeyframeRequirement(requirement: KeyframeRequirement): KeyframePosePlan {
  return {
    poseId: requirement.poseId,
    poseLabel: requirement.poseLabel,
    poseRole: requirement.poseRole,
    sortOrder: requirement.sortOrder,
    requiredForImagePack: requirement.requiredForImagePack,
    acceptanceCriteria: requirement.acceptanceCriteria,
    negativeCriteria: requirement.negativeCriteria,
    coachingCaption: requirement.coachingCaption,
  };
}

function validateBenchPressAlignment(
  posePlans: readonly KeyframePosePlan[],
  warnings: string[],
): void {
  const m9Spec = buildBenchPressKeyframeSpec();
  const m9PoseIds = m9Spec.requiredPoses.map((p) => p.poseId);
  const seedPoseIds = posePlans.map((p) => p.poseId);

  for (const poseId of BENCH_PRESS_M9_POSE_IDS) {
    if (!seedPoseIds.includes(poseId)) {
      warnings.push(`bench_press seed plan missing M9 pose: ${poseId}`);
    }
    if (!m9PoseIds.includes(poseId as ExerciseKeyframePoseId)) {
      warnings.push(`M9 spec missing expected pose: ${poseId}`);
    }
  }
}

/** Translate enrichment media requirements into a keyframe spec seed plan. */
export function buildKeyframeSpecSeedPlanFromEnrichment(
  exerciseId: string,
): KeyframeSpecSeedPlan {
  const enrichment = getExerciseLibraryEnrichmentById(exerciseId);
  const warnings: string[] = [];

  if (!enrichment) {
    return {
      exerciseId,
      characterIds: [],
      requiredPoseCount: 0,
      requiredViews: [],
      renderTargets: [],
      keyframePosePlans: [],
      commonGenerationFailures: [],
      qaFocus: [],
      status: "missing-enrichment",
      warnings: ["No enrichment metadata — cannot seed keyframe spec."],
    };
  }

  const keyframePosePlans = enrichment.mediaProfile.keyframeRequirements
    .map(mapKeyframeRequirement)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (exerciseId === "bench_press") {
    validateBenchPressAlignment(keyframePosePlans, warnings);
  }

  const status: KeyframeSpecSeedPlanStatus =
    enrichment.reviewStatus === "expert-reviewed" ? "seed-ready" : "needs-expert-review";

  if (enrichment.reviewStatus !== "expert-reviewed") {
    warnings.push("Enrichment is not expert-reviewed — seed plan is planning-only.");
  }

  warnings.push("No approved media assets or image packs are created by this seed plan.");

  return {
    exerciseId,
    characterIds: enrichment.mediaProfile.preferredCharacterIds,
    requiredPoseCount: keyframePosePlans.filter((p) => p.requiredForImagePack).length,
    requiredViews: enrichment.mediaProfile.requiredViews,
    renderTargets: enrichment.mediaProfile.renderTargets,
    keyframePosePlans,
    commonGenerationFailures: enrichment.mediaProfile.commonGenerationFailures,
    qaFocus: enrichment.mediaProfile.imageQaFocus,
    status,
    warnings,
  };
}
