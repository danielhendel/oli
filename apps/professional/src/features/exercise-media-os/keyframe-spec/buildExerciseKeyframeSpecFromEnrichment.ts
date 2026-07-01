import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";
import { getExerciseLibraryEnrichmentById } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import type { ExerciseLibraryEnrichmentV1 } from "@oli/lib/workouts/exercises/enrichment/types";

import { isKnownOliCharacterId } from "../character-registry/oliCharacterRegistry";
import type { OliCharacterId } from "../character-registry/types";
import {
  EXERCISE_KEYFRAME_SPEC_VERSION,
  type ExerciseKeyframePose,
  type ExerciseKeyframePoseId,
  type ExerciseKeyframeSpec,
  type ExerciseKeyframeViewId,
  type KeyframeRenderTarget,
  type KeyframeSpecReviewStatus,
} from "./types";

const GLOBAL_NEGATIVE_CRITERIA = [
  "Watermark, logos, or readable text",
  "Warped barbell or equipment geometry",
  "Distorted hands or impossible anatomy",
  "Inconsistent character identity across frames",
  "Cropped equipment critical to exercise understanding",
] as const;

const DEFAULT_VIEWS: readonly ExerciseKeyframeViewId[] = ["front_45_right", "side"];

const FUTURE_VIDEO_BASELINE =
  "Video generation must be based on approved master keyframes only." as const;

function resolveExerciseName(exerciseId: string): string {
  const row = EXERCISE_LIBRARY_V1.find((entry) => entry.exerciseId === exerciseId);
  return row?.name ?? exerciseId;
}

function resolveCharacterId(
  enrichment: ExerciseLibraryEnrichmentV1,
): { readonly characterId: OliCharacterId | null; readonly warning?: string } {
  const preferred = enrichment.mediaProfile.preferredCharacterIds.find((id) =>
    isKnownOliCharacterId(id as OliCharacterId),
  );
  if (preferred) {
    return { characterId: preferred as OliCharacterId };
  }
  return {
    characterId: null,
    warning: `No valid preferredCharacterId in enrichment for ${enrichment.exerciseId}`,
  };
}

function mapReviewStatus(
  enrichmentStatus: ExerciseLibraryEnrichmentV1["reviewStatus"],
): KeyframeSpecReviewStatus {
  if (enrichmentStatus === "expert-reviewed") {
    return "expert-reviewed";
  }
  if (enrichmentStatus === "deprecated") {
    return "deprecated";
  }
  if (enrichmentStatus === "draft") {
    return "draft";
  }
  return "ready-for-expert-review";
}

function mapViews(requiredViews: readonly string[]): ExerciseKeyframeViewId[] {
  const mapped: ExerciseKeyframeViewId[] = [];
  for (const view of requiredViews) {
    if (view === "front_45_right" || view === "side" || view === "mobile_portrait_safe") {
      mapped.push(view);
    }
  }
  if (mapped.length === 0) {
    return [...DEFAULT_VIEWS];
  }
  return mapped;
}

function mapRenderTargets(targets: readonly string[]): KeyframeRenderTarget[] {
  const valid: KeyframeRenderTarget[] = [];
  for (const target of targets) {
    if (target === "16:9" || target === "9:16" || target === "1:1") {
      valid.push(target);
    }
  }
  if (!valid.includes("16:9")) {
    valid.unshift("16:9");
  }
  return valid;
}

function buildPoseFromRequirement(
  requirement: ExerciseLibraryEnrichmentV1["mediaProfile"]["keyframeRequirements"][number],
  requiredViews: readonly ExerciseKeyframeViewId[],
): ExerciseKeyframePose {
  return {
    poseId: requirement.poseId as ExerciseKeyframePoseId,
    label: requirement.poseLabel,
    purpose: requirement.coachingCaption,
    requiredViews: [...requiredViews],
    mustShow: requirement.acceptanceCriteria.slice(0, 4),
    acceptanceCriteria: requirement.acceptanceCriteria,
    negativeCriteria:
      requirement.negativeCriteria.length > 0
        ? requirement.negativeCriteria
        : [...GLOBAL_NEGATIVE_CRITERIA],
  };
}

