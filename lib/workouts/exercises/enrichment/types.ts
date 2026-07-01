/** Exercise Library Enrichment v1 — additive layer keyed by canonical exerciseId. */

export const EXERCISE_LIBRARY_ENRICHMENT_VERSION = "exercise-library-enrichment-v1" as const;

export type ExerciseLibraryEnrichmentVersion = typeof EXERCISE_LIBRARY_ENRICHMENT_VERSION;

export type ExerciseEnrichmentReviewStatus =
  | "draft"
  | "ready-for-expert-review"
  | "expert-reviewed"
  | "deprecated";

export type EnrichmentMovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal-press"
  | "vertical-press"
  | "horizontal-pull"
  | "vertical-pull"
  | "carry"
  | "rotation"
  | "anti-rotation"
  | "anti-extension"
  | "isolation"
  | "locomotion"
  | "mobility"
  | "conditioning"
  | "other";

export type PlaneOfMotion = "sagittal" | "frontal" | "transverse" | "multi-planar";

export type Laterality = "bilateral" | "unilateral" | "alternating" | "asymmetrical" | "not-applicable";

export type KineticChain = "open-chain" | "closed-chain" | "mixed" | "not-applicable";

export type StabilityDemand = "low" | "medium" | "high";

export type SkillComplexity = "beginner" | "intermediate" | "advanced";

export type TempoDefaults = {
  readonly eccentricSeconds: number;
  readonly pauseSeconds: number;
  readonly concentricSeconds: number;
  readonly resetSeconds: number;
  readonly notes: string;
};

export type ExerciseMovementProfile = {
  readonly movementPattern: EnrichmentMovementPattern;
  readonly planeOfMotion: PlaneOfMotion;
  readonly bodyRegion: string;
  readonly laterality: Laterality;
  readonly kineticChain: KineticChain;
  readonly primaryJointActions: readonly string[];
  readonly setupPosition: string;
  readonly startPosition: string;
  readonly endPosition: string;
  readonly rangeOfMotionDefinition: string;
  readonly stabilityDemand: StabilityDemand;
  readonly loadingPattern: string;
  readonly skillComplexity: SkillComplexity;
  readonly tempoDefaults: TempoDefaults;
};

export type TrainingUse =
  | "strength"
  | "hypertrophy"
  | "power"
  | "endurance"
  | "skill"
  | "rehab-prehab"
  | "warm-up"
  | "mobility"
  | "conditioning"
  | "general-fitness";

export type VolumeCountingRules = {
  readonly primarySetCredit: number;
  readonly secondarySetCredit: number;
  readonly stabilizerSetCredit: number;
  readonly jointStressTags: readonly string[];
};

export type ExerciseProgrammingProfile = {
  readonly primaryTrainingUses: readonly TrainingUse[];
  readonly bestRepRanges: readonly string[];
  readonly loadingGuidance: string;
  readonly fatigueCost: "low" | "medium" | "high";
  readonly technicalFailureRisk: "low" | "medium" | "high";
  readonly suggestedBlockTypes: readonly string[];
  readonly progressionStrategy: string;
  readonly regressionStrategy: string;
  readonly volumeCountingRules: VolumeCountingRules;
  readonly pairingSuggestions: readonly string[];
  readonly avoidPairingWith: readonly string[];
};

export type ExerciseCoachingProfile = {
  readonly setupCues: readonly string[];
  readonly executionCues: readonly string[];
  readonly breathingCues: readonly string[];
  readonly feelCues: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly correctionCues: readonly string[];
  readonly clientFriendlySummary: string;
  readonly coachNotes: readonly string[];
  readonly lessonFocus: readonly string[];
};

export type CautionFlag =
  | "shoulder-sensitive"
  | "low-back-sensitive"
  | "knee-sensitive"
  | "hip-sensitive"
  | "wrist-sensitive"
  | "balance-demand"
  | "high-load"
  | "high-skill"
  | "overhead-position"
  | "spinal-loading";

export type ExerciseSafetyProfile = {
  readonly contraindicationNotes: readonly string[];
  readonly cautionFlags: readonly CautionFlag[];
  readonly commonPainSignals: readonly string[];
  readonly formBreakdownRisks: readonly string[];
  readonly loadManagementNotes: string;
  readonly professionalReviewRecommendedWhen: readonly string[];
};

export type SubstitutionType = "regression" | "progression" | "lateral" | "equipment";

export type ExerciseSubstitutionReference = {
  readonly exerciseId: string;
  readonly reason: string;
  readonly substitutionType: SubstitutionType;
};

