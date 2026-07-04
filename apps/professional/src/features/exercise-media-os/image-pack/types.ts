/** Approved Master Image Pack — local-only types (Sprint M11). */

import type { ExerciseMediaCandidate } from "../candidate-review/types";
import type { OliCharacterId } from "../character-registry/types";
import type { ExerciseKeyframePoseId, BenchPressKeyframePoseId } from "../keyframe-spec/types";
import type { MediaAssetAspectRatio } from "../types";

export const IMAGE_PACK_VERSION = "image-pack-v1" as const;

export type ImagePackVersion = typeof IMAGE_PACK_VERSION;

export const APPROVED_MASTER_MINIMUM_SCORE = 90 as const;

export type ImagePackStatus =
  | "missing"
  | "incomplete"
  | "review-ready"
  | "approved-master"
  | "superseded";

export type ImagePackCoverageLevel =
  | "none"
  | "master-16x9"
  | "mobile-portrait"
  | "thumbnail"
  | "multi-target-complete";

export type ApprovedMasterImageFrame = {
  readonly frameId: string;
  readonly exerciseId: string;
  readonly keyframePoseId: ExerciseKeyframePoseId;
  readonly characterId: OliCharacterId;
  readonly candidateId: string;
  readonly renderTarget: MediaAssetAspectRatio;
  readonly publicPath: string;
  readonly altText: string;
  readonly coachingCaption: string;
  readonly sortOrder: number;
};

export type ImagePackQaSummary = {
  readonly minimumScore: number;
  readonly averageScore: number;
  readonly hardGateFailureCount: number;
  readonly rightsCleared: boolean;
};

export type ImagePackLineage = {
  readonly sourceCandidateIds: readonly string[];
  readonly supersedesImagePackId?: string;
  readonly supersededByImagePackId?: string;
};

export type ApprovedMasterImagePack = {
  readonly imagePackId: string;
  readonly exerciseId: string;
  readonly packageVersion: string;
  readonly status: ImagePackStatus;
  readonly characterId: OliCharacterId;
  readonly sourceKeyframeSetId: string;
  readonly sourceKeyframeVersion: string;
  readonly requiredRenderTargets: readonly MediaAssetAspectRatio[];
  readonly coverageLevel: ImagePackCoverageLevel;
  readonly frames: readonly ApprovedMasterImageFrame[];
  readonly missingPoseIds: readonly ExerciseKeyframePoseId[];
  readonly incompletePoseIds: readonly ExerciseKeyframePoseId[];
  readonly approvedPoseIds: readonly ExerciseKeyframePoseId[];
  readonly qaSummary: ImagePackQaSummary;
  readonly lineage: ImagePackLineage;
  readonly warnings: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Approved frame used for library/builder thumbnails — must match a frameId in frames. */
  readonly thumbnailFrameId?: string;
};

export type ImagePackValidationSeverity = "info" | "warning" | "error";

export type ImagePackValidationIssue = {
  readonly code: string;
  readonly severity: ImagePackValidationSeverity;
  readonly message: string;
  readonly fieldPath: string;
};

export type ImagePackValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly ImagePackValidationIssue[];
};

export type BuildApprovedMasterImagePackInput = {
  readonly imagePackId: string;
  readonly exerciseId: string;
  readonly packageVersion: string;
  readonly keyframeSpec: {
    readonly exerciseId: string;
    readonly keyframeSetId: string;
    readonly keyframeVersion: string;
    readonly characterId: OliCharacterId;
    readonly requiredPoses: readonly {
      readonly poseId: ExerciseKeyframePoseId;
      readonly label: string;
      readonly purpose: string;
    }[];
  };
  readonly candidates: readonly ExerciseMediaCandidate[];
  readonly requiredRenderTargets: readonly MediaAssetAspectRatio[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** When true, requires localAsset.existsInRepo for approved-master frames. */
  readonly requireFilesInRepo?: boolean;
  /** Explicit thumbnail frame — must match a built frameId when provided. */
  readonly thumbnailFrameId?: string;
  readonly thumbnailFrameSelector?: {
    readonly keyframePoseId: ExerciseKeyframePoseId;
    readonly renderTarget: MediaAssetAspectRatio;
  };
};

export type ImageSequencePlaybackFrameStatus = "missing" | "available";

export type ImageSequencePlaybackFrame = {
  readonly frameId: string;
  readonly poseId: ExerciseKeyframePoseId;
  readonly title: string;
  readonly publicPath?: string;
  readonly altText: string;
  readonly coachingCaption: string;
  readonly durationSeconds: number;
  readonly status: ImageSequencePlaybackFrameStatus;
};

export type ImageSequencePlaybackPlanStatus = "missing" | "incomplete" | "available";

export type ImageSequencePlaybackPlan = {
  readonly exerciseId: string;
  readonly characterId: OliCharacterId;
  readonly imagePackId: string;
  readonly status: ImageSequencePlaybackPlanStatus;
  readonly frames: readonly ImageSequencePlaybackFrame[];
  readonly warnings: readonly string[];
};

export type { BenchPressKeyframePoseId } from "../keyframe-spec/types";

export const BENCH_PRESS_KEYFRAME_PUBLIC_PATHS: Record<
  BenchPressKeyframePoseId,
  Record<"16:9", string>
> = {
  setup: {
    "16:9": "/media/exercises/bench_press/keyframes/setup-16x9.png",
  },
  start_lockout: {
    "16:9": "/media/exercises/bench_press/keyframes/start-lockout-16x9.png",
  },
  bottom_chest_pause: {
    "16:9": "/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png",
  },
  finish_lockout: {
    "16:9": "/media/exercises/bench_press/keyframes/finish-lockout-16x9.png",
  },
};

export const BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER: Record<string, number> = {
  setup: 1,
  start_lockout: 2,
  start: 2,
  bottom_chest_pause: 3,
  bottom: 3,
  top: 3,
  midpoint: 3,
  finish_lockout: 4,
  finish: 4,
};
