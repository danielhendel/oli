/** Exercise Media OS domain types (Sprint M1 — architecture only). */

export const EXERCISE_MEDIA_BLUEPRINT_VERSION = "blueprint-v1" as const;
export const MASTER_MEDIA_PACKAGE_VERSION = "master-v1" as const;
export const BENCH_PRESS_PILOT_PACKAGE_VERSION = "master-v1-bench-press-pilot" as const;

export type ExerciseMediaBlueprintVersion = typeof EXERCISE_MEDIA_BLUEPRINT_VERSION;
export type MasterMediaPackageVersion =
  | typeof MASTER_MEDIA_PACKAGE_VERSION
  | typeof BENCH_PRESS_PILOT_PACKAGE_VERSION;

export type MediaSlotType =
  | "heroDemo"
  | "setup"
  | "execution"
  | "slowMotion"
  | "commonMistake"
  | "muscleOverlay"
  | "jointOverlay"
  | "frontAngle"
  | "sideAngle"
  | "closeUp"
  | "coachIntro"
  | "coachNote"
  | "reflection";

export type MediaSlotStatus = "missing" | "planned" | "draft" | "reviewed" | "approved";

export type MediaOutputFormat = "mp4" | "webm" | "hls";

export type TeachingStyle =
  | "simple"
  | "technical"
  | "scientific"
  | "athletic"
  | "motivational"
  | "rehab-aware";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type VisualEmphasis =
  | "primaryMuscles"
  | "secondaryMuscles"
  | "jointPath"
  | "rangeOfMotion"
  | "tempo"
  | "breathing"
  | "setup"
  | "commonMistake";

export type ClientExperienceMode = "standard" | "compact" | "immersive";

export type MasterMediaPackageStatus = "missing" | "planned" | "partial" | "complete";

export type MediaReadinessStatus = "not-ready" | "planned" | "partial" | "ready";

export type ClientMediaSource = "oli-master" | "coach-custom" | "ai-generated-placeholder";

export type MediaPackageSource = "oli-master";

export type MediaAssetKind =
  | "placeholder-video"
  | "placeholder-overlay"
  | "placeholder-narration";

/** Sprint M7 — real media asset records for exercise lesson playback. */
export const EXERCISE_MEDIA_ASSET_VERSION = "media-asset-v1" as const;

export type ExerciseMediaAssetType = "video" | "image" | "animation" | "overlay" | "audio";

export type ExerciseMediaAssetStatus = "missing" | "draft" | "reviewed" | "approved";

export type ExerciseMediaAssetSource =
  | "oli-master"
  | "coach-custom"
  | "ai-generated"
  | "placeholder";

export type MediaAssetAspectRatio = "16:9" | "9:16" | "1:1";

