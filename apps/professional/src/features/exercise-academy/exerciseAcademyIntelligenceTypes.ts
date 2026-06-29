/** Exercise Academy Intelligence overlay types (intelligence-v1). */

export const EXERCISE_ACADEMY_INTELLIGENCE_VERSION = "intelligence-v1" as const;

export type ExerciseAcademyIntelligenceVersion = typeof EXERCISE_ACADEMY_INTELLIGENCE_VERSION;

export type IntelligenceReviewStatus = "draft" | "reviewed" | "approved";

export type IntelligenceEvidenceLevel =
  | "expert-consensus"
  | "textbook"
  | "research-supported"
  | "needs-review";

export type JointKind =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "spine"
  | "hip"
  | "knee"
  | "ankle"
  | "neck"
  | "other";

export type StressLevel = "low" | "moderate" | "high";

export type StabilityDemand = "low" | "moderate" | "high";

export type FatigueLevel = "low" | "moderate" | "high";

export type ProgrammingGoal =
  | "hypertrophy"
  | "strength"
  | "skill"
  | "conditioning"
  | "rehab-prehab"
  | "general-fitness";

export type ProgrammingFit = "primary" | "secondary" | "optional";

export type JointConsideration = {
  joint: JointKind;
  stressLevel: StressLevel;
  note: string;
};

export type MovementAnalysis = {
  pattern: string;
  plane: string;
  primeActions: string[];
  limitingFactors: string[];
  stabilityDemand: StabilityDemand;
};

export type ProgrammingUseCase = {
  goal: ProgrammingGoal;
  fit: ProgrammingFit;
  note: string;
};

export type FatigueProfile = {
  localFatigue: FatigueLevel;
  systemicFatigue: FatigueLevel;
  recoveryCost: FatigueLevel;
  note: string;
};

export type ExerciseAcademyIntelligenceEntry = {
  exerciseId: string;
  academyVersion: ExerciseAcademyIntelligenceVersion;
  reviewStatus: IntelligenceReviewStatus;
  evidenceLevel: IntelligenceEvidenceLevel;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  stabilizers: string[];
  jointConsiderations: JointConsideration[];
  movementAnalysis: MovementAnalysis;
  programmingUseCases: ProgrammingUseCase[];
  fatigueProfile: FatigueProfile;
  coachingDecisionNotes: string;
  substitutions: {
    regressionOptions: string[];
    substitutionOptions: string[];
  };
  reviewNotes: string;
};

export type IntelligenceCoverage = {
  totalCanonical: number;
  withIntelligence: number;
  missingExerciseIds: string[];
  coveragePercent: number;
};
