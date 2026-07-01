import { EXERCISE_LIBRARY_V1 } from "../../library.v1";
import { TOP25_EXERCISE_ENRICHMENT_IDS } from "../libraryEnrichment.v1";
import type {
  ExerciseEnrichmentExpertReviewItem,
  ExerciseEnrichmentExpertReviewValidationIssue,
  ExerciseEnrichmentExpertReviewValidationResult,
} from "./types";

const MEDICAL_CLAIM_PATTERNS = [
  /\bcure\b/i,
  /\btreat\b/i,
  /\bdiagnos/i,
  /\bprescrib/i,
  /\bmedical advice\b/i,
] as const;

function issue(
  code: string,
  severity: ExerciseEnrichmentExpertReviewValidationIssue["severity"],
  fieldPath: string,
  message: string,
  exerciseId?: string,
): ExerciseEnrichmentExpertReviewValidationIssue {
  return exerciseId !== undefined
    ? { code, severity, fieldPath, message, exerciseId }
    : { code, severity, fieldPath, message };
}

function checklistComplete(
  checklist: ExerciseEnrichmentExpertReviewItem["checklist"],
): boolean {
  return Object.values(checklist).every((value) => value === true);
}

function containsMedicalClaim(text: string): boolean {
  return MEDICAL_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function validateReviewItem(
  item: ExerciseEnrichmentExpertReviewItem,
  issues: ExerciseEnrichmentExpertReviewValidationIssue[],
  libraryIds: Set<string>,
): void {
  if (!libraryIds.has(item.exerciseId)) {
    issues.push(
      issue(
        "unknown-exercise-id",
        "error",
        "exerciseId",
        `exerciseId not found in EXERCISE_LIBRARY_V1: ${item.exerciseId}`,
        item.exerciseId,
      ),
    );
  }

  if (item.status === "approved-for-production") {
    if (!checklistComplete(item.checklist)) {
      issues.push(
        issue(
          "approved-incomplete-checklist",
          "error",
          "checklist",
          "approved-for-production requires all checklist booleans true",
          item.exerciseId,
        ),
      );
    }
    if (!item.reviewedBy?.trim()) {
      issues.push(
        issue(
          "approved-missing-reviewer",
          "error",
          "reviewedBy",
          "approved-for-production requires reviewedBy",
          item.exerciseId,
        ),
      );
    }
    if (!item.reviewedAt?.trim()) {
      issues.push(
        issue(
          "approved-missing-reviewed-at",
          "error",
          "reviewedAt",
          "approved-for-production requires reviewedAt",
          item.exerciseId,
        ),
      );
    }
  }

  if (item.status === "changes-requested" && item.requiredChanges.length === 0) {
    issues.push(
      issue(
        "changes-requested-missing-changes",
        "error",
        "requiredChanges",
        "changes-requested requires requiredChanges",
        item.exerciseId,
      ),
    );
  }

  if (
    item.status === "rejected" &&
    item.requiredChanges.length === 0 &&
    item.approvalNotes.length === 0
  ) {
    issues.push(
      issue(
        "rejected-missing-notes",
        "error",
        "requiredChanges",
        "rejected requires requiredChanges or approvalNotes",
        item.exerciseId,
      ),
    );
  }

  const approvalText = [...item.approvalNotes, ...item.requiredChanges].join(" ");
  if (containsMedicalClaim(approvalText)) {
    issues.push(
      issue(
        "medical-claims-in-notes",
        "error",
        "approvalNotes",
        "approval notes must not contain medical claims",
        item.exerciseId,
      ),
    );
  }
}

/** Validate expert review queue items for structural and policy compliance. */
export function validateExerciseEnrichmentExpertReview(
  items: readonly ExerciseEnrichmentExpertReviewItem[],
): ExerciseEnrichmentExpertReviewValidationResult {
  const issues: ExerciseEnrichmentExpertReviewValidationIssue[] = [];
  const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));
  const exerciseIds = items.map((item) => item.exerciseId);
  const reviewItemIds = items.map((item) => item.reviewItemId);

  if (new Set(exerciseIds).size !== exerciseIds.length) {
    issues.push(
      issue("duplicate-exercise-ids", "error", "queue", "Review queue must not contain duplicate exerciseIds"),
    );
  }

  if (new Set(reviewItemIds).size !== reviewItemIds.length) {
    issues.push(
      issue("duplicate-review-item-ids", "error", "queue", "Review queue must not contain duplicate reviewItemIds"),
    );
  }

  for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
    if (!exerciseIds.includes(exerciseId)) {
      issues.push(
        issue(
          "missing-top25-review-item",
          "error",
          "queue",
          `Missing expert review item for Top 25 exerciseId: ${exerciseId}`,
          exerciseId,
        ),
      );
    }
  }

  for (const item of items) {
    validateReviewItem(item, issues, libraryIds);
  }

  const errorCount = issues.filter((entry) => entry.severity === "error").length;
  const warningCount = issues.filter((entry) => entry.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}
