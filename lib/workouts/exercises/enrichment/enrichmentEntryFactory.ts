import {
  EXERCISE_LIBRARY_ENRICHMENT_VERSION,
  type EnrichmentMovementPattern,
  type ExerciseCoachingProfile,
  type ExerciseEnrichmentQualityProfile,
  type ExerciseLibraryEnrichmentV1,
  type ExerciseMediaRequirementProfile,
  type ExerciseMovementProfile,
  type ExerciseProgrammingProfile,
  type ExerciseSafetyProfile,
  type ExerciseSubstitutionProfile,
  type KeyframeRequirement,
  type PlaneOfMotion,
  type SkillComplexity,
  type StabilityDemand,
  type TempoDefaults,
  type TrainingUse,
} from "./types";

export type EnrichmentEntryInput = {
  readonly exerciseId: string;
  readonly movementPattern: EnrichmentMovementPattern;
  readonly planeOfMotion: PlaneOfMotion;
  readonly bodyRegion: string;
  readonly laterality: ExerciseMovementProfile["laterality"];
  readonly kineticChain: ExerciseMovementProfile["kineticChain"];
  readonly primaryJointActions: readonly string[];
  readonly setupPosition: string;
  readonly startPosition: string;
  readonly endPosition: string;
  readonly rangeOfMotionDefinition: string;
  readonly stabilityDemand: StabilityDemand;
  readonly loadingPattern: string;
  readonly skillComplexity: SkillComplexity;
  readonly tempoDefaults: TempoDefaults;
  readonly primaryTrainingUses: readonly TrainingUse[];
  readonly bestRepRanges: readonly string[];
  readonly loadingGuidance: string;
  readonly fatigueCost: ExerciseProgrammingProfile["fatigueCost"];
  readonly technicalFailureRisk: ExerciseProgrammingProfile["technicalFailureRisk"];
  readonly suggestedBlockTypes: readonly string[];
  readonly progressionStrategy: string;
  readonly regressionStrategy: string;
  readonly jointStressTags: readonly string[];
  readonly pairingSuggestions: readonly string[];
  readonly avoidPairingWith: readonly string[];
  readonly coaching: Omit<ExerciseCoachingProfile, never>;
  readonly safety: ExerciseSafetyProfile;
  readonly substitutions: ExerciseSubstitutionProfile;
  readonly media: ExerciseMediaRequirementProfile;
  readonly knownGaps?: readonly string[];
};

const DEFAULT_RENDER_TARGETS = ["16:9", "9:16", "1:1"] as const;
const DEFAULT_VIEWS = ["front_45_right", "side"] as const;
const DEFAULT_CHARACTERS = ["oli_motion_male_m1", "oli_motion_female_f1"] as const;

const GLOBAL_MEDIA_FAILURES = [
  "Warped barbell or dumbbell geometry",
  "Distorted hands or impossible anatomy",
  "Watermark, logos, or readable text",
  "Inconsistent character identity across frames",
  "Cropped equipment critical to exercise understanding",
] as const;

const GLOBAL_IMAGE_QA = [
  "Realistic anatomy and equipment",
  "Educationally clear on mobile",
  "Premium dark Oli studio aesthetic",
  "No watermark or readable text",
] as const;

export function standardKeyframes(
  poses: readonly {
    poseId: string;
    poseLabel: string;
    poseRole: KeyframeRequirement["poseRole"];
    sortOrder: number;
    coachingCaption: string;
    acceptanceCriteria: readonly string[];
    negativeCriteria?: readonly string[];
  }[],
): readonly KeyframeRequirement[] {
  return poses.map((pose) => ({
    poseId: pose.poseId,
    poseLabel: pose.poseLabel,
    poseRole: pose.poseRole,
    sortOrder: pose.sortOrder,
    requiredForImagePack: true,
    acceptanceCriteria: pose.acceptanceCriteria,
    negativeCriteria: pose.negativeCriteria ?? ["Warped equipment", "Impossible anatomy", "Watermark or logos"],
    coachingCaption: pose.coachingCaption,
  }));
}

export function buildMediaProfile(
  overrides: Partial<ExerciseMediaRequirementProfile> & {
    keyframeRequirements: readonly KeyframeRequirement[];
  },
): ExerciseMediaRequirementProfile {
  return {
    preferredCharacterIds: [...DEFAULT_CHARACTERS],
    requiredViews: [...DEFAULT_VIEWS],
    renderTargets: [...DEFAULT_RENDER_TARGETS],
    equipmentVisibilityRequirements: ["Primary equipment fully visible in 16:9 master view"],
    bodyVisibilityRequirements: ["Working joints and end positions readable on mobile"],
    environmentRequirements: ["Premium dark Oli studio", "Consistent lighting across frames"],
    commonGenerationFailures: [...GLOBAL_MEDIA_FAILURES],
    imageQaFocus: [...GLOBAL_IMAGE_QA],
    futureVideoQaFocus: ["Single-rep integrity", "Smooth controlled tempo", "No second rep implied at finish"],
    recommendedLessonScenes: ["setup", "execution", "common-mistake"],
    ...overrides,
  };
}

