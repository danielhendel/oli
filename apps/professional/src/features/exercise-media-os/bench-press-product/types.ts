import type { MediaSlotType } from "../types";

import type {
  BENCH_PRESS_ASSET_STATUS,
  BENCH_PRESS_BRIEF_VERSION,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_QA_VERSION,
  BENCH_PRESS_STORYBOARD_VERSION,
} from "./benchPressProductConstants";

export type BenchPressProductVersion = typeof BENCH_PRESS_PRODUCT_VERSION;
export type BenchPressStoryboardVersion = typeof BENCH_PRESS_STORYBOARD_VERSION;
export type BenchPressBriefVersion = typeof BENCH_PRESS_BRIEF_VERSION;
export type BenchPressQAVersion = typeof BENCH_PRESS_QA_VERSION;
export type BenchPressAssetStatus = typeof BENCH_PRESS_ASSET_STATUS;

export type AcademyReferenceSource = "academy" | "intelligence" | "media-package";

export type AcademyReference = {
  source: AcademyReferenceSource;
  field: string;
  summary: string;
};

export type BenchPressStoryboardScene = {
  sceneId: string;
  slotId: string;
  slotType: MediaSlotType;
  title: string;
  purpose: string;
  clientLearningObjective: string;
  professionalIntent: string;
  academyReferences: AcademyReference[];
  intelligenceReferences: AcademyReference[];
  durationSeconds: number;
  visualBeat: string;
  teachingBeat: string;
  transitionToNext: string;
};

export type BenchPressMediaStoryboard = {
  exerciseId: "bench_press";
  productVersion: BenchPressProductVersion;
  storyboardVersion: BenchPressStoryboardVersion;
  sourceAcademyVersion: string;
  sourceMediaPackageVersion: string;
  scenes: BenchPressStoryboardScene[];
  totalDurationSeconds: number;
  createdFor: string;
};

export type ShotInstruction = {
  shotId: string;
  cameraAngle: string;
  framing: string;
  movement: string;
  durationSeconds: number;
  purpose: string;
};

export type OverlayInstructionType =
  | "muscle-highlight"
  | "bar-path"
  | "joint-path"
  | "tempo"
  | "setup-callout"
  | "mistake-callout"
  | "breathing"
  | "text";

export type OverlayInstruction = {
  overlayId: string;
  type: OverlayInstructionType;
  target: string;
  description: string;
};

export type BiomechanicsConstraintSeverity = "warning" | "critical";

export type BiomechanicsConstraint = {
  constraintId: string;
  label: string;
  requirement: string;
  failureMode: string;
  severity: BiomechanicsConstraintSeverity;
};

export type BenchPressProductionSceneBrief = {
  sceneId: string;
  slotType: MediaSlotType;
  title: string;
  objective: string;
  narrationScript: string;
  onScreenText: string;
  shotList: ShotInstruction[];
  overlayPlan: OverlayInstruction[];
  cameraDirection: string;
  audioDirection: string;
  aiGenerationPrompt: string;
  aiNegativePrompt: string;
  biomechanicsConstraints: BiomechanicsConstraint[];
  acceptanceCriteria: string[];
};

export type BenchPressProductionBrief = {
  exerciseId: "bench_press";
  productVersion: BenchPressProductVersion;
  briefVersion: BenchPressBriefVersion;
  totalDurationSeconds: number;
  scenes: BenchPressProductionSceneBrief[];
  requiredAssets: string[];
  aiPromptPack: string;
  productionNotes: string[];
  qaGate: string;
};

export type BenchPressQACheckCategory =
  | "movement-accuracy"
  | "safety"
  | "teaching-clarity"
  | "visual-quality"
  | "audio-quality"
  | "overlay-accuracy"
  | "accessibility"
  | "client-comprehension";

export type BenchPressQACheckSeverity = "required" | "recommended";

export type BenchPressQACheckStatus = "not-reviewed" | "pass" | "fail";

export type BenchPressQACheckItem = {
  checkId: string;
  category: BenchPressQACheckCategory;
  label: string;
  requirement: string;
  severity: BenchPressQACheckSeverity;
  status: BenchPressQACheckStatus;
};

export type BenchPressSceneQACheck = {
  sceneId: string;
  slotType: MediaSlotType;
  checks: BenchPressQACheckItem[];
};

export type BenchPressExpertMediaQAChecklist = {
  exerciseId: "bench_press";
  productVersion: BenchPressProductVersion;
  qaVersion: BenchPressQAVersion;
  packageStatus: "not-reviewed" | "approved" | "rejected";
  sceneChecks: BenchPressSceneQACheck[];
  packageChecks: BenchPressQACheckItem[];
  approvalGate: {
    canApprove: boolean;
    requiredChecksTotal: number;
    requiredChecksPassed: number;
    status: BenchPressQACheckStatus;
    message: string;
  };
};

export type BenchPressTimelineCompatibility = {
  sceneCountMatches: boolean;
  slotIdsMatch: boolean;
  totalDurationMatches: boolean;
  passes: boolean;
};

export type BenchPressExerciseProductPipeline = {
  exerciseId: "bench_press";
  productVersion: BenchPressProductVersion;
  storyboard: BenchPressMediaStoryboard;
  productionBrief: BenchPressProductionBrief;
  qaChecklist: BenchPressExpertMediaQAChecklist;
  mediaPackageVersion: string;
  timelineCompatibility: BenchPressTimelineCompatibility;
  assetStatus: BenchPressAssetStatus;
};
