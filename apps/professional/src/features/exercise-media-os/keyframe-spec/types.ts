/** Exercise Keyframe Spec — local-only image production blueprint types (Sprint M9). */

import type { MediaAssetAspectRatio } from "../types";
import type { OliCharacterId } from "../character-registry/types";

export const EXERCISE_KEYFRAME_SPEC_VERSION = "keyframe-spec-v1" as const;

export type ExerciseKeyframeSpecVersion = typeof EXERCISE_KEYFRAME_SPEC_VERSION;

export type ExerciseKeyframePoseId =
  | "setup"
  | "start"
  | "bottom"
  | "top"
  | "finish"
  | "midpoint"
  | "start_lockout"
  | "bottom_chest_pause"
  | "finish_lockout";

export type ExerciseKeyframeViewId =
  | "front_45_right"
  | "side"
  | "mobile_portrait_safe";

export type KeyframeRenderTarget = MediaAssetAspectRatio;

export type ExerciseKeyframeLandmark = {
  readonly landmarkId: string;
  readonly label: string;
  readonly description: string;
};

export type ExerciseKeyframePose = {
  readonly poseId: ExerciseKeyframePoseId;
  readonly label: string;
  readonly purpose: string;
  readonly requiredViews: readonly ExerciseKeyframeViewId[];
  readonly mustShow: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
};

export type KeyframeSpecReviewStatus =
  | "draft"
  | "ready-for-expert-review"
  | "expert-reviewed"
  | "deprecated";

export type ExerciseKeyframeSpec = {
  readonly exerciseId: string;
  readonly keyframeSetId: string;
  readonly keyframeVersion: ExerciseKeyframeSpecVersion;
  readonly characterId: OliCharacterId;
  readonly exerciseName: string;
  readonly productionGoal: string;
  readonly reviewStatus: KeyframeSpecReviewStatus;
  readonly requiredPoses: readonly ExerciseKeyframePose[];
  readonly requiredViews: readonly ExerciseKeyframeViewId[];
  readonly renderTargets: readonly KeyframeRenderTarget[];
  readonly equipmentRequirements: readonly string[];
  readonly environmentRequirements: readonly string[];
  readonly bodyRequirements: readonly string[];
  readonly bodyLandmarks: readonly ExerciseKeyframeLandmark[];
  readonly equipmentLandmarks: readonly ExerciseKeyframeLandmark[];
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly commonGenerationFailures: readonly string[];
  readonly coachingIntent: string;
  readonly qaFocus: readonly string[];
  readonly futureVideoNotes: readonly string[];
};

export type KeyframeSpecValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly exerciseId?: string;
  readonly poseId?: string;
};

export type KeyframeSpecValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly KeyframeSpecValidationIssue[];
};

export const BENCH_PRESS_REQUIRED_POSE_IDS = [
  "setup",
  "start_lockout",
  "bottom_chest_pause",
  "finish_lockout",
] as const;

export type BenchPressKeyframePoseId = (typeof BENCH_PRESS_REQUIRED_POSE_IDS)[number];

export const BENCH_PRESS_REQUIRED_RENDER_TARGETS: readonly KeyframeRenderTarget[] = [
  "16:9",
  "9:16",
  "1:1",
] as const;
