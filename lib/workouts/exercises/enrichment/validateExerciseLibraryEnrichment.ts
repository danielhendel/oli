import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import {
  EXERCISE_LIBRARY_ENRICHMENT_V1,
  TOP25_EXERCISE_ENRICHMENT_IDS,
} from "./libraryEnrichment.v1";
import { TOP50_EXERCISE_PRIORITY_PLAN_V1 } from "./top50ExercisePriorityPlan.v1";
import {
  EXERCISE_LIBRARY_ENRICHMENT_VERSION,
  type ExerciseLibraryEnrichmentValidationIssue,
  type ExerciseLibraryEnrichmentValidationResult,
} from "./types";

const BENCH_PRESS_REQUIRED_POSES = [
  "setup",
  "start_lockout",
  "bottom_chest_pause",
  "finish_lockout",
] as const;

const APPROVED_MASTER_MINIMUM_RENDER_TARGETS = ["16:9"] as const;

function issue(
  code: string,
  message: string,
  fieldPath: string,
  severity: ExerciseLibraryEnrichmentValidationIssue["severity"] = "error",
  exerciseId?: string,
): ExerciseLibraryEnrichmentValidationIssue {
  return exerciseId !== undefined
    ? { code, severity, exerciseId, fieldPath, message }
    : { code, severity, fieldPath, message };
}

function canonicalIdSet(): Set<string> {
  return new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));
}

function validateSubstitutionReferences(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  canonicalIds: Set<string>,
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  const allSubs = [
    ...enrichment.substitutionProfile.regressions,
    ...enrichment.substitutionProfile.progressions,
    ...enrichment.substitutionProfile.lateralSubstitutions,
    ...enrichment.substitutionProfile.equipmentSubstitutions,
  ];

  for (const ref of allSubs) {
    if (!canonicalIds.has(ref.exerciseId)) {
      issues.push(
        issue(
          "invalid-substitution-reference",
          `Substitution references unknown exerciseId: ${ref.exerciseId}`,
          "substitutionProfile",
          "error",
          enrichment.exerciseId,
        ),
      );
    }
  }
}

function validateMediaProfile(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  const { mediaProfile } = enrichment;

  if (mediaProfile.preferredCharacterIds.length === 0) {
    issues.push(issue("empty-character-ids", "preferredCharacterIds must be non-empty", "mediaProfile.preferredCharacterIds", "error", enrichment.exerciseId));
  }

  if (mediaProfile.keyframeRequirements.length === 0) {
    issues.push(issue("empty-keyframes", "keyframeRequirements must be non-empty", "mediaProfile.keyframeRequirements", "error", enrichment.exerciseId));
  }

  const poseIds = mediaProfile.keyframeRequirements.map((k) => k.poseId);
  if (new Set(poseIds).size !== poseIds.length) {
    issues.push(issue("duplicate-pose-ids", "keyframe poseIds must be unique per exercise", "mediaProfile.keyframeRequirements", "error", enrichment.exerciseId));
  }

  const sortOrders = mediaProfile.keyframeRequirements.map((k) => k.sortOrder);
  if (new Set(sortOrders).size !== sortOrders.length) {
    issues.push(issue("duplicate-sort-order", "keyframe sortOrder values must be unique", "mediaProfile.keyframeRequirements", "error", enrichment.exerciseId));
  }

  if (!APPROVED_MASTER_MINIMUM_RENDER_TARGETS.every((target) => mediaProfile.renderTargets.includes(target))) {
    issues.push(issue("missing-16x9-render-target", 'renderTargets must include "16:9"', "mediaProfile.renderTargets", "error", enrichment.exerciseId));
  }

  if (mediaProfile.requiredViews.length === 0) {
    issues.push(issue("empty-required-views", "requiredViews must be non-empty", "mediaProfile.requiredViews", "error", enrichment.exerciseId));
  }

  if (mediaProfile.commonGenerationFailures.length === 0) {
    issues.push(issue("empty-generation-failures", "commonGenerationFailures must be non-empty", "mediaProfile.commonGenerationFailures", "error", enrichment.exerciseId));
  }

  if (mediaProfile.imageQaFocus.length === 0) {
    issues.push(issue("empty-image-qa-focus", "imageQaFocus must be non-empty", "mediaProfile.imageQaFocus", "error", enrichment.exerciseId));
  }

  if (enrichment.exerciseId === "bench_press") {
    for (const poseId of BENCH_PRESS_REQUIRED_POSES) {
      if (!poseIds.includes(poseId)) {
        issues.push(
          issue(
            "bench-press-missing-pose",
            `bench_press enrichment must include pose: ${poseId}`,
            "mediaProfile.keyframeRequirements",
            "error",
            enrichment.exerciseId,
          ),
        );
      }
    }

    const qaJoined = mediaProfile.imageQaFocus.join(" ").toLowerCase();
    const futureJoined = mediaProfile.futureVideoQaFocus.join(" ").toLowerCase();
    const combined = `${qaJoined} ${futureJoined}`;
    if (!combined.includes("pause") || !combined.includes("chest")) {
      issues.push(
        issue(
          "bench-press-qa-chest-pause",
          "bench_press QA focus must reference chest touch and pause",
          "mediaProfile.imageQaFocus",
          "error",
          enrichment.exerciseId,
        ),
      );
    }
    if (!combined.includes("watermark")) {
      issues.push(
        issue(
          "bench-press-qa-watermark",
          "bench_press QA focus must reference no watermark",
          "mediaProfile.imageQaFocus",
          "warning",
          enrichment.exerciseId,
        ),
      );
    }
  }
}

