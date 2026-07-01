import type {
  CandidateQaDimensionScore,
  CandidateQaReview,
  CandidateQaScoreLabel,
  CandidateQaScoreResult,
  CandidateRightsPacket,
  CandidateReviewStatus,
} from "./types";
import { CANDIDATE_QA_DIMENSION_IDS } from "./types";

export type BuildCandidateQaScoreInput = {
  readonly qa: CandidateQaReview;
  readonly rights: CandidateRightsPacket;
  readonly status?: CandidateReviewStatus;
};

function checklistHardGateFailures(checklist: CandidateQaReview["masterApprovalChecklist"]): string[] {
  const failures: string[] = [];

  if (!checklist.noWatermark) failures.push("watermark");
  if (!checklist.noLogosOrReadableText) failures.push("logos-readable-text");
  if (!checklist.correctCharacter) failures.push("wrong-character");
  if (!checklist.correctExercise) failures.push("wrong-exercise");
  if (!checklist.realisticAnatomy) failures.push("impossible-anatomy");
  if (!checklist.realisticEquipment) failures.push("warped-equipment");
  if (!checklist.rightsClear) failures.push("rights-not-clear");

  if (checklist.benchPressHeroSingleRep === false) failures.push("bench-press-second-rep");
  if (checklist.benchPressBarTouchesChest === false) failures.push("bench-press-bar-not-on-chest");
  if (checklist.benchPressPauseOnChest === false) failures.push("bench-press-no-pause");
  if (checklist.benchPressNoBounce === false) failures.push("bench-press-bounce");
  if (checklist.benchPressWristsStable === false) failures.push("bench-press-unstable-wrists");
  if (checklist.benchPressFeetPlanted === false) failures.push("bench-press-feet-not-planted");

  return failures;
}

function findingHardGateFailures(qa: CandidateQaReview): string[] {
  return qa.findings
    .filter((finding) => finding.blocksMasterApproval && finding.hardGateId)
    .map((finding) => finding.hardGateId as string);
}

function rightsHardGateFailures(rights: CandidateRightsPacket): string[] {
  const failures: string[] = [];

  if (rights.containsWatermark) failures.push("watermark");
  if (rights.containsLogosOrReadableText) failures.push("logos-readable-text");
  if (rights.usageStatus !== "cleared-for-oli-master") failures.push("rights-not-clear");
  if (!rights.allowsCommercialUse || !rights.allowsClientPlayback) failures.push("rights-not-clear");
  if (rights.requiresAttribution) failures.push("rights-not-clear");

  return failures;
}

function computeWeightedScore(dimensionScores: readonly CandidateQaDimensionScore[]): number {
  if (dimensionScores.length === 0) {
    return 0;
  }

  const totalWeight = dimensionScores.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = dimensionScores.reduce((sum, row) => sum + row.score * row.weight, 0);
  return Math.round((weightedSum / (totalWeight * 5)) * 100);
}

function resolveSummaryLabel(
  score: number,
  passedHardGates: boolean,
  approvalEligible: boolean,
  status?: CandidateReviewStatus,
): CandidateQaScoreLabel {
  if (status === "approved-master" && approvalEligible) {
    return "approved-master";
  }
  if (status === "dev-test") {
    return "dev-test-only";
  }
  if (status === "needs-revision") {
    return "needs-revision";
  }
  if (!passedHardGates) {
    return score === 0 ? "not-reviewable" : "needs-revision";
  }
  if (approvalEligible) {
    return score >= 85 ? "candidate-master" : "needs-review";
  }
  return "needs-review";
}

/** Deterministic QA score and approval eligibility for a media candidate. */
export function buildCandidateQaScore(input: BuildCandidateQaScoreInput): CandidateQaScoreResult {
  const { qa, rights, status } = input;

  const checklistFailures = checklistHardGateFailures(qa.masterApprovalChecklist);
  const findingFailures = findingHardGateFailures(qa);
  const rightsFailures = rightsHardGateFailures(rights);

  const hardGateFailures = [...new Set([...checklistFailures, ...findingFailures, ...rightsFailures])];

  const passedHardGates = hardGateFailures.length === 0;

  const weightedDimensionScores =
    qa.dimensionScores.length > 0
      ? qa.dimensionScores
      : CANDIDATE_QA_DIMENSION_IDS.map(
          (dimensionId): CandidateQaDimensionScore => ({
            dimensionId,
            score: 0,
            weight: 1,
            notes: ["Not reviewed"],
          }),
        );

  const score = computeWeightedScore(weightedDimensionScores);

  const rightsCleared =
    rights.usageStatus === "cleared-for-oli-master" &&
    rights.allowsCommercialUse &&
    rights.allowsClientPlayback &&
    !rights.requiresAttribution &&
    !rights.containsWatermark &&
    !rights.containsLogosOrReadableText;

  const approvalEligible = passedHardGates && rightsCleared && score >= 80;

  return {
    score,
    passedHardGates,
    hardGateFailures,
    weightedDimensionScores,
    approvalEligible,
    summaryLabel: resolveSummaryLabel(score, passedHardGates, approvalEligible, status),
  };
}

export function isCandidateApprovalEligible(input: BuildCandidateQaScoreInput): boolean {
  return buildCandidateQaScore(input).approvalEligible;
}
