import { buildMediaAssetReadinessScore } from "../buildMediaAssetReadinessScore";
import { buildMediaReadinessScore } from "../buildMediaReadinessScore";
import { buildBenchPressPilotMasterMediaPackage } from "../data/benchPressMasterMediaPackage";
import { buildBenchPressKeyframeSpec } from "../keyframe-spec/buildBenchPressKeyframeSpec";
import { buildCandidateReviewState } from "./buildCandidateReviewState";
import { BENCH_PRESS_MEDIA_CANDIDATES } from "./data/benchPressMediaCandidates";
import type { CandidateReviewState } from "./types";

/** Build deterministic Bench Press candidate review state. */
export function buildBenchPressCandidateReviewState(): CandidateReviewState {
  const keyframeSpec = buildBenchPressKeyframeSpec();
  const mediaPackage = buildBenchPressPilotMasterMediaPackage();
  const slotMetadataReadiness = buildMediaReadinessScore(mediaPackage);
  const assetReadiness = buildMediaAssetReadinessScore({
    exerciseId: keyframeSpec.exerciseId,
    slotMetadataReadiness,
  });

  return buildCandidateReviewState({
    exerciseId: keyframeSpec.exerciseId,
    keyframeSpec: {
      exerciseId: keyframeSpec.exerciseId,
      characterId: keyframeSpec.characterId,
      requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
        poseId: pose.poseId,
        label: pose.label,
      })),
    },
    candidates: BENCH_PRESS_MEDIA_CANDIDATES,
    playableAssetCount: assetReadiness.playableAssetCount,
    slotMetadataApproved: slotMetadataReadiness.status === "ready",
  });
}
