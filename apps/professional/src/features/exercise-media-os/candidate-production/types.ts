/** Candidate Image Production — local-only workflow types (Sprint M14). */

import type { OliCharacterId } from "../character-registry/types";
import type { ExerciseKeyframeViewId, KeyframeRenderTarget } from "../keyframe-spec/types";
import type { MediaAssetAspectRatio } from "../types";

export const CANDIDATE_IMAGE_PRODUCTION_VERSION = "candidate-image-production-v1" as const;

export const GOOGLE_FLOW_PROMPT_PACKET_VERSION = "google-flow-prompt-packet-v1" as const;

export type CandidateImageProductionPacketStatus =
  | "blocked-needs-expert-review"
  | "ready-for-external-generation"
  | "generated-awaiting-import"
  | "imported-as-draft"
  | "imported-as-dev-test"
  | "needs-revision"
  | "rejected";

export type CandidateImageProductionSourceTool =
  | "google-flow"
  | "manual-local"
  | "local-fixture";

export type GoogleFlowPromptPacket = {
  readonly promptPacketId: string;
  readonly promptVersion: string;
  readonly characterInstruction: string;
  readonly sceneInstruction: string;
  readonly poseInstruction: string;
  readonly cameraInstruction: string;
  readonly renderTargetInstruction: string;
  readonly wardrobeInstruction: string;
  readonly environmentInstruction: string;
  readonly acceptanceCriteriaText: string;
  readonly negativePromptText: string;
  readonly fullPromptText: string;
};

export type CandidateImageExpectedImport = {
  readonly expectedFileName: string;
  readonly expectedPublicPath: string;
  readonly expectedRepoPath: string;
  readonly localFileExists: boolean;
};

export type CandidateImageProductionPacket = {
  readonly productionPacketId: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly characterId: OliCharacterId;
  readonly keyframePoseId: string;
  readonly poseLabel: string;
  readonly renderTarget: KeyframeRenderTarget;
  readonly requiredView: ExerciseKeyframeViewId;
  readonly priorityRank: number;
  readonly status: CandidateImageProductionPacketStatus;
  readonly sourceTool: CandidateImageProductionSourceTool;
  readonly promptPacket: GoogleFlowPromptPacket;
  readonly expectedImport: CandidateImageExpectedImport;
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly commonGenerationFailures: readonly string[];
  readonly qaFocus: readonly string[];
  readonly blockedReasons: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CandidateImageImportManifestItem = {
  readonly importItemId: string;
  readonly productionPacketId: string;
  readonly exerciseId: string;
  readonly keyframePoseId: string;
  readonly characterId: OliCharacterId;
  readonly renderTarget: MediaAssetAspectRatio;
  readonly expectedRepoPath: string;
  readonly expectedPublicPath: string;
  readonly fileExists: boolean;
  readonly intendedCandidateStatus: "draft" | "dev-test";
  readonly sourceTool: CandidateImageProductionSourceTool;
  readonly promptVersion: string;
  readonly importNotes: readonly string[];
};

export type CandidateImageImportManifest = {
  readonly manifestId: string;
  readonly manifestVersion: string;
  readonly items: readonly CandidateImageImportManifestItem[];
  readonly importableCount: number;
  readonly blockedCount: number;
  readonly warnings: readonly string[];
};

export type Top25CandidateImageProductionPacketsResult = {
  readonly totalPackets: number;
  readonly readyPacketCount: number;
  readonly blockedPacketCount: number;
  readonly packets: readonly CandidateImageProductionPacket[];
  readonly blockedExerciseIds: readonly string[];
  readonly readyExerciseIds: readonly string[];
  readonly warnings: readonly string[];
  readonly nextRecommendedActions: readonly string[];
};

export type CandidateImageProductionPacketValidationIssue = {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly fieldPath: string;
  readonly message: string;
  readonly productionPacketId?: string;
};

export type CandidateImageProductionPacketValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly CandidateImageProductionPacketValidationIssue[];
};

export type BuildMediaCandidateFromImageImportResult = {
  readonly candidate: import("../candidate-review/types").ExerciseMediaCandidate | null;
  readonly issues: readonly import("../candidate-review/types").CandidateValidationIssue[];
};
