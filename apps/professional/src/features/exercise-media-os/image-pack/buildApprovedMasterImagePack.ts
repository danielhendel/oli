import { buildCandidateQaScore } from "../candidate-review/buildCandidateQaScore";
import type { ExerciseMediaCandidate } from "../candidate-review/types";
import type { ExerciseKeyframePoseId } from "../keyframe-spec/types";
import type { MediaAssetAspectRatio } from "../types";
import {
  APPROVED_MASTER_MINIMUM_SCORE,
  BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER,
  type ApprovedMasterImageFrame,
  type ApprovedMasterImagePack,
  type BuildApprovedMasterImagePackInput,
  type ImagePackCoverageLevel,
  type ImagePackStatus,
} from "./types";

type PoseRenderKey = `${ExerciseKeyframePoseId}:${MediaAssetAspectRatio}`;

function poseRenderKey(poseId: ExerciseKeyframePoseId, renderTarget: MediaAssetAspectRatio): PoseRenderKey {
  return `${poseId}:${renderTarget}`;
}

function isEligibleImageCandidate(
  candidate: ExerciseMediaCandidate,
  input: BuildApprovedMasterImagePackInput,
): boolean {
  if (candidate.assetType !== "image") {
    return false;
  }
  if (candidate.exerciseId !== input.keyframeSpec.exerciseId) {
    return false;
  }
  if (candidate.characterId !== input.keyframeSpec.characterId) {
    return false;
  }
  if (!candidate.keyframePoseId) {
    return false;
  }
  if (candidate.status !== "approved-master") {
    return false;
  }
  if (input.requireFilesInRepo !== false && !candidate.localAsset.existsInRepo) {
    return false;
  }

  const qaScore = buildCandidateQaScore({
    qa: candidate.qa,
    rights: candidate.rights,
    status: candidate.status,
  });

  return qaScore.approvalEligible;
}

function compareCandidatesForSelection(a: ExerciseMediaCandidate, b: ExerciseMediaCandidate): number {
  const scoreA = buildCandidateQaScore({ qa: a.qa, rights: a.rights, status: a.status }).score;
  const scoreB = buildCandidateQaScore({ qa: b.qa, rights: b.rights, status: b.status }).score;
  if (scoreB !== scoreA) return scoreB - scoreA;
  if (b.updatedAt !== a.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
  return a.candidateId.localeCompare(b.candidateId);
}

function selectBestCandidate(
  candidates: readonly ExerciseMediaCandidate[],
  poseId: ExerciseKeyframePoseId,
  renderTarget: MediaAssetAspectRatio,
  input: BuildApprovedMasterImagePackInput,
): ExerciseMediaCandidate | undefined {
  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.keyframePoseId === poseId &&
        candidate.renderTarget === renderTarget &&
        isEligibleImageCandidate(candidate, input),
    )
    .sort(compareCandidatesForSelection);

  return eligible[0];
}

function buildFrameFromCandidate(
  candidate: ExerciseMediaCandidate,
  sortOrder: number,
): ApprovedMasterImageFrame {
  return {
    frameId: `frame-${candidate.keyframePoseId}-${candidate.renderTarget}-${candidate.candidateId}`,
    exerciseId: candidate.exerciseId,
    keyframePoseId: candidate.keyframePoseId!,
    characterId: candidate.characterId,
    candidateId: candidate.candidateId,
    renderTarget: candidate.renderTarget,
    publicPath: candidate.localAsset.expectedPublicPath,
    altText: `Bench Press ${candidate.keyframePoseId} keyframe`,
    coachingCaption: candidate.reviewerNotes[0] ?? `Keyframe: ${candidate.keyframePoseId}`,
    sortOrder,
  };
}

function resolveCoverageLevel(
  frames: readonly ApprovedMasterImageFrame[],
  requiredRenderTargets: readonly MediaAssetAspectRatio[],
  requiredPoseCount: number,
): ImagePackCoverageLevel {
  if (frames.length === 0) return "none";

  const posesByTarget = new Map<MediaAssetAspectRatio, Set<ExerciseKeyframePoseId>>();
  for (const frame of frames) {
    const set = posesByTarget.get(frame.renderTarget) ?? new Set();
    set.add(frame.keyframePoseId);
    posesByTarget.set(frame.renderTarget, set);
  }

  const allTargetsComplete = requiredRenderTargets.every(
    (target) => (posesByTarget.get(target)?.size ?? 0) >= requiredPoseCount,
  );

  if (allTargetsComplete && requiredRenderTargets.length >= 3) {
    return "multi-target-complete";
  }
  if ((posesByTarget.get("16:9")?.size ?? 0) >= requiredPoseCount) {
    return "master-16x9";
  }
  if ((posesByTarget.get("9:16")?.size ?? 0) >= requiredPoseCount) {
    return "mobile-portrait";
  }
  if ((posesByTarget.get("1:1")?.size ?? 0) >= requiredPoseCount) {
    return "thumbnail";
  }
  return "none";
}

