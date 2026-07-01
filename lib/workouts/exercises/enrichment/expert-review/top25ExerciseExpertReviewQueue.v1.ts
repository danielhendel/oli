import { TOP25_EXERCISE_ENRICHMENT_IDS } from "../libraryEnrichment.v1";
import { TOP50_EXERCISE_PRIORITY_PLAN_V1 } from "../top50ExercisePriorityPlan.v1";
import type { ExerciseEnrichmentExpertReviewItem } from "./types";

export const TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_VERSION =
  "top25-exercise-expert-review-queue-v1" as const;

const LIVE_REVIEW_TIMESTAMP = "2026-06-30T00:00:00.000Z" as const;

const EMPTY_CHECKLIST = {
  movementProfileAccurate: false,
  programmingGuidanceSafe: false,
  coachingCuesClear: false,
  safetyNotesConservative: false,
  substitutionsValid: false,
  keyframeRequirementsAccurate: false,
  mediaQaCriteriaComplete: false,
  noMedicalClaims: false,
} as const;

function resolvePriorityRank(exerciseId: string): number {
  const entry = TOP50_EXERCISE_PRIORITY_PLAN_V1.find((item) => item.exerciseId === exerciseId);
  return entry?.priorityRank ?? 99;
}

function buildLiveReviewItem(exerciseId: string): ExerciseEnrichmentExpertReviewItem {
  return {
    reviewItemId: `expert-review-v1-${exerciseId}`,
    exerciseId,
    priorityRank: resolvePriorityRank(exerciseId),
    status: "not-started",
    reviewerRole: "exercise-science-reviewer",
    checklist: { ...EMPTY_CHECKLIST },
    requiredChanges: [],
    approvalNotes: [],
    createdAt: LIVE_REVIEW_TIMESTAMP,
    updatedAt: LIVE_REVIEW_TIMESTAMP,
  };
}

/** Live Top 25 expert review queue — all items blocked until real review. */
export const TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1: readonly ExerciseEnrichmentExpertReviewItem[] =
  TOP25_EXERCISE_ENRICHMENT_IDS.map((exerciseId) => buildLiveReviewItem(exerciseId));

const reviewByExerciseId = new Map<string, ExerciseEnrichmentExpertReviewItem>(
  TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1.map((item) => [item.exerciseId, item]),
);

export function getTop25ExpertReviewItemByExerciseId(
  exerciseId: string,
): ExerciseEnrichmentExpertReviewItem | null {
  return reviewByExerciseId.get(exerciseId) ?? null;
}

export function listTop25ExerciseExpertReviewQueue(): readonly ExerciseEnrichmentExpertReviewItem[] {
  return [...TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1];
}

export function isExerciseApprovedForProduction(exerciseId: string): boolean {
  const item = reviewByExerciseId.get(exerciseId);
  return item?.status === "approved-for-production";
}
