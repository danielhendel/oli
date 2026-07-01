import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";
import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import { applyExerciseEnrichmentExpertReview } from "../applyExerciseEnrichmentExpertReview";
import { buildExerciseEnrichmentExpertReviewState } from "../buildExerciseEnrichmentExpertReviewState";
import {
  TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1,
  listTop25ExerciseExpertReviewQueue,
} from "../top25ExerciseExpertReviewQueue.v1";
import { validateExerciseEnrichmentExpertReview } from "../validateExerciseEnrichmentExpertReview";
import type { ExerciseEnrichmentExpertReviewItem } from "../types";

function buildApprovedItem(exerciseId: string): ExerciseEnrichmentExpertReviewItem {
  return {
    reviewItemId: `expert-review-test-v1-${exerciseId}`,
    exerciseId,
    priorityRank: 1,
    status: "approved-for-production",
    reviewerRole: "exercise-science-reviewer",
    reviewedBy: "test-reviewer",
    reviewedAt: "2026-06-30T12:00:00.000Z",
    checklist: {
      movementProfileAccurate: true,
      programmingGuidanceSafe: true,
      coachingCuesClear: true,
      safetyNotesConservative: true,
      substitutionsValid: true,
      keyframeRequirementsAccurate: true,
      mediaQaCriteriaComplete: true,
      noMedicalClaims: true,
    },
    requiredChanges: [],
    approvalNotes: ["Test approval"],
    createdAt: "2026-06-30T12:00:00.000Z",
    updatedAt: "2026-06-30T12:00:00.000Z",
  };
}

describe("Top 25 Exercise Expert Review Gate", () => {
  const liveQueue = listTop25ExerciseExpertReviewQueue();
  const liveState = buildExerciseEnrichmentExpertReviewState(liveQueue);
  const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));

  it("live queue has 25 items", () => {
    expect(liveQueue).toHaveLength(25);
    expect(TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1).toHaveLength(25);
  });

  it("live approvedForProductionCount is 0", () => {
    expect(liveState.approvedForProductionCount).toBe(0);
    expect(liveState.blockedExerciseIds).toHaveLength(25);
    expect(liveState.approvedExerciseIds).toHaveLength(0);
  });

  it("every review item exerciseId exists in EXERCISE_LIBRARY_V1", () => {
    for (const item of liveQueue) {
      expect(libraryIds.has(item.exerciseId)).toBe(true);
    }
  });

  it("every Top 25 ID has a review item", () => {
    const ids = new Set(liveQueue.map((item) => item.exerciseId));
    for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
      expect(ids.has(exerciseId)).toBe(true);
    }
  });

  it("live queue validates with no errors", () => {
    const result = validateExerciseEnrichmentExpertReview(liveQueue);
    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it("approved-for-production requires all checklist booleans true", () => {
    const invalid = buildApprovedItem("squat");
    const broken = {
      ...invalid,
      checklist: { ...invalid.checklist, movementProfileAccurate: false },
    };
    const result = validateExerciseEnrichmentExpertReview([broken]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "approved-incomplete-checklist")).toBe(true);
  });

  it("approved-for-production requires reviewedBy and reviewedAt", () => {
    const missingReviewer = { ...buildApprovedItem("squat"), reviewedBy: undefined };
    const missingDate = { ...buildApprovedItem("deadlift"), reviewedAt: undefined };
    const result = validateExerciseEnrichmentExpertReview([missingReviewer, missingDate]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "approved-missing-reviewer")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "approved-missing-reviewed-at")).toBe(true);
  });

  it("changes-requested requires requiredChanges", () => {
    const item: ExerciseEnrichmentExpertReviewItem = {
      ...liveQueue[0]!,
      status: "changes-requested",
      requiredChanges: [],
    };
    const result = validateExerciseEnrichmentExpertReview([item]);
    expect(result.issues.some((issue) => issue.code === "changes-requested-missing-changes")).toBe(
      true,
    );
  });

  it("applying live review keeps production blocked", () => {
    const item = liveQueue[0]!;
    const frozen = JSON.stringify(item);
    const result = applyExerciseEnrichmentExpertReview(item);
    expect(result.productionApproved).toBe(false);
    expect(result.productionApprovalStatus).toBe("productionBlocked");
    expect(JSON.stringify(item)).toBe(frozen);
  });

  it("applying approved fixture unlocks production", () => {
    const approved = buildApprovedItem("bench_press");
    const result = applyExerciseEnrichmentExpertReview(approved);
    expect(result.productionApproved).toBe(true);
    expect(result.productionApprovalStatus).toBe("productionApproved");
    expect(result.exerciseId).toBe("bench_press");
  });

  it("warnings mention production blocked until expert review", () => {
    expect(
      liveState.warnings.some((warning) => warning.includes("blocked until expert review")),
    ).toBe(true);
  });
});
