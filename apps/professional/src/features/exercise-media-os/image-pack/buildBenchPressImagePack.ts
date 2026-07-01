import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../candidate-review/data/benchPressMediaCandidates";
import { buildBenchPressKeyframeSpec } from "../keyframe-spec/buildBenchPressKeyframeSpec";
import { BENCH_PRESS_REQUIRED_POSE_IDS } from "../keyframe-spec/types";
import { buildApprovedMasterImagePack } from "./buildApprovedMasterImagePack";
import { BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES } from "./data/benchPressKeyframeImageCandidates";
import type { ApprovedMasterImagePack } from "./types";

export const BENCH_PRESS_IMAGE_PACK_ID = "bench-press-image-pack-m1" as const;
export const BENCH_PRESS_IMAGE_PACK_VERSION = "bench-press-image-pack-v1" as const;

const BENCH_PRESS_IMAGE_PACK_CREATED_AT = "2026-06-30T00:00:00.000Z" as const;
const BENCH_PRESS_IMAGE_PACK_UPDATED_AT = "2026-06-30T00:00:00.000Z" as const;

/** Build live Bench Press image pack from keyframe spec and local image candidates. */
export function buildBenchPressImagePack(): ApprovedMasterImagePack {
  const keyframeSpec = buildBenchPressKeyframeSpec();

  const liveCandidates = [
    ...BENCH_PRESS_KEYFRAME_IMAGE_CANDIDATES,
    // Video dev-test hero demo does not count toward image pack — included for honesty checks only.
    BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
  ];

  return buildApprovedMasterImagePack({
    imagePackId: BENCH_PRESS_IMAGE_PACK_ID,
    exerciseId: keyframeSpec.exerciseId,
    packageVersion: BENCH_PRESS_IMAGE_PACK_VERSION,
    keyframeSpec: {
      exerciseId: keyframeSpec.exerciseId,
      keyframeSetId: keyframeSpec.keyframeSetId,
      keyframeVersion: keyframeSpec.keyframeVersion,
      characterId: keyframeSpec.characterId,
      requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
        poseId: pose.poseId,
        label: pose.label,
        purpose: pose.purpose,
      })),
    },
    candidates: liveCandidates,
    requiredRenderTargets: ["16:9"],
    createdAt: BENCH_PRESS_IMAGE_PACK_CREATED_AT,
    updatedAt: BENCH_PRESS_IMAGE_PACK_UPDATED_AT,
    requireFilesInRepo: true,
  });
}

export function benchPressRequiredPoseIds(): readonly typeof BENCH_PRESS_REQUIRED_POSE_IDS[number][] {
  return BENCH_PRESS_REQUIRED_POSE_IDS;
}
