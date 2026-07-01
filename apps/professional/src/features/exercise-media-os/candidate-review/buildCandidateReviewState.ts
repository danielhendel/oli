import {
  CANDIDATE_REVIEW_VERSION,
  type BuildCandidateReviewStateInput,
  type CandidateReviewNextAction,
  type CandidateReviewState,
  type CandidateReviewStatus,
  type ExerciseMediaCandidate,
  type ImagePackReadinessStatus,
  type MissingKeyframeRequirement,
} from "./types";
import { CANDIDATE_REVIEW_STATUSES } from "./types";

function emptyStatusCounts(): Record<CandidateReviewStatus, number> {
  return CANDIDATE_REVIEW_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CandidateReviewStatus, number>,
  );
}

function groupCandidatesByStatus(
  candidates: readonly ExerciseMediaCandidate[],
): Partial<Record<CandidateReviewStatus, readonly ExerciseMediaCandidate[]>> {
  const groups: Partial<Record<CandidateReviewStatus, ExerciseMediaCandidate[]>> = {};

  for (const candidate of candidates) {
    const bucket = groups[candidate.status] ?? [];
    bucket.push(candidate);
    groups[candidate.status] = bucket;
  }

  return groups;
}

function countByStatus(
  candidates: readonly ExerciseMediaCandidate[],
): Record<CandidateReviewStatus, number> {
  const counts = emptyStatusCounts();
  for (const candidate of candidates) {
    counts[candidate.status] += 1;
  }
  return counts;
}

function deriveMissingKeyframeRequirements(
  input: BuildCandidateReviewStateInput,
): MissingKeyframeRequirement[] {
  if (!input.keyframeSpec) {
    return [];
  }

  const missing: MissingKeyframeRequirement[] = [];

  for (const pose of input.keyframeSpec.requiredPoses) {
    const imageCandidates = input.candidates.filter(
      (candidate) =>
        candidate.assetType === "image" && candidate.keyframePoseId === pose.poseId,
    );

    if (imageCandidates.length === 0) {
      missing.push({
        poseId: pose.poseId,
        label: pose.label,
        reason: "No image candidate exists for required keyframe pose.",
      });
    }
  }

  return missing;
}

function resolveImagePackReadiness(
  input: BuildCandidateReviewStateInput,
  missingRequirements: readonly MissingKeyframeRequirement[],
  approvedMasterImages: readonly ExerciseMediaCandidate[],
): ImagePackReadinessStatus {
  if (!input.keyframeSpec) {
    return "missing";
  }

  const requiredPoseCount = input.keyframeSpec.requiredPoses.length;

  if (requiredPoseCount === 0) {
    return "missing";
  }

  if (missingRequirements.length === requiredPoseCount) {
    return "missing";
  }

  const approvedPoseIds = new Set(
    approvedMasterImages
      .filter((candidate) => candidate.assetType === "image" && candidate.keyframePoseId)
      .map((candidate) => candidate.keyframePoseId as string),
  );

  const allPosesApproved = input.keyframeSpec.requiredPoses.every((pose) =>
    approvedPoseIds.has(pose.poseId),
  );

  if (allPosesApproved) {
    return "approved-master-ready";
  }

  const hasReviewable = input.candidates.some(
    (candidate) =>
      candidate.assetType === "image" &&
      (candidate.status === "draft" ||
        candidate.status === "dev-test" ||
        candidate.status === "needs-revision"),
  );

  if (hasReviewable || missingRequirements.length < requiredPoseCount) {
    return missingRequirements.length > 0 ? "incomplete" : "review-ready";
  }

  return "incomplete";
}

