import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { isKnownOliCharacterId } from "../character-registry/oliCharacterRegistry";
import { listTop25ExerciseKeyframeSpecs } from "./buildTop25ExerciseKeyframeSpecRegistry";
import { buildBenchPressKeyframeSpec } from "./buildBenchPressKeyframeSpec";
import type { ExerciseKeyframeSpec, KeyframeSpecReviewStatus } from "./types";
import { validateExerciseKeyframeSpec } from "./validateExerciseKeyframeSpec";
import { validateTop25ExerciseKeyframeSpecRegistry } from "./validateTop25ExerciseKeyframeSpecRegistry";

export type Top25KeyframeSpecRegistryReadinessLabel =
  | "missing"
  | "partial"
  | "spec-ready"
  | "ready-for-expert-review"
  | "expert-reviewed";

export type Top25KeyframeSpecRegistryReadinessReport = {
  readonly registryVersion: string;
  readonly totalTop25Exercises: number;
  readonly specCount: number;
  readonly validSpecCount: number;
  readonly validationErrorCount: number;
  readonly validationWarningCount: number;
  readonly benchPressAligned: boolean;
  readonly characterCoverage: number;
  readonly poseCoverage: number;
  readonly renderTargetCoverage: number;
  readonly viewCoverage: number;
  readonly qaCriteriaCoverage: number;
  readonly generationFailureCoverage: number;
  readonly specReadyCount: number;
  readonly needsExpertReviewCount: number;
  readonly expertReviewedCount: number;
  readonly mediaApprovedCount: number;
  readonly readinessLabel: Top25KeyframeSpecRegistryReadinessLabel;
  readonly overallScore: number;
  readonly warnings: readonly string[];
  readonly nextRecommendedActions: readonly string[];
};

function countCoverage(specs: readonly ExerciseKeyframeSpec[], predicate: (spec: ExerciseKeyframeSpec) => boolean): number {
  if (specs.length === 0) {
    return 0;
  }
  return specs.filter(predicate).length;
}

function isBenchPressAligned(): boolean {
  const registrySpec = listTop25ExerciseKeyframeSpecs().find(
    (spec) => spec.exerciseId === "bench_press",
  );
  if (!registrySpec) {
    return false;
  }
  return JSON.stringify(registrySpec) === JSON.stringify(buildBenchPressKeyframeSpec());
}

function resolveReadinessLabel(
  specCount: number,
  validSpecCount: number,
  totalTop25: number,
  validationErrorCount: number,
  expertReviewedCount: number,
): Top25KeyframeSpecRegistryReadinessLabel {
  if (specCount === 0) {
    return "missing";
  }
  if (validSpecCount < totalTop25) {
    return validationErrorCount > 0 ? "partial" : "partial";
  }
  if (expertReviewedCount === totalTop25) {
    return "expert-reviewed";
  }
  if (expertReviewedCount > 0) {
    return "ready-for-expert-review";
  }
  return "spec-ready";
}

function countByReviewStatus(
  specs: readonly ExerciseKeyframeSpec[],
  status: KeyframeSpecReviewStatus,
): number {
  return specs.filter((spec) => spec.reviewStatus === status).length;
}

