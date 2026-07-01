import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";
import {
  EXERCISE_LIBRARY_ENRICHMENT_V1,
  TOP25_EXERCISE_ENRICHMENT_IDS,
} from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { isKnownOliCharacterId } from "../character-registry/oliCharacterRegistry";
import { buildBenchPressKeyframeSpec } from "./buildBenchPressKeyframeSpec";
import {
  buildTop25ExerciseKeyframeSpecRegistry,
  getTop25ExerciseKeyframeSpecByExerciseId,
  isBenchPressAuthoritativeKeyframeSpec,
} from "./buildTop25ExerciseKeyframeSpecRegistry";
import type { ExerciseKeyframeSpec } from "./types";
import { validateExerciseKeyframeSpec } from "./validateExerciseKeyframeSpec";

export type Top25KeyframeSpecRegistryValidationIssue = {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly exerciseId?: string;
  readonly fieldPath: string;
  readonly message: string;
};

export type Top25KeyframeSpecRegistryValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly Top25KeyframeSpecRegistryValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
};

const APPROVED_MEDIA_PATTERNS = [
  /approved-master/i,
  /media-approved/i,
  /candidateId/i,
  /imagePackId/i,
] as const;

function issue(
  code: string,
  severity: Top25KeyframeSpecRegistryValidationIssue["severity"],
  fieldPath: string,
  message: string,
  exerciseId?: string,
): Top25KeyframeSpecRegistryValidationIssue {
  return exerciseId !== undefined
    ? { code, severity, fieldPath, message, exerciseId }
    : { code, severity, fieldPath, message };
}

function specContainsApprovedMediaLanguage(spec: ExerciseKeyframeSpec): boolean {
  const haystack = [
    spec.productionGoal,
    ...spec.acceptanceCriteria,
    ...spec.negativeCriteria,
    ...spec.qaFocus,
    ...spec.futureVideoNotes,
  ].join(" ");

  return APPROVED_MEDIA_PATTERNS.some((pattern) => pattern.test(haystack));
}

function validateBenchPressAlignment(
  spec: ExerciseKeyframeSpec,
  issues: Top25KeyframeSpecRegistryValidationIssue[],
): void {
  if (spec.exerciseId !== "bench_press") {
    return;
  }

  const authoritative = buildBenchPressKeyframeSpec();
  if (JSON.stringify(spec) !== JSON.stringify(authoritative)) {
    issues.push(
      issue(
        "bench-press-misaligned",
        "error",
        "bench_press",
        "bench_press registry spec must match buildBenchPressKeyframeSpec()",
        "bench_press",
      ),
    );
  }

  const combinedCriteria = [
    ...spec.acceptanceCriteria,
    ...spec.requiredPoses.flatMap((pose) => pose.acceptanceCriteria),
    ...spec.negativeCriteria,
    ...spec.requiredPoses.flatMap((pose) => pose.negativeCriteria),
  ].join(" ").toLowerCase();

  const requiredConcepts = ["chest", "pause", "second rep", "watermark"];
  for (const concept of requiredConcepts) {
    if (!combinedCriteria.includes(concept)) {
      issues.push(
        issue(
          "bench-press-missing-qa-concept",
          "error",
          "acceptanceCriteria",
          `bench_press spec must reference QA concept: ${concept}`,
          "bench_press",
        ),
      );
    }
  }
}