function validateCoachingProfile(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  const { coachingProfile } = enrichment;
  const checks: [readonly string[], string][] = [
    [coachingProfile.setupCues, "setupCues"],
    [coachingProfile.executionCues, "executionCues"],
    [coachingProfile.commonMistakes, "commonMistakes"],
    [coachingProfile.correctionCues, "correctionCues"],
  ];

  for (const [value, field] of checks) {
    if (value.length === 0) {
      issues.push(issue("empty-coaching-field", `${field} must be non-empty`, `coachingProfile.${field}`, "error", enrichment.exerciseId));
    }
  }

  if (!coachingProfile.clientFriendlySummary.trim()) {
    issues.push(issue("empty-client-summary", "clientFriendlySummary must be non-empty", "coachingProfile.clientFriendlySummary", "error", enrichment.exerciseId));
  }
}

function validateMovementProfile(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  const { movementProfile } = enrichment;
  if (!movementProfile.setupPosition.trim()) {
    issues.push(issue("empty-setup-position", "setupPosition must be non-empty", "movementProfile.setupPosition", "error", enrichment.exerciseId));
  }
  if (!movementProfile.startPosition.trim()) {
    issues.push(issue("empty-start-position", "startPosition must be non-empty", "movementProfile.startPosition", "error", enrichment.exerciseId));
  }
  if (!movementProfile.endPosition.trim()) {
    issues.push(issue("empty-end-position", "endPosition must be non-empty", "movementProfile.endPosition", "error", enrichment.exerciseId));
  }
  if (!movementProfile.rangeOfMotionDefinition.trim()) {
    issues.push(issue("empty-rom-definition", "rangeOfMotionDefinition must be non-empty", "movementProfile.rangeOfMotionDefinition", "error", enrichment.exerciseId));
  }
}

function validateProgrammingProfile(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  const { programmingProfile } = enrichment;
  if (programmingProfile.primaryTrainingUses.length === 0) {
    issues.push(issue("empty-training-uses", "primaryTrainingUses must be non-empty", "programmingProfile.primaryTrainingUses", "error", enrichment.exerciseId));
  }
  if (programmingProfile.bestRepRanges.length === 0) {
    issues.push(issue("empty-rep-ranges", "bestRepRanges must be non-empty", "programmingProfile.bestRepRanges", "error", enrichment.exerciseId));
  }
  if (programmingProfile.suggestedBlockTypes.length === 0) {
    issues.push(issue("empty-block-types", "suggestedBlockTypes must be non-empty", "programmingProfile.suggestedBlockTypes", "error", enrichment.exerciseId));
  }
  if (!programmingProfile.progressionStrategy.trim()) {
    issues.push(issue("empty-progression", "progressionStrategy must be non-empty", "programmingProfile.progressionStrategy", "error", enrichment.exerciseId));
  }
  if (!programmingProfile.regressionStrategy.trim()) {
    issues.push(issue("empty-regression", "regressionStrategy must be non-empty", "programmingProfile.regressionStrategy", "error", enrichment.exerciseId));
  }
}