function resolveNextAction(
  input: BuildCandidateReviewStateInput,
  missingRequirements: readonly MissingKeyframeRequirement[],
  devTestCandidates: readonly ExerciseMediaCandidate[],
  needsRevisionCandidates: readonly ExerciseMediaCandidate[],
  imagePackReadiness: ImagePackReadinessStatus,
): CandidateReviewNextAction {
  if (!input.keyframeSpec) {
    return {
      actionId: "await-keyframe-spec",
      label: "Candidate review will unlock after keyframe spec exists.",
    };
  }

  const firstMissing = missingRequirements[0];
  if (firstMissing) {
    return {
      actionId: "generate-keyframe-candidate",
      label: `Generate ${firstMissing.label} keyframe candidate.`,
      poseId: firstMissing.poseId,
    };
  }

  const devTestHero = devTestCandidates.find(
    (candidate) => candidate.assetType === "video" && candidate.mediaSlotId?.includes("heroDemo"),
  );
  if (devTestHero) {
    return {
      actionId: "review-dev-test-candidate",
      label: "Review dev-test hero demo candidate — not approved master.",
      candidateId: devTestHero.candidateId,
    };
  }

  const revise = needsRevisionCandidates[0];
  if (revise) {
    return {
      actionId: "revise-candidate",
      label: `Revise candidate ${revise.candidateId}.`,
      candidateId: revise.candidateId,
      poseId: revise.keyframePoseId,
    };
  }

  if (imagePackReadiness === "approved-master-ready") {
    return {
      actionId: "approve-image-pack",
      label: "All keyframe poses have approved-master candidates — ready for image pack assembly (Sprint M11).",
    };
  }

  return {
    actionId: "none",
    label: "Continue candidate review.",
  };
}

function buildWarnings(
  input: BuildCandidateReviewStateInput,
  slotMetadataApproved: boolean,
  playableAssetCount: number,
): string[] {
  const warnings: string[] = [];

  if (slotMetadataApproved && playableAssetCount === 0) {
    warnings.push(
      "Approved master package slot metadata does not equal approved-master candidate status.",
    );
  }

  if (playableAssetCount === 0) {
    warnings.push("Missing playable asset manifest entries do not create approved-master candidates.");
  }

  const devTestCount = input.candidates.filter((candidate) => candidate.status === "dev-test").length;
  if (devTestCount > 0) {
    warnings.push("Dev-test candidates are for local playback/testing only — not approved master.");
  }

  return warnings;
}

/** Build grouped candidate review state for an exercise. */
export function buildCandidateReviewState(
  input: BuildCandidateReviewStateInput,
): CandidateReviewState {
  const candidates = input.candidates;
  const statusCounts = countByStatus(candidates);
  const candidatesByStatus = groupCandidatesByStatus(candidates);

  const approvedMasterCandidates = candidates.filter(
    (candidate) => candidate.status === "approved-master",
  );
  const devTestCandidates = candidates.filter((candidate) => candidate.status === "dev-test");
  const needsRevisionCandidates = candidates.filter(
    (candidate) => candidate.status === "needs-revision",
  );
  const rejectedCandidates = candidates.filter((candidate) => candidate.status === "rejected");

  const missingKeyframeRequirements = deriveMissingKeyframeRequirements(input);
  const imagePackReadiness = resolveImagePackReadiness(
    input,
    missingKeyframeRequirements,
    approvedMasterCandidates,
  );

  const playableAssetCount = input.playableAssetCount ?? 0;
  const slotMetadataApproved = input.slotMetadataApproved ?? false;

  const warnings = buildWarnings(input, slotMetadataApproved, playableAssetCount);

  return {
    version: CANDIDATE_REVIEW_VERSION,
    exerciseId: input.exerciseId,
    characterId: input.keyframeSpec?.characterId,
    totalCandidates: candidates.length,
    statusCounts,
    candidatesByStatus,
    missingKeyframeRequirements,
    approvedMasterCandidates,
    devTestCandidates,
    needsRevisionCandidates,
    rejectedCandidates,
    playableCandidateCount: candidates.filter(
      (candidate) => candidate.status === "approved-master" && candidate.localAsset.existsInRepo,
    ).length,
    imageCandidateCount: candidates.filter((candidate) => candidate.assetType === "image").length,
    videoCandidateCount: candidates.filter((candidate) => candidate.assetType === "video").length,
    imagePackReadiness,
    nextRecommendedAction: resolveNextAction(
      input,
      missingKeyframeRequirements,
      devTestCandidates,
      needsRevisionCandidates,
      imagePackReadiness,
    ),
    warnings,
    slotMetadataDoesNotEqualApprovedCandidate: slotMetadataApproved && approvedMasterCandidates.length === 0,
    missingPlayableAssetDoesNotEqualApprovedCandidate:
      playableAssetCount === 0 && approvedMasterCandidates.length === 0,
  };
}
