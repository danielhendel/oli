import type { ExerciseEnrichmentExpertReviewItem } from "@oli/lib/workouts/exercises/enrichment/expert-review/types";

const FIXTURE_REVIEW_TIMESTAMP = "2026-06-30T12:00:00.000Z" as const;

const APPROVED_CHECKLIST = {
  movementProfileAccurate: true,
  programmingGuidanceSafe: true,
  coachingCuesClear: true,
  safetyNotesConservative: true,
  substitutionsValid: true,
  keyframeRequirementsAccurate: true,
  mediaQaCriteriaComplete: true,
  noMedicalClaims: true,
} as const;

/** Test-only: first 5 Top 25 exercises approved for production (not live data). */
export const EXPERT_REVIEWED_TOP25_FIXTURE_EXERCISE_IDS = [
  "bench_press",
  "squat",
  "deadlift",
  "overhead_press",
  "barbell_row",
] as const;

function buildApprovedFixtureItem(
  exerciseId: string,
  priorityRank: number,
): ExerciseEnrichmentExpertReviewItem {
  return {
    reviewItemId: `expert-review-fixture-v1-${exerciseId}`,
    exerciseId,
    priorityRank,
    status: "approved-for-production",
    reviewerRole: "exercise-science-reviewer",
    reviewedBy: "fixture-expert-reviewer",
    reviewedAt: FIXTURE_REVIEW_TIMESTAMP,
    checklist: { ...APPROVED_CHECKLIST },
    requiredChanges: [],
    approvalNotes: ["Fixture approval for M14 workflow tests only — not live expert sign-off."],
    createdAt: FIXTURE_REVIEW_TIMESTAMP,
    updatedAt: FIXTURE_REVIEW_TIMESTAMP,
  };
}

/** Expert-reviewed fixture queue for tests — unlocks production packets for first 5 exercises. */
export function buildExpertReviewedTop25Fixture(
  liveItems: readonly ExerciseEnrichmentExpertReviewItem[],
): ExerciseEnrichmentExpertReviewItem[] {
  return liveItems.map((item) => {
    if (
      (EXPERT_REVIEWED_TOP25_FIXTURE_EXERCISE_IDS as readonly string[]).includes(item.exerciseId)
    ) {
      return buildApprovedFixtureItem(item.exerciseId, item.priorityRank);
    }
    return { ...item };
  });
}
