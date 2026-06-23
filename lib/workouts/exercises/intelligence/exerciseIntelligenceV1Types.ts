/**
 * Additive Exercise Intelligence overlay (v1).
 * Keyed by catalog `exerciseId` from EXERCISE_LIBRARY_V1 — does not replace the library.
 */

export const EXERCISE_INTELLIGENCE_SCHEMA_VERSION = 1 as const;

export type ExerciseIntelligenceEvidenceLevel =
  | "expert_curated"
  | "literature_informed"
  | "heuristic"
  | "library_derived";

/** Regional hypertrophy stimulus weights (0–1 each; active regions should sum ≤ 1). */
export type RegionalStimulusV1 = {
  upperChest?: number;
  midChest?: number;
  lowerChest?: number;
  lats?: number;
  upperBack?: number;
  frontDelts?: number;
  sideDelts?: number;
  rearDelts?: number;
  biceps?: number;
  triceps?: number;
  quads?: number;
  hamstrings?: number;
  glutes?: number;
  calves?: number;
  abs?: number;
  forearms?: number;
  tibialis?: number;
};

/** Relative joint stress indices (0 = low, 1 = high). Not a medical ontology. */
export type JointStressV1 = {
  lumbarStress?: number;
  shoulderStress?: number;
  elbowStress?: number;
  wristStress?: number;
  hipStress?: number;
  kneeStress?: number;
  ankleStress?: number;
};

export type ExerciseIntelligenceV1 = {
  exerciseId: string;
  schemaVersion: typeof EXERCISE_INTELLIGENCE_SCHEMA_VERSION;
  evidenceLevel: ExerciseIntelligenceEvidenceLevel;
  stimulus: RegionalStimulusV1;
  /** CNS + local fatigue cost per hard set (0–1). */
  fatigue: number;
  /** Local tissue recovery demand index (0–1); higher = longer spacing. */
  recoveryDemand: number;
  /** Hypertrophy stimulus per unit fatigue (0–1). */
  stimulusToFatigueRatio: number;
  jointStress: JointStressV1;
  skillRequirement: number;
  mobilityRequirement: number;
  stabilityRequirement: number;
  loadedStretch: number;
  hypertrophyPotential: number;
  frequencySuitability: number;
  progressionPotential: number;
};

const SCORE_MIN = 0;
const SCORE_MAX = 1;
const STIMULUS_SUM_MAX = 1;

function isFiniteScore(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

function regionalStimulusSum(stimulus: RegionalStimulusV1): number {
  let sum = 0;
  for (const v of Object.values(stimulus)) {
    if (typeof v === "number" && Number.isFinite(v)) sum += v;
  }
  return sum;
}

/** Sum of regional stimulus weights for an exercise overlay. */
export function exerciseIntelligenceStimulusSum(stimulus: RegionalStimulusV1): number {
  return regionalStimulusSum(stimulus);
}

/** Fail-closed validation for bundled intelligence rows. */
export function validateExerciseIntelligenceV1(row: ExerciseIntelligenceV1): boolean {
  if (row.schemaVersion !== EXERCISE_INTELLIGENCE_SCHEMA_VERSION) return false;
  if (typeof row.exerciseId !== "string" || row.exerciseId.trim().length === 0) return false;

  const requiredScores: (keyof ExerciseIntelligenceV1)[] = [
    "fatigue",
    "recoveryDemand",
    "stimulusToFatigueRatio",
    "skillRequirement",
    "mobilityRequirement",
    "stabilityRequirement",
    "loadedStretch",
    "hypertrophyPotential",
    "frequencySuitability",
    "progressionPotential",
  ];
  for (const key of requiredScores) {
    if (!isFiniteScore(row[key])) return false;
  }

  for (const v of Object.values(row.stimulus)) {
    if (v !== undefined && !isFiniteScore(v)) return false;
  }
  if (regionalStimulusSum(row.stimulus) > STIMULUS_SUM_MAX + 1e-9) return false;

  for (const v of Object.values(row.jointStress)) {
    if (v !== undefined && !isFiniteScore(v)) return false;
  }

  return true;
}
