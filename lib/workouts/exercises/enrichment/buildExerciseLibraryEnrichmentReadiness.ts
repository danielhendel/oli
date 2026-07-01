import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import {
  EXERCISE_LIBRARY_ENRICHMENT_V1,
  TOP25_EXERCISE_ENRICHMENT_IDS,
} from "./libraryEnrichment.v1";
import { TOP50_EXERCISE_PRIORITY_PLAN_V1 } from "./top50ExercisePriorityPlan.v1";
import type { EnrichmentReadinessLabel, ExerciseLibraryEnrichmentReadinessReport } from "./types";
import { validateExerciseLibraryEnrichment } from "./validateExerciseLibraryEnrichment";

function resolveReadinessLabel(
  enrichedCount: number,
  expertReviewedCount: number,
  readyForExpertReviewCount: number,
  validationErrors: number,
): EnrichmentReadinessLabel {
  if (validationErrors > 0) return "partial";
  if (expertReviewedCount > 0 && expertReviewedCount === enrichedCount) return "expert-reviewed";
  if (readyForExpertReviewCount > 0) return "ready-for-expert-review";
  if (enrichedCount > 0) return "metadata-ready";
  return "not-started";
}

/** Compute deterministic enrichment readiness report. */
export function buildExerciseLibraryEnrichmentReadiness(): ExerciseLibraryEnrichmentReadinessReport {
  const validation = validateExerciseLibraryEnrichment();
  const validationErrorCount = validation.issues.filter((i) => i.severity === "error").length;
  const validationWarningCount = validation.issues.filter((i) => i.severity === "warning").length;

  const enrichedExerciseCount = EXERCISE_LIBRARY_ENRICHMENT_V1.length;
  const top25EnrichedCount = TOP25_EXERCISE_ENRICHMENT_IDS.filter((id) =>
    EXERCISE_LIBRARY_ENRICHMENT_V1.some((e) => e.exerciseId === id),
  ).length;

  const expertReviewedCount = EXERCISE_LIBRARY_ENRICHMENT_V1.filter(
    (e) => e.reviewStatus === "expert-reviewed",
  ).length;

  const readyForExpertReviewCount = EXERCISE_LIBRARY_ENRICHMENT_V1.filter(
    (e) => e.reviewStatus === "ready-for-expert-review",
  ).length;

  // Media-ready = enrichment has complete media requirements but NO approved media implied
  const mediaReadyCount = EXERCISE_LIBRARY_ENRICHMENT_V1.filter(
    (e) =>
      e.mediaProfile.keyframeRequirements.length >= 3 &&
      e.mediaProfile.renderTargets.includes("16:9") &&
      e.qualityProfile.mediaReadinessScore > 0,
  ).length;

  const movementCompleteness = Math.round(
    (EXERCISE_LIBRARY_ENRICHMENT_V1.filter((e) => e.movementProfile.rangeOfMotionDefinition.trim()).length /
      Math.max(enrichedExerciseCount, 1)) *
      100,
  );

  const programmingCompleteness = Math.round(
    (EXERCISE_LIBRARY_ENRICHMENT_V1.filter((e) => e.programmingProfile.primaryTrainingUses.length > 0).length /
      Math.max(enrichedExerciseCount, 1)) *
      100,
  );

  const coachingCompleteness = Math.round(
    (EXERCISE_LIBRARY_ENRICHMENT_V1.filter((e) => e.coachingProfile.setupCues.length > 0).length /
      Math.max(enrichedExerciseCount, 1)) *
      100,
  );

  const safetyCompleteness = Math.round(
    (EXERCISE_LIBRARY_ENRICHMENT_V1.filter((e) => e.safetyProfile.cautionFlags.length >= 0).length /
      Math.max(enrichedExerciseCount, 1)) *
      100,
  );

  const mediaRequirementCompleteness = Math.round(
    (EXERCISE_LIBRARY_ENRICHMENT_V1.filter((e) => e.mediaProfile.keyframeRequirements.length >= 3).length /
      Math.max(enrichedExerciseCount, 1)) *
      100,
  );

  const completenessScores = EXERCISE_LIBRARY_ENRICHMENT_V1.map((e) => e.qualityProfile.completenessScore);
  const overallScore =
    completenessScores.length === 0
      ? 0
      : Math.round(completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length);

  const warnings: string[] = [];
  if (expertReviewedCount === 0) {
    warnings.push("No enrichment entries are expert-reviewed — metadata completeness is not expert approval.");
  }
  warnings.push("Enrichment does not imply approved media assets or image packs.");
  if (top25EnrichedCount < 25) {
    warnings.push(`Top 25 enrichment incomplete: ${top25EnrichedCount}/25.`);
  }
  const top50Gap = TOP50_EXERCISE_PRIORITY_PLAN_V1.length - enrichedExerciseCount;
  if (top50Gap > 0) {
    warnings.push(`${top50Gap} exercises in Top 50 plan lack enrichment metadata.`);
  }

  const nextRecommendedActions: string[] = [
    "Expert review Top 25 enrichment entries before production use.",
    "Expand keyframe specs from enrichment media profiles (Sprint M13).",
    "Begin candidate image production for highest-priority exercises after expert review.",
  ];

  if (validationErrorCount > 0) {
    nextRecommendedActions.unshift("Fix enrichment validation errors before expert review.");
  }

  const readinessLabel = resolveReadinessLabel(
    enrichedExerciseCount,
    expertReviewedCount,
    readyForExpertReviewCount,
    validationErrorCount,
  );

  return {
    totalCanonicalExercises: EXERCISE_LIBRARY_V1.length,
    enrichedExerciseCount,
    top25EnrichedCount,
    top50PlannedCount: TOP50_EXERCISE_PRIORITY_PLAN_V1.length,
    validationErrorCount,
    validationWarningCount,
    movementCompleteness,
    programmingCompleteness,
    coachingCompleteness,
    safetyCompleteness,
    mediaRequirementCompleteness,
    expertReviewedCount,
    readyForExpertReviewCount,
    mediaReadyCount,
    overallScore,
    readinessLabel,
    warnings,
    nextRecommendedActions,
  };
}
