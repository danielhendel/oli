/** Exercise Media Candidate Review — local-only types (Sprint M10). */

import type { OliCharacterId } from "../character-registry/types";
import type { ExerciseKeyframePoseId } from "../keyframe-spec/types";
import type { MediaAssetAspectRatio } from "../types";

export const CANDIDATE_REVIEW_VERSION = "candidate-review-v1" as const;

export type CandidateReviewVersion = typeof CANDIDATE_REVIEW_VERSION;

export const CANDIDATE_REVIEW_STATUSES = [
  "missing",
  "draft",
  "dev-test",
  "needs-revision",
  "rejected",
  "approved-master",
  "superseded",
] as const;

export type CandidateReviewStatus = (typeof CANDIDATE_REVIEW_STATUSES)[number];

export type CandidateAssetType = "image" | "video";

export type CandidateSourceTool =
  | "google-flow"
  | "manual-local"
  | "local-fixture"
  | "unknown";

export type CandidateQaDimensionId =
  | "biomechanics"
  | "poseAccuracy"
  | "movementAccuracy"
  | "anatomyRealism"
  | "equipmentAccuracy"
  | "cameraFraming"
  | "educationalClarity"
  | "brandFit"
  | "renderTargetFit"
  | "technicalQuality"
  | "rightsCleanliness";

export const CANDIDATE_QA_DIMENSION_IDS: readonly CandidateQaDimensionId[] = [
  "biomechanics",
  "poseAccuracy",
  "movementAccuracy",
  "anatomyRealism",
  "equipmentAccuracy",
  "cameraFraming",
  "educationalClarity",
  "brandFit",
  "renderTargetFit",
  "technicalQuality",
  "rightsCleanliness",
] as const;

export type CandidateRightsUsageStatus =
  | "unknown"
  | "internal-dev-only"
  | "cleared-for-oli-master"
  | "rejected-rights-risk";

export type CandidateSourceOwnership = "oli-created" | "third-party" | "unknown";

export type CandidateRightsPacket = {
  readonly usageStatus: CandidateRightsUsageStatus;
  readonly sourceOwnership: CandidateSourceOwnership;
  readonly allowsCommercialUse: boolean;
  readonly allowsClientPlayback: boolean;
  readonly requiresAttribution: boolean;
  readonly containsWatermark: boolean;
  readonly containsLogosOrReadableText: boolean;
  readonly notes: readonly string[];
};

export type CandidateSourceMetadata = {
  readonly tool: CandidateSourceTool;
  readonly project?: string;
  readonly generatedAt?: string;
};

export type CandidatePromptMetadata = {
  readonly promptVersion: string;
  readonly promptText: string;
  readonly negativePromptText: string;
};

export type CandidateLocalAssetMetadata = {
  readonly expectedPublicPath: string;
  readonly placeholderPath?: string;
  readonly existsInRepo: boolean;
};

export type CandidateMasterApprovalChecklist = {
  readonly noWatermark: boolean;
  readonly noLogosOrReadableText: boolean;
  readonly correctCharacter: boolean;
  readonly correctExercise: boolean;
  readonly realisticAnatomy: boolean;
  readonly realisticEquipment: boolean;
  readonly educationallyClear: boolean;
  readonly rightsClear: boolean;
  readonly benchPressHeroSingleRep?: boolean;
  readonly benchPressBarTouchesChest?: boolean;
  readonly benchPressPauseOnChest?: boolean;
  readonly benchPressNoBounce?: boolean;
  readonly benchPressWristsStable?: boolean;
  readonly benchPressFeetPlanted?: boolean;
};

export type CandidateQaFindingSeverity = "info" | "minor" | "major" | "critical";

export type CandidateQaFinding = {
  readonly findingId: string;
  readonly severity: CandidateQaFindingSeverity;
  readonly category: CandidateQaDimensionId | "hardGate";
  readonly message: string;
  readonly blocksMasterApproval: boolean;
  readonly hardGateId?: string;
};

export type CandidateQaDimensionScore = {
  readonly dimensionId: CandidateQaDimensionId;
  readonly score: 0 | 1 | 2 | 3 | 4 | 5;
  readonly weight: number;
  readonly notes: readonly string[];
};

export type CandidateQaReview = {
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly dimensionScores: readonly CandidateQaDimensionScore[];
  readonly findings: readonly CandidateQaFinding[];
  readonly masterApprovalChecklist: CandidateMasterApprovalChecklist;
};