export type ExerciseMediaAsset = {
  assetId: string;
  exerciseId: string;
  slotId: string;
  assetType: ExerciseMediaAssetType;
  status: ExerciseMediaAssetStatus;
  source: ExerciseMediaAssetSource;
  localPath?: string;
  remoteUrl?: string;
  posterPath?: string;
  durationSeconds?: number;
  aspectRatio: MediaAssetAspectRatio;
  captionsPath?: string;
  transcript?: string;
  version: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type MediaVisualTreatment =
  | "cinematic"
  | "slow-motion"
  | "anatomy-overlay"
  | "coach-intro"
  | "lesson-card";

export type BlueprintReviewStatus = "draft" | "reviewed" | "approved";

export type MediaSlot = {
  slotId: string;
  slotType: MediaSlotType;
  title: string;
  purpose: string;
  required: boolean;
  recommendedDurationSeconds: number;
  outputFormats: MediaOutputFormat[];
  status: MediaSlotStatus;
  /** Pilot / production metadata — optional for planned packages. */
  source?: MediaPackageSource;
  assetKind?: MediaAssetKind;
  visualTreatment?: MediaVisualTreatment;
  clientPurpose?: string;
  professionalPurpose?: string;
  placeholderVisualLabel?: string;
  visualTheme?: string;
};

export type ClientExperiencePhase = {
  phaseId: string;
  label: string;
  slotTypes: MediaSlotType[];
};

export type PersonalizationOptions = {
  teachingStyles: TeachingStyle[];
  difficultyLevels: DifficultyLevel[];
  visualEmphasis: VisualEmphasis[];
  clientExperienceModes: ClientExperienceMode[];
};

export type ExerciseMediaBlueprint = {
  exerciseId: string;
  exerciseName: string;
  blueprintVersion: ExerciseMediaBlueprintVersion;
  requiredSlots: MediaSlot[];
  optionalSlots: MediaSlot[];
  personalizationOptions: PersonalizationOptions;
  clientExperiencePhases: ClientExperiencePhase[];
  reviewStatus: BlueprintReviewStatus;
};

export type MasterMediaPackage = {
  exerciseId: string;
  packageVersion: MasterMediaPackageVersion;
  status: MasterMediaPackageStatus;
  slots: MediaSlot[];
  availableTeachingStyles: TeachingStyle[];
  availableDifficultyLevels: DifficultyLevel[];
  availableVisualEmphasis: VisualEmphasis[];
  estimatedDurationSeconds: number;
  qualityScore: number;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type MediaComposerState = {
  exerciseId: string;
  selectedTeachingStyle: TeachingStyle;
  selectedDifficulty: DifficultyLevel;
  selectedTodayFocus: VisualEmphasis;
  selectedVisualEmphasis: VisualEmphasis;
  coachMessage: string;
  enabledSlots: MediaSlotType[];
  clientExperienceMode: ClientExperienceMode;
};

export type ClientMediaTimelineItem = {
  itemId: string;
  slotId: string;
  slotType: MediaSlotType;
  title: string;
  type: MediaSlotType;
  durationSeconds: number;
  source: ClientMediaSource;
  clientPurpose: string;
};

export type ClientMediaTimeline = {
  exerciseId: string;
  totalDurationSeconds: number;
  items: ClientMediaTimelineItem[];
};

export type MediaReadinessScore = {
  score: number;
  status: MediaReadinessStatus;
  missingRequiredSlots: MediaSlotType[];
  approvedSlots: number;
  plannedSlots: number;
  recommendations: string[];
};

export type ExerciseMediaExperiencePayloadRef = {
  mediaBlueprintVersion: ExerciseMediaBlueprintVersion;
  masterPackageVersion: MasterMediaPackageVersion;
  selectedTeachingStyle: TeachingStyle;
  selectedDifficulty: DifficultyLevel;
  selectedTodayFocus: VisualEmphasis;
  selectedVisualEmphasis: VisualEmphasis;
  hasCoachMessage: boolean;
  timelineItemCount: number;
  estimatedDurationSeconds: number;
  /** Bench Press product pipeline refs — compact only. */
  exerciseProductVersion?: string;
  productionBriefVersion?: string;
  qaVersion?: string;
  assetStatus?: "placeholder-only" | "partial-assets" | "real-assets";
  mediaAssetManifestVersion?: string;
  approvedVideoAssetCount?: number;
};

export const TEACHING_STYLES: TeachingStyle[] = [
  "simple",
  "technical",
  "scientific",
  "athletic",
  "motivational",
  "rehab-aware",
];

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "elite",
];

export const VISUAL_EMPHASIS_OPTIONS: VisualEmphasis[] = [
  "primaryMuscles",
  "secondaryMuscles",
  "jointPath",
  "rangeOfMotion",
  "tempo",
  "breathing",
  "setup",
  "commonMistake",
];

export const REQUIRED_SLOT_TYPES: MediaSlotType[] = [
  "heroDemo",
  "setup",
  "execution",
  "commonMistake",
  "coachIntro",
];

export const OPTIONAL_SLOT_TYPES: MediaSlotType[] = [
  "slowMotion",
  "muscleOverlay",
  "jointOverlay",
  "frontAngle",
  "sideAngle",
  "closeUp",
  "coachNote",
  "reflection",
];

export const CLIENT_TIMELINE_SLOT_ORDER: MediaSlotType[] = [
  "coachIntro",
  "heroDemo",
  "setup",
  "execution",
  "commonMistake",
  "slowMotion",
  "muscleOverlay",
  "reflection",
];

export type MediaBlueprintInput = {
  exerciseId: string;
  exerciseName: string;
};