export type ExerciseSubstitutionProfile = {
  readonly regressions: readonly ExerciseSubstitutionReference[];
  readonly progressions: readonly ExerciseSubstitutionReference[];
  readonly lateralSubstitutions: readonly ExerciseSubstitutionReference[];
  readonly equipmentSubstitutions: readonly ExerciseSubstitutionReference[];
};

export type KeyframePoseRole =
  | "setup"
  | "start"
  | "bottom"
  | "top"
  | "finish"
  | "midpoint"
  | "mistake"
  | "transition";

export type KeyframeRequirement = {
  readonly poseId: string;
  readonly poseLabel: string;
  readonly poseRole: KeyframePoseRole;
  readonly sortOrder: number;
  readonly requiredForImagePack: boolean;
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly coachingCaption: string;
};

export type ExerciseMediaRequirementProfile = {
  readonly preferredCharacterIds: readonly string[];
  readonly keyframeRequirements: readonly KeyframeRequirement[];
  readonly requiredViews: readonly string[];
  readonly renderTargets: readonly string[];
  readonly equipmentVisibilityRequirements: readonly string[];
  readonly bodyVisibilityRequirements: readonly string[];
  readonly environmentRequirements: readonly string[];
  readonly commonGenerationFailures: readonly string[];
  readonly imageQaFocus: readonly string[];
  readonly futureVideoQaFocus: readonly string[];
  readonly recommendedLessonScenes: readonly string[];
};

export type ExerciseEnrichmentQualityProfile = {
  readonly completenessScore: number;
  readonly mediaReadinessScore: number;
  readonly academyReadinessScore: number;
  readonly programmingReadinessScore: number;
  readonly safetyReadinessScore: number;
  readonly expertReviewRequired: boolean;
  readonly knownGaps: readonly string[];
};

export type ExerciseLibraryEnrichmentV1 = {
  readonly exerciseId: string;
  readonly enrichmentVersion: ExerciseLibraryEnrichmentVersion;
  readonly reviewStatus: ExerciseEnrichmentReviewStatus;
  readonly lastReviewedAt?: string;
  readonly reviewedBy?: string;
  readonly movementProfile: ExerciseMovementProfile;
  readonly programmingProfile: ExerciseProgrammingProfile;
  readonly coachingProfile: ExerciseCoachingProfile;
  readonly safetyProfile: ExerciseSafetyProfile;
  readonly substitutionProfile: ExerciseSubstitutionProfile;
  readonly mediaProfile: ExerciseMediaRequirementProfile;
  readonly qualityProfile: ExerciseEnrichmentQualityProfile;
};

export type ExerciseLibraryEnrichmentValidationSeverity = "info" | "warning" | "error";

export type ExerciseLibraryEnrichmentValidationIssue = {
  readonly code: string;
  readonly severity: ExerciseLibraryEnrichmentValidationSeverity;
  readonly exerciseId?: string;
  readonly fieldPath: string;
  readonly message: string;
};

export type ExerciseLibraryEnrichmentValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly ExerciseLibraryEnrichmentValidationIssue[];
};

export type EnrichmentReadinessLabel =
  | "not-started"
  | "partial"
  | "metadata-ready"
  | "ready-for-expert-review"
  | "expert-reviewed"
  | "media-planning-ready";

export type ExerciseLibraryEnrichmentReadinessReport = {
  readonly totalCanonicalExercises: number;
  readonly enrichedExerciseCount: number;
  readonly top25EnrichedCount: number;
  readonly top50PlannedCount: number;
  readonly validationErrorCount: number;
  readonly validationWarningCount: number;
  readonly movementCompleteness: number;
  readonly programmingCompleteness: number;
  readonly coachingCompleteness: number;
  readonly safetyCompleteness: number;
  readonly mediaRequirementCompleteness: number;
  readonly expertReviewedCount: number;
  readonly readyForExpertReviewCount: number;
  readonly mediaReadyCount: number;
  readonly overallScore: number;
  readonly readinessLabel: EnrichmentReadinessLabel;
  readonly warnings: readonly string[];
  readonly nextRecommendedActions: readonly string[];
};

export type EnrichedExerciseProfile = {
  readonly exerciseId: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly equipment: string;
  readonly primaryMuscles: readonly string[];
  readonly secondaryMuscles: readonly string[];
  readonly movementPattern: string;
  readonly trainingType: string;
  readonly hasEnrichment: boolean;
  readonly enrichment: ExerciseLibraryEnrichmentV1 | null;
  readonly readinessSummary: {
    readonly label: EnrichmentReadinessLabel;
    readonly expertReviewRequired: boolean;
    readonly mediaPlanningReady: boolean;
    readonly knownGaps: readonly string[];
  };
};
