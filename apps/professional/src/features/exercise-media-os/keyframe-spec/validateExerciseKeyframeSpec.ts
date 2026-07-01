import { isKnownOliCharacterId } from "../character-registry/oliCharacterRegistry";
import {
  BENCH_PRESS_REQUIRED_POSE_IDS,
  BENCH_PRESS_REQUIRED_RENDER_TARGETS,
  type ExerciseKeyframeSpec,
  type ExerciseKeyframeViewId,
  type KeyframeRenderTarget,
  type KeyframeSpecValidationIssue,
  type KeyframeSpecValidationResult,
} from "./types";

function issue(
  code: string,
  message: string,
  exerciseId?: string,
  poseId?: string,
): KeyframeSpecValidationIssue {
  return poseId !== undefined
    ? exerciseId !== undefined
      ? { code, message, exerciseId, poseId }
      : { code, message, poseId }
    : exerciseId !== undefined
      ? { code, message, exerciseId }
      : { code, message };
}

function hasUniqueValues<T extends string>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

function poseHasCriteria(pose: ExerciseKeyframeSpec["requiredPoses"][number]): boolean {
  return pose.acceptanceCriteria.length > 0;
}

function poseHasNegativeCoverage(
  pose: ExerciseKeyframeSpec["requiredPoses"][number],
  globalNegative: readonly string[],
): boolean {
  return pose.negativeCriteria.length > 0 || globalNegative.length > 0;
}

function validateGenericPoseCoverage(
  spec: ExerciseKeyframeSpec,
  issues: KeyframeSpecValidationIssue[],
): void {
  if (spec.exerciseId === "bench_press") {
    return;
  }

  const poseIds = spec.requiredPoses.map((pose) => pose.poseId);

  if (!poseIds.includes("setup")) {
    issues.push(
      issue(
        "missing-setup-pose",
        "keyframe spec must include setup pose",
        spec.exerciseId,
        "setup",
      ),
    );
  }

  const hasFinish =
    poseIds.includes("finish") ||
    poseIds.includes("finish_lockout");

  if (!hasFinish) {
    issues.push(
      issue(
        "missing-finish-pose",
        "keyframe spec must include finish or finish_lockout pose",
        spec.exerciseId,
      ),
    );
  }

  if (spec.requiredPoses.length < 3) {
    issues.push(
      issue(
        "insufficient-poses",
        "keyframe spec must include at least 3 poses",
        spec.exerciseId,
      ),
    );
  }
}

function validateBenchPressPoseCoverage(
  spec: ExerciseKeyframeSpec,
  issues: KeyframeSpecValidationIssue[],
): void {
  if (spec.exerciseId !== "bench_press") {
    return;
  }

  const poseIds = spec.requiredPoses.map((pose) => pose.poseId);
  for (const requiredPoseId of BENCH_PRESS_REQUIRED_POSE_IDS) {
    if (!poseIds.includes(requiredPoseId)) {
      issues.push(
        issue(
          "missing-bench-press-pose",
          `bench_press keyframe spec must include pose: ${requiredPoseId}`,
          spec.exerciseId,
          requiredPoseId,
        ),
      );
    }
  }
}

function validateRenderTargets(
  spec: ExerciseKeyframeSpec,
  issues: KeyframeSpecValidationIssue[],
): void {
  if (!hasUniqueValues(spec.renderTargets)) {
    issues.push(
      issue("duplicate-render-targets", "renderTargets must not contain duplicates", spec.exerciseId),
    );
  }

  if (spec.exerciseId === "bench_press") {
    for (const target of BENCH_PRESS_REQUIRED_RENDER_TARGETS) {
      if (!spec.renderTargets.includes(target)) {
        issues.push(
          issue(
            "missing-bench-press-render-target",
            `bench_press must include render target: ${target}`,
            spec.exerciseId,
          ),
        );
      }
    }
  }
}