function validateSafetyProfile(
  enrichment: (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number],
  issues: ExerciseLibraryEnrichmentValidationIssue[],
): void {
  if (!enrichment.safetyProfile.loadManagementNotes.trim()) {
    issues.push(issue("empty-load-management", "loadManagementNotes must be non-empty", "safetyProfile.loadManagementNotes", "error", enrichment.exerciseId));
  }
  if (enrichment.safetyProfile.professionalReviewRecommendedWhen.length === 0) {
    issues.push(issue("empty-review-when", "professionalReviewRecommendedWhen must be non-empty", "safetyProfile.professionalReviewRecommendedWhen", "error", enrichment.exerciseId));
  }
}

/** Validate enrichment dataset. Returns issues instead of throwing. */
export function validateExerciseLibraryEnrichment(
  enrichments: readonly (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number][] = EXERCISE_LIBRARY_ENRICHMENT_V1,
): ExerciseLibraryEnrichmentValidationResult {
  const issues: ExerciseLibraryEnrichmentValidationIssue[] = [];
  const canonicalIds = canonicalIdSet();
  const seenIds = new Set<string>();

  for (const enrichment of enrichments) {
    if (!enrichment.exerciseId.trim()) {
      issues.push(issue("empty-exercise-id", "exerciseId must be non-empty", "exerciseId"));
      continue;
    }

    if (!canonicalIds.has(enrichment.exerciseId)) {
      issues.push(
        issue(
          "unknown-exercise-id",
          `exerciseId not found in EXERCISE_LIBRARY_V1: ${enrichment.exerciseId}`,
          "exerciseId",
          "error",
          enrichment.exerciseId,
        ),
      );
    }

    if (seenIds.has(enrichment.exerciseId)) {
      issues.push(issue("duplicate-enrichment-id", `Duplicate enrichment for ${enrichment.exerciseId}`, "exerciseId", "error", enrichment.exerciseId));
    }
    seenIds.add(enrichment.exerciseId);

    if (enrichment.enrichmentVersion !== EXERCISE_LIBRARY_ENRICHMENT_VERSION) {
      issues.push(issue("invalid-enrichment-version", "enrichmentVersion must be exercise-library-enrichment-v1", "enrichmentVersion", "error", enrichment.exerciseId));
    }

    validateMovementProfile(enrichment, issues);
    validateProgrammingProfile(enrichment, issues);
    validateCoachingProfile(enrichment, issues);
    validateSafetyProfile(enrichment, issues);
    validateSubstitutionReferences(enrichment, canonicalIds, issues);
    validateMediaProfile(enrichment, issues);
  }

  // Priority plan cross-check
  const priorityRanks = new Set<number>();
  for (const item of TOP50_EXERCISE_PRIORITY_PLAN_V1) {
    if (!canonicalIds.has(item.exerciseId)) {
      issues.push(issue("priority-unknown-id", `Priority plan references unknown id: ${item.exerciseId}`, "top50Plan", "error", item.exerciseId));
    }
    if (priorityRanks.has(item.priorityRank)) {
      issues.push(issue("duplicate-priority-rank", `Duplicate priority rank: ${item.priorityRank}`, "top50Plan", "error", item.exerciseId));
    }
    priorityRanks.add(item.priorityRank);
  }

  for (const top25Id of TOP25_EXERCISE_ENRICHMENT_IDS) {
    if (!seenIds.has(top25Id)) {
      issues.push(issue("missing-top25-enrichment", `Top 25 id missing enrichment: ${top25Id}`, "top25", "error", top25Id));
    }
  }

  return {
    valid: issues.filter((row) => row.severity === "error").length === 0,
    issues,
  };
}

/** Test helper — throws if validation errors exist. */
export function assertNoExerciseLibraryEnrichmentErrors(
  enrichments: readonly (typeof EXERCISE_LIBRARY_ENRICHMENT_V1)[number][] = EXERCISE_LIBRARY_ENRICHMENT_V1,
): void {
  const result = validateExerciseLibraryEnrichment(enrichments);
  const errors = result.issues.filter((row) => row.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Exercise library enrichment validation failed:\n${errors.map((e) => `- ${e.exerciseId ?? "?"}: ${e.message}`).join("\n")}`,
    );
  }
}