function computeQaSummary(frames: readonly ApprovedMasterImageFrame[], candidates: readonly ExerciseMediaCandidate[]): ApprovedMasterImagePack["qaSummary"] {
  const frameCandidates = frames
    .map((frame) => candidates.find((c) => c.candidateId === frame.candidateId))
    .filter((c): c is ExerciseMediaCandidate => c !== undefined);

  const scores = frameCandidates.map(
    (c) => buildCandidateQaScore({ qa: c.qa, rights: c.rights, status: c.status }).score,
  );

  const hardGateFailureCount = frameCandidates.reduce(
    (sum, c) =>
      sum +
      buildCandidateQaScore({ qa: c.qa, rights: c.rights, status: c.status }).hardGateFailures.length,
    0,
  );

  const rightsCleared = frameCandidates.every(
    (c) =>
      c.rights.usageStatus === "cleared-for-oli-master" &&
      c.rights.allowsCommercialUse &&
      c.rights.allowsClientPlayback &&
      !c.rights.requiresAttribution &&
      !c.rights.containsWatermark &&
      !c.rights.containsLogosOrReadableText,
  );

  return {
    minimumScore: scores.length === 0 ? 0 : Math.min(...scores),
    averageScore:
      scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    hardGateFailureCount,
    rightsCleared,
  };
}

function resolvePackStatus(
  requiredPoseIds: readonly ExerciseKeyframePoseId[],
  approvedPoseIds: readonly ExerciseKeyframePoseId[],
  incompletePoseIds: readonly ExerciseKeyframePoseId[],
  missingPoseIds: readonly ExerciseKeyframePoseId[],
  qaSummary: ApprovedMasterImagePack["qaSummary"],
  frames: readonly ApprovedMasterImageFrame[],
): ImagePackStatus {
  if (frames.length === 0 && missingPoseIds.length === requiredPoseIds.length) {
    return "missing";
  }

  const allPosesApproved =
    requiredPoseIds.length > 0 &&
    requiredPoseIds.every((poseId) => approvedPoseIds.includes(poseId));

  if (
    allPosesApproved &&
    missingPoseIds.length === 0 &&
    incompletePoseIds.length === 0 &&
    qaSummary.hardGateFailureCount === 0 &&
    qaSummary.rightsCleared &&
    qaSummary.minimumScore >= APPROVED_MASTER_MINIMUM_SCORE
  ) {
    return "approved-master";
  }

  if (incompletePoseIds.length > 0 || missingPoseIds.length > 0) {
    return frames.length > 0 ? "incomplete" : "missing";
  }

  return "review-ready";
}

/** Build an approved master image pack from keyframe spec and candidates. */
export function buildApprovedMasterImagePack(
  input: BuildApprovedMasterImagePackInput,
): ApprovedMasterImagePack {
  const { keyframeSpec, requiredRenderTargets } = input;
  const requiredPoseIds = keyframeSpec.requiredPoses.map((pose) => pose.poseId);
  const warnings: string[] = [];
  const frames: ApprovedMasterImageFrame[] = [];
  const usedKeys = new Set<PoseRenderKey>();

  for (const pose of keyframeSpec.requiredPoses) {
    for (const renderTarget of requiredRenderTargets) {
      const candidate = selectBestCandidate(
        input.candidates,
        pose.poseId,
        renderTarget,
        input,
      );

      if (candidate) {
        const key = poseRenderKey(pose.poseId, renderTarget);
        if (!usedKeys.has(key)) {
          usedKeys.add(key);
          frames.push(
            buildFrameFromCandidate(
              candidate,
              BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER[pose.poseId] ?? frames.length + 1,
            ),
          );
        }
      }
    }
  }

  frames.sort((a, b) => a.sortOrder - b.sortOrder);

  const approvedPoseIds = [
    ...new Set(frames.map((frame) => frame.keyframePoseId)),
  ] as ExerciseKeyframePoseId[];

  const missingPoseIds = requiredPoseIds.filter(
    (poseId) => !approvedPoseIds.includes(poseId),
  );

  const incompletePoseIds: ExerciseKeyframePoseId[] = [];
  for (const poseId of requiredPoseIds) {
    const hasAnyCandidate = input.candidates.some(
      (c) => c.assetType === "image" && c.keyframePoseId === poseId,
    );
    const hasApproved = approvedPoseIds.includes(poseId);
    if (hasAnyCandidate && !hasApproved) {
      incompletePoseIds.push(poseId);
    }
  }

  const qaSummary = computeQaSummary(frames, input.candidates);
  const coverageLevel = resolveCoverageLevel(frames, requiredRenderTargets, requiredPoseIds.length);
  const status = resolvePackStatus(
    requiredPoseIds,
    approvedPoseIds,
    incompletePoseIds,
    missingPoseIds,
    qaSummary,
    frames,
  );

  if (input.candidates.some((c) => c.assetType === "video")) {
    warnings.push("Video candidates cannot satisfy image pack requirements.");
  }

  if (missingPoseIds.length > 0) {
    warnings.push(`Missing approved-master keyframes: ${missingPoseIds.join(", ")}.`);
  }

  if (incompletePoseIds.length > 0) {
    warnings.push(`Incomplete keyframe review: ${incompletePoseIds.join(", ")}.`);
  }

  return {
    imagePackId: input.imagePackId,
    exerciseId: input.exerciseId,
    packageVersion: input.packageVersion,
    status,
    characterId: keyframeSpec.characterId,
    sourceKeyframeSetId: keyframeSpec.keyframeSetId,
    sourceKeyframeVersion: keyframeSpec.keyframeVersion,
    requiredRenderTargets,
    coverageLevel,
    frames,
    missingPoseIds,
    incompletePoseIds,
    approvedPoseIds,
    qaSummary,
    lineage: {
      sourceCandidateIds: frames.map((frame) => frame.candidateId),
    },
    warnings,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
