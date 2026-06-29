/** Exercise Academy domain types — professional teaching foundation (academy-v1). */

export const EXERCISE_ACADEMY_VERSION = "academy-v1" as const;

export type ExerciseAcademyVersion = typeof EXERCISE_ACADEMY_VERSION;

export type ExerciseAcademySource = "canonical" | "custom";

export type ExerciseSkillLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type ExerciseMediaPlanStatus = "missing" | "planned" | "partial" | "complete";

export type ExerciseMediaSlotKind =
  | "hero-demo"
  | "setup"
  | "execution"
  | "slow-motion"
  | "common-mistake"
  | "front-angle"
  | "side-angle"
  | "close-up"
  | "muscle-overlay"
  | "coach-intro-custom"
  | "coach-note-custom";

export type ExerciseMediaSlot = {
  slotId: ExerciseMediaSlotKind;
  label: string;
  status: "missing" | "planned";
  description: string;
};

export type ExerciseIdentity = {
  exerciseId: string;
  name: string;
  aliases: string[];
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  movementPattern: string | null;
  difficulty: ExerciseSkillLevel;
  skillLevel: ExerciseSkillLevel;
};

export type ExerciseBiomechanics = {
  primaryJointActions: string[];
  movementPath: string;
  rangeOfMotion: string;
  stabilityDemand: string;
  fatigueCost: string;
  recoveryCost: string;
};

export type ExerciseTeaching = {
  overview: string;
  setup: string;
  execution: string;
  coachingCues: string[];
  commonMistakes: string[];
  shouldFeel: string[];
  shouldNotFeel: string[];
  breathing: string;
  tempo: string;
  bracing: string;
  beginnerNotes: string;
  advancedNotes: string;
};

export type ExerciseMediaPlan = {
  heroDemo: ExerciseMediaSlot;
  setupClip: ExerciseMediaSlot;
  executionClip: ExerciseMediaSlot;
  slowMotionClip: ExerciseMediaSlot;
  commonMistakeClips: ExerciseMediaSlot[];
  angleClips: ExerciseMediaSlot[];
  muscleOverlay: ExerciseMediaSlot;
  coachCustomSlots: ExerciseMediaSlot[];
  status: ExerciseMediaPlanStatus;
  missingSlotIds: ExerciseMediaSlotKind[];
};

export type ExerciseLessonModuleType =
  | "overview"
  | "setup"
  | "execution"
  | "breathing"
  | "commonMistakes"
  | "feel"
  | "progression"
  | "regression"
  | "reflection"
  | "coachNote"
  | "media";

export type ExerciseLessonModule = {
  moduleId: string;
  type: ExerciseLessonModuleType;
  title: string;
  summary: string;
  teachingPoints: string[];
  mediaSlotIds: ExerciseMediaSlotKind[];
  requiredForClient: boolean;
  editableByProfessional: boolean;
};

export type ExerciseProgramming = {
  bestUsedFor: string[];
  loadingPatterns: string[];
  repRanges: string[];
  tempoOptions: string[];
  progressionOptions: string[];
  regressionOptions: string[];
  contraindicationNotes: string;
  programmingNotes: string;
};

export type ExerciseSafety = {
  generalNotes: string;
  stopIf: string[];
  scalingNotes: string;
};

export type ExerciseSubstitutions = {
  regressionOptions: string[];
  substitutionOptions: string[];
  notes: string;
};

export type ExerciseKnowledgeQuality = {
  score: number;
  hasOverview: boolean;
  hasSetup: boolean;
  hasExecution: boolean;
  hasCues: boolean;
  hasMistakes: boolean;
  hasFeelGuide: boolean;
  hasProgression: boolean;
  hasMediaPlan: boolean;
  missingItems: string[];
};

export type ExerciseAcademyEntry = {
  exerciseId: string;
  exerciseName: string;
  source: ExerciseAcademySource;
  version: ExerciseAcademyVersion;
  identity: ExerciseIdentity;
  biomechanics: ExerciseBiomechanics;
  teaching: ExerciseTeaching;
  mediaPlan: ExerciseMediaPlan;
  programming: ExerciseProgramming;
  safety: ExerciseSafety;
  substitutions: ExerciseSubstitutions;
  quality: ExerciseKnowledgeQuality;
};

/** Compact academy reference for preliminary app payload — not full teaching text. */
export type ExerciseAcademyPayloadRef = {
  exerciseId: string;
  academyVersion: ExerciseAcademyVersion;
  qualityScore: number;
  mediaPlanStatus: ExerciseMediaPlanStatus;
  lessonModuleCount: number;
  lessonModuleTypes: ExerciseLessonModuleType[];
  missingMediaSlotIds: ExerciseMediaSlotKind[];
};