export type CandidateLineage = {
  readonly parentCandidateId?: string;
  readonly supersededByCandidateId?: string;
  readonly supersedesCandidateId?: string;
  readonly derivedFromKeyframeSetId?: string;
  readonly notes: readonly string[];
};

export type ExerciseMediaCandidate = {
  readonly candidateId: string;
  readonly exerciseId: string;
  readonly assetType: CandidateAssetType;
  readonly status: CandidateReviewStatus;
  readonly characterId: OliCharacterId;
  readonly mediaSlotId?: string;
  readonly keyframePoseId?: ExerciseKeyframePoseId;
  readonly renderTarget: MediaAssetAspectRatio;
  readonly source: CandidateSourceMetadata;
  readonly prompt: CandidatePromptMetadata;
  readonly localAsset: CandidateLocalAssetMetadata;
  readonly qa: CandidateQaReview;
  readonly rights: CandidateRightsPacket;
  readonly lineage: CandidateLineage;
  readonly reviewerNotes: readonly string[];
  readonly rejectionReasons: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CandidateValidationSeverity = "error" | "warning";

export type CandidateValidationIssue = {
  readonly code: string;
  readonly severity: CandidateValidationSeverity;
  readonly message: string;
  readonly fieldPath?: string;
};

export type CandidateValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly CandidateValidationIssue[];
};

export type CandidateQaScoreLabel =
  | "not-reviewable"
  | "needs-review"
  | "dev-test-only"
  | "needs-revision"
  | "candidate-master"
  | "approved-master";

export type CandidateQaScoreResult = {
  readonly score: number;
  readonly passedHardGates: boolean;
  readonly hardGateFailures: readonly string[];
  readonly weightedDimensionScores: readonly CandidateQaDimensionScore[];
  readonly approvalEligible: boolean;
  readonly summaryLabel: CandidateQaScoreLabel;
};

export type ImagePackReadinessStatus =
  | "missing"
  | "incomplete"
  | "review-ready"
  | "approved-master-ready";

export type MissingKeyframeRequirement = {
  readonly poseId: ExerciseKeyframePoseId;
  readonly label: string;
  readonly reason: string;
};

export type CandidateReviewNextActionId =
  | "generate-keyframe-candidate"
  | "review-dev-test-candidate"
  | "revise-candidate"
  | "approve-image-pack"
  | "supersede-rejected"
  | "await-keyframe-spec"
  | "none";

export type CandidateReviewNextAction = {
  readonly actionId: CandidateReviewNextActionId;
  readonly label: string;
  readonly poseId?: ExerciseKeyframePoseId;
  readonly candidateId?: string;
};

export type CandidateReviewState = {
  readonly version: CandidateReviewVersion;
  readonly exerciseId: string;
  readonly characterId?: OliCharacterId;
  readonly totalCandidates: number;
  readonly statusCounts: Readonly<Record<CandidateReviewStatus, number>>;
  readonly candidatesByStatus: Readonly<Partial<Record<CandidateReviewStatus, readonly ExerciseMediaCandidate[]>>>;
  readonly missingKeyframeRequirements: readonly MissingKeyframeRequirement[];
  readonly approvedMasterCandidates: readonly ExerciseMediaCandidate[];
  readonly devTestCandidates: readonly ExerciseMediaCandidate[];
  readonly needsRevisionCandidates: readonly ExerciseMediaCandidate[];
  readonly rejectedCandidates: readonly ExerciseMediaCandidate[];
  readonly playableCandidateCount: number;
  readonly imageCandidateCount: number;
  readonly videoCandidateCount: number;
  readonly imagePackReadiness: ImagePackReadinessStatus;
  readonly nextRecommendedAction: CandidateReviewNextAction;
  readonly warnings: readonly string[];
  readonly slotMetadataDoesNotEqualApprovedCandidate: boolean;
  readonly missingPlayableAssetDoesNotEqualApprovedCandidate: boolean;
};

export type BuildCandidateReviewStateInput = {
  readonly exerciseId: string;
  readonly keyframeSpec?: {
    readonly exerciseId: string;
    readonly characterId: OliCharacterId;
    readonly requiredPoses: readonly { readonly poseId: ExerciseKeyframePoseId; readonly label: string }[];
  };
  readonly candidates: readonly ExerciseMediaCandidate[];
  readonly playableAssetCount?: number;
  readonly slotMetadataApproved?: boolean;
};