function buildLandmarks(
  labels: readonly string[],
  prefix: "body" | "equipment",
): ExerciseKeyframeSpec["bodyLandmarks"] {
  return labels.slice(0, 3).map((label, index) => ({
    landmarkId: `${prefix}-${index + 1}`,
    label,
    description: label,
  }));
}

function buildKeyframeSetId(exerciseId: string): string {
  return `keyframe-set-v1-${exerciseId}`;
}

export type BuildExerciseKeyframeSpecFromEnrichmentResult = {
  readonly spec: ExerciseKeyframeSpec | null;
  readonly warnings: readonly string[];
};

/** Build an ExerciseKeyframeSpec from M12 enrichment media requirements. */
export function buildExerciseKeyframeSpecFromEnrichment(
  exerciseId: string,
): BuildExerciseKeyframeSpecFromEnrichmentResult {
  const warnings: string[] = [];
  const enrichment = getExerciseLibraryEnrichmentById(exerciseId);

  if (!enrichment) {
    return {
      spec: null,
      warnings: [`No enrichment metadata for exerciseId: ${exerciseId}`],
    };
  }

  if (enrichment.reviewStatus !== "expert-reviewed") {
    warnings.push("Enrichment is not expert-reviewed — spec is planning-only.");
  }

  const { characterId, warning: characterWarning } = resolveCharacterId(enrichment);
  if (characterWarning) {
    warnings.push(characterWarning);
  }
  if (!characterId) {
    return { spec: null, warnings };
  }

  const exerciseName = resolveExerciseName(exerciseId);
  const requiredViews = mapViews(enrichment.mediaProfile.requiredViews);
  const renderTargets = mapRenderTargets(enrichment.mediaProfile.renderTargets);

  const requiredPoses = [...enrichment.mediaProfile.keyframeRequirements]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((requirement) => buildPoseFromRequirement(requirement, requiredViews));

  const futureVideoNotes = [
    FUTURE_VIDEO_BASELINE,
    ...enrichment.mediaProfile.futureVideoQaFocus,
  ];

  const spec: ExerciseKeyframeSpec = {
    exerciseId,
    keyframeSetId: buildKeyframeSetId(exerciseId),
    keyframeVersion: EXERCISE_KEYFRAME_SPEC_VERSION,
    characterId,
    exerciseName,
    productionGoal: `Define keyframe production blueprint for ${exerciseName} from M12 enrichment media requirements.`,
    reviewStatus: mapReviewStatus(enrichment.reviewStatus),
    requiredPoses,
    requiredViews,
    renderTargets,
    equipmentRequirements: enrichment.mediaProfile.equipmentVisibilityRequirements,
    environmentRequirements: enrichment.mediaProfile.environmentRequirements,
    bodyRequirements: enrichment.mediaProfile.bodyVisibilityRequirements,
    bodyLandmarks: buildLandmarks(enrichment.mediaProfile.bodyVisibilityRequirements, "body"),
    equipmentLandmarks: buildLandmarks(
      enrichment.mediaProfile.equipmentVisibilityRequirements,
      "equipment",
    ),
    acceptanceCriteria: [
      `Consistent ${characterId} identity across all poses.`,
      "Premium dark Oli studio aesthetic.",
      "Clear on mobile portrait-safe crop.",
      "No watermark, logos, or readable text.",
      ...enrichment.mediaProfile.imageQaFocus,
    ],
    negativeCriteria: [...GLOBAL_NEGATIVE_CRITERIA],
    commonGenerationFailures: [...enrichment.mediaProfile.commonGenerationFailures],
    coachingIntent: enrichment.coachingProfile.clientFriendlySummary,
    qaFocus: enrichment.mediaProfile.imageQaFocus,
    futureVideoNotes,
  };

  return { spec, warnings };
}