function validateSpec(
  spec: ExerciseKeyframeSpec,
  issues: Top25KeyframeSpecRegistryValidationIssue[],
): void {
  const result = validateExerciseKeyframeSpec(spec);
  for (const item of result.issues) {
    issues.push(
      issue(
        item.code,
        "error",
        "spec",
        item.message,
        item.exerciseId ?? spec.exerciseId,
      ),
    );
  }

  if (!isKnownOliCharacterId(spec.characterId)) {
    issues.push(
      issue(
        "invalid-character-id",
        "error",
        "characterId",
        `Unknown characterId: ${spec.characterId}`,
        spec.exerciseId,
      ),
    );
  }

  if (spec.requiredPoses.length === 0) {
    issues.push(
      issue("empty-poses", "error", "requiredPoses", "requiredPoses must be non-empty", spec.exerciseId),
    );
  }

  if (spec.requiredViews.length === 0) {
    issues.push(
      issue("empty-views", "error", "requiredViews", "requiredViews must be non-empty", spec.exerciseId),
    );
  }

  if (spec.renderTargets.length === 0) {
    issues.push(
      issue(
        "empty-render-targets",
        "error",
        "renderTargets",
        "renderTargets must be non-empty",
        spec.exerciseId,
      ),
    );
  }

  if (!spec.renderTargets.includes("16:9")) {
    issues.push(
      issue(
        "missing-16-9",
        "error",
        "renderTargets",
        "renderTargets must include 16:9",
        spec.exerciseId,
      ),
    );
  }

  if (spec.commonGenerationFailures.length === 0) {
    issues.push(
      issue(
        "empty-generation-failures",
        "error",
        "commonGenerationFailures",
        "commonGenerationFailures must be non-empty",
        spec.exerciseId,
      ),
    );
  }

  if (spec.qaFocus.length === 0) {
    issues.push(
      issue("empty-qa-focus", "error", "qaFocus", "qaFocus must be non-empty", spec.exerciseId),
    );
  }

  if (spec.bodyRequirements.length === 0) {
    issues.push(
      issue(
        "empty-body-requirements",
        "error",
        "bodyRequirements",
        "bodyRequirements must be non-empty",
        spec.exerciseId,
      ),
    );
  }

  for (const pose of spec.requiredPoses) {
    if (pose.acceptanceCriteria.length === 0) {
      issues.push(
        issue(
          "pose-missing-acceptance",
          "error",
          `requiredPoses.${pose.poseId}.acceptanceCriteria`,
          `Pose ${pose.poseId} must include acceptance criteria`,
          spec.exerciseId,
        ),
      );
    }
    if (pose.negativeCriteria.length === 0) {
      issues.push(
        issue(
          "pose-missing-negative",
          "error",
          `requiredPoses.${pose.poseId}.negativeCriteria`,
          `Pose ${pose.poseId} must include negative criteria`,
          spec.exerciseId,
        ),
      );
    }
  }

  if (specContainsApprovedMediaLanguage(spec) && !isBenchPressAuthoritativeKeyframeSpec(spec)) {
    issues.push(
      issue(
        "approved-media-language",
        "warning",
        "productionGoal",
        "Spec text should not imply approved media or candidate IDs",
        spec.exerciseId,
      ),
    );
  }

  validateBenchPressAlignment(spec, issues);
}

/** Validate the Top 25 keyframe spec registry for completeness and policy compliance. */
export function validateTop25ExerciseKeyframeSpecRegistry(
  specs: readonly ExerciseKeyframeSpec[] = buildTop25ExerciseKeyframeSpecRegistry(),
): Top25KeyframeSpecRegistryValidationResult {
  const issues: Top25KeyframeSpecRegistryValidationIssue[] = [];

  if (specs.length !== 25) {
    issues.push(
      issue(
        "wrong-spec-count",
        "error",
        "registry",
        `Registry must contain exactly 25 specs, found ${specs.length}`,
      ),
    );
  }

  const exerciseIds = specs.map((spec) => spec.exerciseId);
  const uniqueIds = new Set(exerciseIds);
  if (uniqueIds.size !== exerciseIds.length) {
    issues.push(
      issue(
        "duplicate-exercise-ids",
        "error",
        "registry",
        "Registry must not contain duplicate exerciseIds",
      ),
    );
  }

  const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));
  const enrichmentIds = new Set(EXERCISE_LIBRARY_ENRICHMENT_V1.map((entry) => entry.exerciseId));

  for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
    if (!exerciseIds.includes(exerciseId)) {
      issues.push(
        issue(
          "missing-top25-spec",
          "error",
          "registry",
          `Missing keyframe spec for Top 25 exerciseId: ${exerciseId}`,
          exerciseId,
        ),
      );
    }
    if (!libraryIds.has(exerciseId)) {
      issues.push(
        issue(
          "missing-library-row",
          "error",
          "exerciseId",
          `exerciseId not found in EXERCISE_LIBRARY_V1: ${exerciseId}`,
          exerciseId,
        ),
      );
    }
    if (!enrichmentIds.has(exerciseId)) {
      issues.push(
        issue(
          "missing-enrichment",
          "error",
          "exerciseId",
          `exerciseId not found in EXERCISE_LIBRARY_ENRICHMENT_V1: ${exerciseId}`,
          exerciseId,
        ),
      );
    }
  }

  for (const spec of specs) {
    validateSpec(spec, issues);
  }

  const extraIds = exerciseIds.filter((id) => !TOP25_EXERCISE_ENRICHMENT_IDS.includes(id));
  for (const exerciseId of extraIds) {
    issues.push(
      issue(
        "extra-exercise-id",
        "warning",
        "registry",
        `Unexpected exerciseId in Top 25 registry: ${exerciseId}`,
        exerciseId,
      ),
    );
  }

  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warningCount = issues.filter((item) => item.severity === "warning").length;
  const infoCount = issues.filter((item) => item.severity === "info").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
  };
}

/** Convenience check that a single exerciseId has a valid Top 25 spec. */
export function isTop25ExerciseKeyframeSpecValid(exerciseId: string): boolean {
  const spec = getTop25ExerciseKeyframeSpecByExerciseId(exerciseId);
  if (!spec) {
    return false;
  }
  return validateTop25ExerciseKeyframeSpecRegistry([spec]).valid;
}