function validateRequiredViews(
  spec: ExerciseKeyframeSpec,
  issues: KeyframeSpecValidationIssue[],
): void {
  if (!hasUniqueValues(spec.requiredViews)) {
    issues.push(
      issue("duplicate-required-views", "requiredViews must not contain duplicates", spec.exerciseId),
    );
  }

  if (spec.exerciseId === "bench_press" && !spec.requiredViews.includes("front_45_right")) {
    issues.push(
      issue(
        "missing-front-45-right",
        "bench_press must include front_45_right as a required master view",
        spec.exerciseId,
      ),
    );
  }
}

/** Validate an Exercise Keyframe Spec for structural and bench_press policy consistency. */
export function validateExerciseKeyframeSpec(
  spec: ExerciseKeyframeSpec,
): KeyframeSpecValidationResult {
  const issues: KeyframeSpecValidationIssue[] = [];

  if (!spec.exerciseId.trim()) {
    issues.push(issue("empty-exercise-id", "exerciseId must be non-empty"));
  }

  if (!spec.keyframeSetId.trim()) {
    issues.push(issue("empty-keyframe-set-id", "keyframeSetId must be non-empty", spec.exerciseId));
  }

  if (!spec.keyframeVersion.trim()) {
    issues.push(issue("empty-keyframe-version", "keyframeVersion must be non-empty", spec.exerciseId));
  }

  if (!spec.characterId.trim()) {
    issues.push(issue("empty-character-id", "characterId must be non-empty", spec.exerciseId));
  } else if (!isKnownOliCharacterId(spec.characterId)) {
    issues.push(
      issue(
        "unknown-character-id",
        `characterId not found in registry: ${spec.characterId}`,
        spec.exerciseId,
      ),
    );
  }

  if (!hasUniqueValues(spec.requiredPoses.map((pose) => pose.poseId))) {
    issues.push(issue("duplicate-pose-ids", "requiredPoses must not contain duplicate poseId", spec.exerciseId));
  }

  if (spec.bodyLandmarks.length === 0) {
    issues.push(issue("missing-body-landmarks", "bodyLandmarks must be present", spec.exerciseId));
  }

  if (spec.bodyRequirements.length === 0) {
    issues.push(
      issue("missing-body-requirements", "bodyRequirements must be present", spec.exerciseId),
    );
  }

  if (spec.commonGenerationFailures.length === 0) {
    issues.push(
      issue(
        "missing-generation-failures",
        "commonGenerationFailures must be present",
        spec.exerciseId,
      ),
    );
  }

  if (spec.qaFocus.length === 0) {
    issues.push(issue("missing-qa-focus", "qaFocus must be present", spec.exerciseId));
  }

  if (spec.equipmentLandmarks.length === 0) {
    issues.push(
      issue("missing-equipment-landmarks", "equipmentLandmarks must be present", spec.exerciseId),
    );
  }

  validateBenchPressPoseCoverage(spec, issues);
  validateGenericPoseCoverage(spec, issues);
  validateRenderTargets(spec, issues);
  validateRequiredViews(spec, issues);

  for (const pose of spec.requiredPoses) {
    if (pose.requiredViews.length === 0) {
      issues.push(
        issue(
          "pose-missing-views",
          `Pose ${pose.poseId} must include at least one required camera view`,
          spec.exerciseId,
          pose.poseId,
        ),
      );
    }

    if (!poseHasCriteria(pose)) {
      issues.push(
        issue(
          "pose-missing-acceptance",
          `Pose ${pose.poseId} must include acceptance criteria`,
          spec.exerciseId,
          pose.poseId,
        ),
      );
    }

    if (!poseHasNegativeCoverage(pose, spec.negativeCriteria)) {
      issues.push(
        issue(
          "pose-missing-negative",
          `Pose ${pose.poseId} must include negative criteria or inherit global negative criteria`,
          spec.exerciseId,
          pose.poseId,
        ),
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function specIncludesRenderTarget(
  spec: ExerciseKeyframeSpec,
  target: KeyframeRenderTarget,
): boolean {
  return spec.renderTargets.includes(target);
}

export function specIncludesView(
  spec: ExerciseKeyframeSpec,
  view: ExerciseKeyframeViewId,
): boolean {
  return spec.requiredViews.includes(view);
}
