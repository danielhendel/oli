import type {
  ExerciseMediaAsset,
  ExerciseMediaAssetSource,
  ExerciseMediaAssetStatus,
  ExerciseMediaAssetType,
  MediaAssetAspectRatio,
  DifficultyLevel,
  TeachingStyle,
  VisualEmphasis,
} from "../types";
import { getApprovedVideoAssetForSlot } from "../mediaAssetRegistry";

export const LESSON_PLAYBACK_VERSION = "playback-v1" as const;

export type LessonPlaybackVersion = typeof LESSON_PLAYBACK_VERSION;

export type LessonAssetStatus = "placeholder-only" | "partial-assets" | "ready-assets";

export type LessonPlaybackSource = "oli-master" | "coach-custom" | "ai-generated-placeholder";

export type LessonPlaybackMediaAsset = {
  assetId: string;
  assetType: ExerciseMediaAssetType;
  localPath?: string;
  remoteUrl?: string;
  posterPath?: string;
  status: ExerciseMediaAssetStatus;
  source: ExerciseMediaAssetSource;
  aspectRatio: MediaAssetAspectRatio;
  captionsPath?: string;
};

export type PlaceholderVisual = {
  label: string;
  treatment: string;
  icon: string;
  gradientHint: string;
  overlayLabels: string[];
  motionCue: string;
};

export type LessonPlaybackScene = {
  sceneId: string;
  slotId: string;
  slotType: string;
  order: number;
  title: string;
  subtitle: string;
  durationSeconds: number;
  narrationScript: string;
  onScreenText: string;
  clientPurpose: string;
  professionalPurpose: string;
  visualLabel: string;
  visualTreatment: string;
  placeholderVisual: PlaceholderVisual;
  mediaAsset?: LessonPlaybackMediaAsset;
  coachMessage?: string;
  source: LessonPlaybackSource;
  progressLabel: string;
  nextSceneId?: string;
  previousSceneId?: string;
};

export type LessonPlaybackPlan = {
  exerciseId: string;
  productVersion: string;
  packageVersion: string;
  playbackVersion: LessonPlaybackVersion;
  totalDurationSeconds: number;
  scenes: LessonPlaybackScene[];
  initialSceneId: string;
  clientGoal: string;
  teachingStyle: TeachingStyle;
  difficulty: DifficultyLevel;
  visualEmphasis: VisualEmphasis;
  hasCoachMessage: boolean;
  assetStatus: LessonAssetStatus;
  approvedVideoAssetCount: number;
};

export type LessonPlaybackProgress = {
  currentSceneIndex: number;
  totalScenes: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  percentComplete: number;
  sceneProgressPercent: number;
};

/** Map an approved exercise media asset to a playback scene attachment. */
export function toLessonPlaybackMediaAsset(
  asset: ExerciseMediaAsset,
): LessonPlaybackMediaAsset {
  return {
    assetId: asset.assetId,
    assetType: asset.assetType,
    localPath: asset.localPath,
    remoteUrl: asset.remoteUrl,
    posterPath: asset.posterPath,
    status: asset.status,
    source: asset.source,
    aspectRatio: asset.aspectRatio,
    captionsPath: asset.captionsPath,
  };
}

/** Resolve an approved video asset for lesson playback attachment. */
export function resolvePlaybackMediaAssetForSlot(
  exerciseId: string,
  slotId: string,
): LessonPlaybackMediaAsset | undefined {
  const asset = getApprovedVideoAssetForSlot(exerciseId, slotId);
  return asset ? toLessonPlaybackMediaAsset(asset) : undefined;
}

/** Whether a playback scene has a playable video asset attached. */
export function isPlayablePlaybackMediaAsset(
  mediaAsset: LessonPlaybackMediaAsset | undefined,
): boolean {
  if (!mediaAsset || mediaAsset.status !== "approved" || mediaAsset.assetType !== "video") {
    return false;
  }
  return Boolean(mediaAsset.localPath?.trim() || mediaAsset.remoteUrl?.trim());
}

/** Resolve video src from a playback media asset. */
export function resolvePlaybackVideoSrc(
  mediaAsset: LessonPlaybackMediaAsset,
): string | undefined {
  return mediaAsset.remoteUrl?.trim() || mediaAsset.localPath?.trim() || undefined;
}

/** Compute lesson asset status from approved playable count. */
export function resolveLessonAssetStatus(
  approvedCount: number,
  totalScenes: number,
): LessonAssetStatus {
  if (approvedCount <= 0) {
    return "placeholder-only";
  }
  if (approvedCount >= totalScenes) {
    return "ready-assets";
  }
  return "partial-assets";
}

/** UI label for scene playback surface mode. */
export function lessonScenePlaybackModeLabel(
  mediaAsset: LessonPlaybackMediaAsset | undefined,
): string {
  return isPlayablePlaybackMediaAsset(mediaAsset)
    ? "Master video asset"
    : "Storyboard preview — asset pending production";
}
