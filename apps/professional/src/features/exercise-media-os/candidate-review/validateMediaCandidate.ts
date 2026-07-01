import { isKnownOliCharacterId } from "../character-registry/oliCharacterRegistry";
import { BENCH_PRESS_REQUIRED_POSE_IDS } from "../keyframe-spec/types";
import { isCandidateApprovalEligible } from "./buildCandidateQaScore";
import type {
  CandidateAssetType,
  CandidateReviewStatus,
  CandidateValidationIssue,
  CandidateValidationResult,
  ExerciseMediaCandidate,
} from "./types";
import { CANDIDATE_REVIEW_STATUSES } from "./types";

function issue(
  code: string,
  message: string,
  severity: CandidateValidationIssue["severity"] = "error",
  fieldPath?: string,
): CandidateValidationIssue {
  return { code, message, severity, fieldPath };
}

function isValidStatus(status: string): status is CandidateReviewStatus {
  return (CANDIDATE_REVIEW_STATUSES as readonly string[]).includes(status);
}

function isValidAssetType(assetType: string): assetType is CandidateAssetType {
  return assetType === "image" || assetType === "video";
}

function validateBenchPressIdentity(candidate: ExerciseMediaCandidate, issues: CandidateValidationIssue[]): void {
  if (candidate.exerciseId !== "bench_press") {
    return;
  }

  if (
    candidate.keyframePoseId &&
    !(BENCH_PRESS_REQUIRED_POSE_IDS as readonly string[]).includes(candidate.keyframePoseId)
  ) {
    issues.push(
      issue(
        "invalid-bench-press-pose",
        `Invalid keyframe pose for bench_press: ${candidate.keyframePoseId}`,
        "error",
        "keyframePoseId",
      ),
    );
  }
}

function validateApprovedMaster(candidate: ExerciseMediaCandidate, issues: CandidateValidationIssue[]): void {
  if (candidate.status !== "approved-master") {
    return;
  }

  const qaScore = isCandidateApprovalEligible({
    qa: candidate.qa,
    rights: candidate.rights,
    status: candidate.status,
  });

  if (!qaScore) {
    issues.push(
      issue(
        "approved-master-not-eligible",
        "approved-master status requires QA approval eligibility (hard gates + rights clearance + score)",
        "error",
        "status",
      ),
    );
  }

  if (candidate.rights.containsWatermark) {
    issues.push(issue("approved-master-watermark", "approved-master cannot contain watermark", "error", "rights.containsWatermark"));
  }

  if (candidate.rights.containsLogosOrReadableText) {
    issues.push(
      issue(
        "approved-master-logos-text",
        "approved-master cannot contain logos or readable text",
        "error",
        "rights.containsLogosOrReadableText",
      ),
    );
  }

  if (candidate.rights.usageStatus !== "cleared-for-oli-master") {
    issues.push(
      issue(
        "approved-master-rights",
        "approved-master requires cleared-for-oli-master rights",
        "error",
        "rights.usageStatus",
      ),
    );
  }
}

function validateRejected(candidate: ExerciseMediaCandidate, issues: CandidateValidationIssue[]): void {
  if (candidate.status !== "rejected") {
    return;
  }

  const hasCriticalFinding = candidate.qa.findings.some(
    (finding) => finding.severity === "critical" || finding.blocksMasterApproval,
  );

  if (candidate.rejectionReasons.length === 0 && !hasCriticalFinding) {
    issues.push(
      issue(
        "rejected-without-reason",
        "rejected candidates must include rejection reasons or critical findings",
        "error",
        "rejectionReasons",
      ),
    );
  }
}

function validateSuperseded(candidate: ExerciseMediaCandidate, issues: CandidateValidationIssue[]): void {
  if (candidate.status !== "superseded") {
    return;
  }

  const hasLineage =
    Boolean(candidate.lineage.supersededByCandidateId?.trim()) ||
    Boolean(candidate.lineage.supersedesCandidateId?.trim()) ||
    candidate.lineage.notes.length > 0;

  if (!hasLineage) {
    issues.push(
      issue(
        "superseded-without-lineage",
        "superseded candidates must include lineage reference",
        "error",
        "lineage",
      ),
    );
  }
}

/** Validate a media candidate record. Returns issues instead of throwing. */
export function validateMediaCandidate(candidate: ExerciseMediaCandidate): CandidateValidationResult {
  const issues: CandidateValidationIssue[] = [];

  if (!candidate.candidateId.trim()) {
    issues.push(issue("empty-candidate-id", "candidateId must be non-empty", "error", "candidateId"));
  }

  if (!candidate.exerciseId.trim()) {
    issues.push(issue("empty-exercise-id", "exerciseId must be non-empty", "error", "exerciseId"));
  }

  if (!isValidStatus(candidate.status)) {
    issues.push(issue("invalid-status", `Invalid candidate status: ${candidate.status}`, "error", "status"));
  }

  if (!isValidAssetType(candidate.assetType)) {
    issues.push(issue("invalid-asset-type", `Invalid asset type: ${candidate.assetType}`, "error", "assetType"));
  }

  if (!isKnownOliCharacterId(candidate.characterId)) {
    issues.push(
      issue(
        "unknown-character-id",
        `characterId not found in registry: ${candidate.characterId}`,
        "error",
        "characterId",
      ),
    );
  }

  if (candidate.assetType === "image" && !candidate.keyframePoseId) {
    issues.push(
      issue(
        "image-missing-keyframe-pose",
        "image candidates must include keyframePoseId",
        "error",
        "keyframePoseId",
      ),
    );
  }

  if (!candidate.prompt.promptVersion.trim()) {
    issues.push(
      issue("empty-prompt-version", "promptVersion must be non-empty", "error", "prompt.promptVersion"),
    );
  }

  if (!candidate.source.tool) {
    issues.push(issue("missing-source-tool", "source.tool must be set", "error", "source.tool"));
  }

  if (candidate.rights.notes.length === 0) {
    issues.push(issue("missing-rights-notes", "rights.notes must be non-empty", "error", "rights.notes"));
  }

  validateBenchPressIdentity(candidate, issues);
  validateApprovedMaster(candidate, issues);
  validateRejected(candidate, issues);
  validateSuperseded(candidate, issues);

  return {
    valid: issues.filter((row) => row.severity === "error").length === 0,
    issues,
  };
}
