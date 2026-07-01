/** Exercise Enrichment Expert Review Gate — local-only types (Sprint M14). */

export const EXERCISE_EXPERT_REVIEW_VERSION = "exercise-expert-review-v1" as const;

export type ExerciseExpertReviewVersion = typeof EXERCISE_EXPERT_REVIEW_VERSION;

export type ExerciseExpertReviewStatus =
  | "not-started"
  | "in-review"
  | "changes-requested"
  | "approved-for-production"
  | "rejected"
  | "superseded";

export type ExerciseExpertReviewerRole =
  | "strength-coach"
  | "physical-therapist"
  | "exercise-science-reviewer"
  | "media-qa-lead";

export type ExerciseEnrichmentExpertReviewChecklist = {
  readonly movementProfileAccurate: boolean;
  readonly programmingGuidanceSafe: boolean;
  readonly coachingCuesClear: boolean;
  readonly safetyNotesConservative: boolean;
  readonly substitutionsValid: boolean;
  readonly keyframeRequirementsAccurate: boolean;
  readonly mediaQaCriteriaComplete: boolean;
  readonly noMedicalClaims: boolean;
};

export type ExerciseEnrichmentExpertReviewItem = {
  readonly reviewItemId: string;
  readonly exerciseId: string;
  readonly priorityRank: number;
  readonly status: ExerciseExpertReviewStatus;
  readonly reviewerRole: ExerciseExpertReviewerRole;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly checklist: ExerciseEnrichmentExpertReviewChecklist;
  readonly requiredChanges: readonly string[];
  readonly approvalNotes: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ExerciseEnrichmentExpertReviewValidationIssue = {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly exerciseId?: string;
  readonly fieldPath: string;
  readonly message: string;
};

export type ExerciseEnrichmentExpertReviewValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly ExerciseEnrichmentExpertReviewValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
};

export type ExerciseProductionApprovalStatus =
  | "productionBlocked"
  | "productionApproved"
  | "changesRequested"
  | "rejected";

export type ExerciseEnrichmentExpertReviewApplyResult = {
  readonly exerciseId: string;
  readonly reviewItemId: string;
  readonly reviewStatus: ExerciseExpertReviewStatus;
  readonly productionApprovalStatus: ExerciseProductionApprovalStatus;
  readonly productionApproved: boolean;
  readonly reasons: readonly string[];
};

export type ExerciseEnrichmentExpertReviewState = {
  readonly version: ExerciseExpertReviewVersion;
  readonly totalItems: number;
  readonly notStartedCount: number;
  readonly inReviewCount: number;
  readonly changesRequestedCount: number;
  readonly approvedForProductionCount: number;
  readonly rejectedCount: number;
  readonly supersededCount: number;
  readonly blockedExerciseIds: readonly string[];
  readonly approvedExerciseIds: readonly string[];
  readonly warnings: readonly string[];
  readonly nextRecommendedActions: readonly string[];
};