/** Deterministic readiness report for Top 25 keyframe spec registry. */
export function buildTop25KeyframeSpecRegistryReadiness(): Top25KeyframeSpecRegistryReadinessReport {
  const allSpecs = listTop25ExerciseKeyframeSpecs();
  const registryValidation = validateTop25ExerciseKeyframeSpecRegistry(allSpecs);
  const totalTop25Exercises = TOP25_EXERCISE_ENRICHMENT_IDS.length;
  const specCount = allSpecs.length;

  const validSpecCount = allSpecs.filter(
    (spec) => validateExerciseKeyframeSpec(spec).valid,
  ).length;

  const characterCoverage = countCoverage(
    allSpecs,
    (spec) => isKnownOliCharacterId(spec.characterId),
  );
  const poseCoverage = countCoverage(allSpecs, (spec) => spec.requiredPoses.length >= 3);
  const renderTargetCoverage = countCoverage(
    allSpecs,
    (spec) => spec.renderTargets.includes("16:9"),
  );
  const viewCoverage = countCoverage(allSpecs, (spec) => spec.requiredViews.length > 0);
  const qaCriteriaCoverage = countCoverage(
    allSpecs,
    (spec) =>
      spec.qaFocus.length > 0 &&
      spec.requiredPoses.every((pose) => pose.acceptanceCriteria.length > 0),
  );
  const generationFailureCoverage = countCoverage(
    allSpecs,
    (spec) => spec.commonGenerationFailures.length > 0,
  );

  const specReadyCount = validSpecCount;
  const needsExpertReviewCount = countByReviewStatus(allSpecs, "ready-for-expert-review");
  const expertReviewedCount = countByReviewStatus(allSpecs, "expert-reviewed");
  const mediaApprovedCount = 0;

  const benchPressAligned = isBenchPressAligned();

  const warnings: string[] = [
    "Keyframe specs are production blueprints — they do not imply generated candidate images.",
    "Keyframe specs do not imply approved media or image packs.",
    "Expert review still required when reviewStatus is not expert-reviewed.",
  ];

  if (expertReviewedCount === 0) {
    warnings.push("No Top 25 keyframe specs are expert-reviewed yet.");
  }

  if (!benchPressAligned) {
    warnings.push("bench_press registry spec is not aligned with M9 buildBenchPressKeyframeSpec().");
  }

  const overallScore =
    totalTop25Exercises === 0
      ? 0
      : Math.round(
          (validSpecCount / totalTop25Exercises) * 60 +
            (characterCoverage / totalTop25Exercises) * 10 +
            (poseCoverage / totalTop25Exercises) * 10 +
            (renderTargetCoverage / totalTop25Exercises) * 10 +
            (qaCriteriaCoverage / totalTop25Exercises) * 10,
        );

  const readinessLabel = resolveReadinessLabel(
    specCount,
    validSpecCount,
    totalTop25Exercises,
    registryValidation.errorCount,
    expertReviewedCount,
  );

  const nextRecommendedActions: string[] = [];
  if (specCount < totalTop25Exercises) {
    const missing = TOP25_EXERCISE_ENRICHMENT_IDS.filter(
      (id) => !allSpecs.some((spec) => spec.exerciseId === id),
    );
    nextRecommendedActions.push(
      `Build keyframe specs for missing exercises: ${missing.join(", ")}`,
    );
  }
  if (registryValidation.errorCount > 0) {
    nextRecommendedActions.push("Fix keyframe spec registry validation errors before M14 candidate production.");
  }
  if (needsExpertReviewCount > 0) {
    nextRecommendedActions.push("Expert review Top 25 keyframe specs before candidate image production.");
  }
  nextRecommendedActions.push("Use Top 25 candidate production queue for planning — no auto-approval.");

  return {
    registryVersion: "top25-keyframe-spec-registry-v1",
    totalTop25Exercises,
    specCount,
    validSpecCount,
    validationErrorCount: registryValidation.errorCount,
    validationWarningCount: registryValidation.warningCount,
    benchPressAligned,
    characterCoverage,
    poseCoverage,
    renderTargetCoverage,
    viewCoverage,
    qaCriteriaCoverage,
    generationFailureCoverage,
    specReadyCount,
    needsExpertReviewCount,
    expertReviewedCount,
    mediaApprovedCount,
    readinessLabel,
    overallScore,
    warnings,
    nextRecommendedActions,
  };
}

/** @deprecated Use buildTop25KeyframeSpecRegistryReadiness */
export function buildTop25KeyframeSpecReadiness(): Top25KeyframeSpecRegistryReadinessReport {
  return buildTop25KeyframeSpecRegistryReadiness();
}

export function listValidatedTop25ExerciseKeyframeSpecs(): readonly ExerciseKeyframeSpec[] {
  return listTop25ExerciseKeyframeSpecs().filter(
    (spec) => validateExerciseKeyframeSpec(spec).valid,
  );
}
