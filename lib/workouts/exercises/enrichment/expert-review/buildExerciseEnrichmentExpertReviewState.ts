import type {
  ExerciseEnrichmentExpertReviewItem,
  ExerciseEnrichmentExpertReviewState,
  ExerciseExpertReviewStatus,
} from "./types";
import { validateExerciseEnrichmentExpertReview } from "./validateExerciseEnrichmentExpertReview";

function countByStatus(
  items: readonly ExerciseEnrichmentExpertReviewItem[],
  status: ExerciseExpertReviewStatus,
): number {
  return items.filter((item) => item.status === status).length;
}

/** Build expert review gate state summary from review queue items. */
export function buildExerciseEnrichmentExpertReviewState(
  items: readonly ExerciseEnrichmentExpertReviewItem[],
): ExerciseEnrichmentExpertReviewState {
  const validation = validateExerciseEnrichmentExpertReview(items);
  const approvedExerciseIds = items
    .filter((item) => item.status === "approved-for-production")
    .map((item) => item.exerciseId)
    .sort((a, b) => a.localeCompare(b));

  const blockedExerciseIds = items
    .filter((item) => item.status !== "approved-for-production")
    .map((item) => item.exerciseId)
    .sort((a, b) => a.localeCompare(b));

  const warnings: string[] = [
    "Expert review approval enables candidate image production — not media approval.",
    "approved-for-production does not imply approved-master candidates or image packs.",
  ];

  if (approvedExerciseIds.length === 0) {
    warnings.push("Top 25 production remains blocked until expert review approval.");
  }

  if (!validation.valid) {
    warnings.push("Expert review queue has validation errors.");
  }

  const nextRecommendedActions: string[] = [];
  if (countByStatus(items, "not-started") > 0) {
    nextRecommendedActions.push("Begin expert review for Top 25 enrichment and keyframe specs.");
  }
  if (countByStatus(items, "in-review") > 0) {
    nextRecommendedActions.push("Complete in-review exercises before candidate production.");
  }
  if (approvedExerciseIds.length === 0) {
    nextRecommendedActions.push("No exercises approved for production — prompt packets remain blocked.");
  }

  return {
    version: "exercise-expert-review-v1",
    totalItems: items.length,
    notStartedCount: countByStatus(items, "not-started"),
    inReviewCount: countByStatus(items, "in-review"),
    changesRequestedCount: countByStatus(items, "changes-requested"),
    approvedForProductionCount: countByStatus(items, "approved-for-production"),
    rejectedCount: countByStatus(items, "rejected"),
    supersededCount: countByStatus(items, "superseded"),
    blockedExerciseIds,
    approvedExerciseIds,
    warnings,
    nextRecommendedActions,
  };
}
