import { APPROVED_MASTER_MINIMUM_SCORE, type ApprovedMasterImagePack, type ImagePackValidationIssue, type ImagePackValidationResult } from "./types";

function issue(
  code: string,
  message: string,
  fieldPath: string,
  severity: ImagePackValidationIssue["severity"] = "error",
): ImagePackValidationIssue {
  return { code, message, fieldPath, severity };
}

/** Validate an approved master image pack. Returns issues instead of throwing. */
export function validateApprovedMasterImagePack(
  imagePack: ApprovedMasterImagePack,
): ImagePackValidationResult {
  const issues: ImagePackValidationIssue[] = [];

  if (!imagePack.imagePackId.trim()) {
    issues.push(issue("empty-image-pack-id", "imagePackId must be non-empty", "imagePackId"));
  }

  if (!imagePack.exerciseId.trim()) {
    issues.push(issue("empty-exercise-id", "exerciseId must be non-empty", "exerciseId"));
  }

  if (
    imagePack.exerciseId.includes("bench_press") &&
    imagePack.exerciseId !== "bench_press"
  ) {
    issues.push(
      issue(
        "bench-press-exercise-id",
        "bench_press packs must preserve canonical exerciseId exactly",
        "exerciseId",
      ),
    );
  }

  if (!imagePack.packageVersion.trim()) {
    issues.push(issue("empty-package-version", "packageVersion must be non-empty", "packageVersion"));
  }

  if (!imagePack.characterId.trim()) {
    issues.push(issue("empty-character-id", "characterId must be non-empty", "characterId"));
  }

  if (!imagePack.sourceKeyframeSetId.trim()) {
    issues.push(
      issue("empty-keyframe-set-id", "sourceKeyframeSetId must be non-empty", "sourceKeyframeSetId"),
    );
  }

  if (!imagePack.sourceKeyframeVersion.trim()) {
    issues.push(
      issue(
        "empty-keyframe-version",
        "sourceKeyframeVersion must be non-empty",
        "sourceKeyframeVersion",
      ),
    );
  }

  const frameIds = imagePack.frames.map((frame) => frame.frameId);
  if (new Set(frameIds).size !== frameIds.length) {
    issues.push(issue("duplicate-frame-ids", "frames must have unique frameId values", "frames"));
  }

  const poseTargetKeys = imagePack.frames.map(
    (frame) => `${frame.keyframePoseId}:${frame.renderTarget}`,
  );
  if (new Set(poseTargetKeys).size !== poseTargetKeys.length) {
    issues.push(
      issue(
        "duplicate-pose-render-target",
        "frames must have unique pose + renderTarget combinations",
        "frames",
      ),
    );
  }

  const sortOrders = imagePack.frames.map((frame) => frame.sortOrder);
  if (new Set(sortOrders).size !== sortOrders.length) {
    issues.push(issue("duplicate-sort-order", "frame sortOrder values must be unique", "frames"));
  }

  for (const frame of imagePack.frames) {
    if (!frame.candidateId.trim()) {
      issues.push(issue("empty-candidate-id", "frame candidateId must be non-empty", "frames.candidateId"));
    }
    if (!frame.publicPath.trim()) {
      issues.push(issue("empty-public-path", "frame publicPath must be non-empty", "frames.publicPath"));
    }
    if (!frame.altText.trim()) {
      issues.push(issue("empty-alt-text", "frame altText must be non-empty", "frames.altText"));
    }
    if (!frame.coachingCaption.trim()) {
      issues.push(
        issue("empty-coaching-caption", "frame coachingCaption must be non-empty", "frames.coachingCaption"),
      );
    }
  }

  if (imagePack.thumbnailFrameId) {
    const frameExists = imagePack.frames.some((frame) => frame.frameId === imagePack.thumbnailFrameId);
    if (!frameExists) {
      issues.push(
        issue(
          "unknown-thumbnail-frame-id",
          `thumbnailFrameId must reference an existing frame: ${imagePack.thumbnailFrameId}`,
          "thumbnailFrameId",
        ),
      );
    }
  }

  if (imagePack.status === "approved-master") {
    if (!imagePack.thumbnailFrameId) {
      issues.push(
        issue(
          "missing-thumbnail-frame-id",
          "approved-master pack should designate thumbnailFrameId for library thumbnails",
          "thumbnailFrameId",
          "warning",
        ),
      );
    }

    if (imagePack.missingPoseIds.length > 0) {
      issues.push(
        issue(
          "approved-master-missing-poses",
          `approved-master pack cannot have missing poses: ${imagePack.missingPoseIds.join(", ")}`,
          "missingPoseIds",
        ),
      );
    }

    if (imagePack.incompletePoseIds.length > 0) {
      issues.push(
        issue(
          "approved-master-incomplete-poses",
          `approved-master pack cannot have incomplete poses: ${imagePack.incompletePoseIds.join(", ")}`,
          "incompletePoseIds",
        ),
      );
    }

    if (!imagePack.qaSummary.rightsCleared) {
      issues.push(
        issue(
          "approved-master-rights-not-cleared",
          "approved-master pack requires rightsCleared true",
          "qaSummary.rightsCleared",
        ),
      );
    }

    if (imagePack.qaSummary.hardGateFailureCount > 0) {
      issues.push(
        issue(
          "approved-master-hard-gate-failures",
          "approved-master pack requires hardGateFailureCount 0",
          "qaSummary.hardGateFailureCount",
        ),
      );
    }

    if (imagePack.qaSummary.minimumScore < APPROVED_MASTER_MINIMUM_SCORE) {
      issues.push(
        issue(
          "approved-master-score-threshold",
          `approved-master pack requires minimumScore >= ${APPROVED_MASTER_MINIMUM_SCORE}`,
          "qaSummary.minimumScore",
        ),
      );
    }
  }

  return {
    valid: issues.filter((row) => row.severity === "error").length === 0,
    issues,
  };
}