function computeQualityProfile(knownGaps: readonly string[]): ExerciseEnrichmentQualityProfile {
  const gapPenalty = Math.min(knownGaps.length * 5, 25);
  const base = 100 - gapPenalty;
  return {
    completenessScore: base,
    mediaReadinessScore: Math.max(0, base - 15),
    academyReadinessScore: Math.max(0, base - 10),
    programmingReadinessScore: base,
    safetyReadinessScore: base,
    expertReviewRequired: true,
    knownGaps,
  };
}

export function buildEnrichmentEntry(input: EnrichmentEntryInput): ExerciseLibraryEnrichmentV1 {
  const knownGaps = input.knownGaps ?? [
    "Enrichment metadata complete — awaiting expert review sign-off.",
    "No approved media assets exist for this exercise yet.",
  ];

  return {
    exerciseId: input.exerciseId,
    enrichmentVersion: EXERCISE_LIBRARY_ENRICHMENT_VERSION,
    reviewStatus: "ready-for-expert-review",
    movementProfile: {
      movementPattern: input.movementPattern,
      planeOfMotion: input.planeOfMotion,
      bodyRegion: input.bodyRegion,
      laterality: input.laterality,
      kineticChain: input.kineticChain,
      primaryJointActions: input.primaryJointActions,
      setupPosition: input.setupPosition,
      startPosition: input.startPosition,
      endPosition: input.endPosition,
      rangeOfMotionDefinition: input.rangeOfMotionDefinition,
      stabilityDemand: input.stabilityDemand,
      loadingPattern: input.loadingPattern,
      skillComplexity: input.skillComplexity,
      tempoDefaults: input.tempoDefaults,
    },
    programmingProfile: {
      primaryTrainingUses: input.primaryTrainingUses,
      bestRepRanges: input.bestRepRanges,
      loadingGuidance: input.loadingGuidance,
      fatigueCost: input.fatigueCost,
      technicalFailureRisk: input.technicalFailureRisk,
      suggestedBlockTypes: input.suggestedBlockTypes,
      progressionStrategy: input.progressionStrategy,
      regressionStrategy: input.regressionStrategy,
      volumeCountingRules: {
        primarySetCredit: 1,
        secondarySetCredit: 0.5,
        stabilizerSetCredit: 0.25,
        jointStressTags: input.jointStressTags,
      },
      pairingSuggestions: input.pairingSuggestions,
      avoidPairingWith: input.avoidPairingWith,
    },
    coachingProfile: input.coaching,
    safetyProfile: input.safety,
    substitutionProfile: input.substitutions,
    mediaProfile: input.media,
    qualityProfile: computeQualityProfile(knownGaps),
  };
}

export function defaultCoaching(
  setup: string[],
  execution: string[],
  mistakes: string[],
  corrections: string[],
  summary: string,
  focus: string[],
): ExerciseCoachingProfile {
  return {
    setupCues: setup,
    executionCues: execution,
    breathingCues: ["Brace before the effort phase", "Exhale through the hardest point without losing brace"],
    feelCues: ["Controlled tension in target muscles", "Stable joints through full owned range"],
    commonMistakes: mistakes,
    correctionCues: corrections,
    clientFriendlySummary: summary,
    coachNotes: ["Scale load before compensating form.", "Use owned range before adding load."],
    lessonFocus: focus,
  };
}

export function defaultSafety(
  flags: ExerciseSafetyProfile["cautionFlags"],
  notes: string[],
): ExerciseSafetyProfile {
  return {
    contraindicationNotes: [
      "Scale or substitute if pain exceeds mild muscular discomfort.",
      "Not a substitute for individualized medical clearance.",
    ],
    cautionFlags: flags,
    commonPainSignals: ["Sharp joint pain", "Pinching at end range", "Loss of control under load"],
    formBreakdownRisks: ["Compensatory movement when load exceeds skill", "Loss of brace or alignment"],
    loadManagementNotes: "Increase load only when technique remains consistent across all reps.",
    professionalReviewRecommendedWhen: notes,
  };
}

export function sub(
  exerciseId: string,
  reason: string,
  substitutionType: ExerciseSubstitutionProfile["regressions"][number]["substitutionType"],
) {
  return { exerciseId, reason, substitutionType };
}

export const DEFAULT_TEMPO: TempoDefaults = {
  eccentricSeconds: 2,
  pauseSeconds: 0,
  concentricSeconds: 1,
  resetSeconds: 1,
  notes: "Adjust tempo for goal — slower eccentrics for hypertrophy, explosive concentrics for power.",
};

export const PAUSE_TEMPO: TempoDefaults = {
  eccentricSeconds: 2,
  pauseSeconds: 1,
  concentricSeconds: 1,
  resetSeconds: 1,
  notes: "Brief pause at turnaround for control and positional awareness.",
};
