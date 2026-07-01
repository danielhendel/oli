import type {
  ExerciseEnrichmentExpertReviewApplyResult,
  ExerciseEnrichmentExpertReviewItem,
  ExerciseProductionApprovalStatus,
} from "./types";

function resolveProductionStatus(
  item: ExerciseEnrichmentExpertReviewItem,
): ExerciseProductionApprovalStatus {
  switch (item.status) {
    case "approved-for-production":
      return "productionApproved";
    case "changes-requested":
      return "changesRequested";
    case "rejected":
      return "rejected";
    case "not-started":
    case "in-review":
    case "superseded":
      return "productionBlocked";
    default: {
      const exhaustive: never = item.status;
      return exhaustive;
    }
  }
}

function buildReasons(
  item: ExerciseEnrichmentExpertReviewItem,
  productionStatus: ExerciseProductionApprovalStatus,
): string[] {
  const reasons: string[] = [];

  if (productionStatus === "productionApproved") {
    reasons.push("Expert review approved for candidate image production.");
    if (item.reviewedBy) {
      reasons.push(`Reviewed by: ${item.reviewedBy}`);
    }
    return reasons;
  }

  if (productionStatus === "changesRequested") {
    reasons.push("Expert review requested changes before production.");
    reasons.push(...item.requiredChanges);
    return reasons;
  }

  if (productionStatus === "rejected") {
    reasons.push("Expert review rejected this exercise for production.");
    reasons.push(...item.requiredChanges, ...item.approvalNotes);
    return reasons;
  }

  reasons.push(`Production blocked — review status: ${item.status}`);
  if (item.status === "not-started") {
    reasons.push("Expert review has not started.");
  }
  if (item.status === "in-review") {
    reasons.push("Expert review is in progress.");
  }
  return reasons;
}

/** Derive production approval from an expert review item without mutating enrichment data. */
export function applyExerciseEnrichmentExpertReview(
  reviewItem: ExerciseEnrichmentExpertReviewItem,
): ExerciseEnrichmentExpertReviewApplyResult {
  const productionApprovalStatus = resolveProductionStatus(reviewItem);
  const productionApproved = productionApprovalStatus === "productionApproved";

  return {
    exerciseId: reviewItem.exerciseId,
    reviewItemId: reviewItem.reviewItemId,
    reviewStatus: reviewItem.status,
    productionApprovalStatus,
    productionApproved,
    reasons: buildReasons(reviewItem, productionApprovalStatus),
  };
}
