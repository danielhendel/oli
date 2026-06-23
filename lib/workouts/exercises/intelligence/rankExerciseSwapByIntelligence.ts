/**
 * Intelligence-aware exercise swap ranking (additive layer).
 * Pure functions — no IO, no React.
 *
 * Re-ranks swap candidates using hypertrophy stimulus similarity, movement intent,
 * SFR, and joint-stress constraints. Legacy swap scores remain part of the final score.
 */

import { mergeExerciseIntelligenceForId } from "../classificationResolvers";
import { getExerciseIntelligenceV1 } from "./exerciseIntelligenceV1Registry";
import type { RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";

const REGION_KEYS: readonly (keyof RegionalStimulusV1)[] = [
  "upperChest",
  "midChest",
  "lowerChest",
  "lats",
  "upperBack",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
  "tibialis",
] as const;

const STIMULUS_SIMILARITY_WEIGHT = 35;
const PRIMARY_REGION_BONUS = 12;
const MOVEMENT_PATTERN_BONUS = 10;
const LIBRARY_MOVEMENT_BONUS = 5;
const SFR_BONUS_WEIGHT = 15;
const TARGET_REGION_BONUS = 8;
const LUMBAR_PENALTY_WEIGHT = 28;
const SHOULDER_PENALTY_WEIGHT = 28;
const HIGH_JOINT_STRESS_THRESHOLD = 0.45;

const SIMILAR_STIMULUS_THRESHOLD = 0.75;
const BETTER_SFR_MARGIN = 0.03;
const LOW_LUMBAR_STRESS_ABSOLUTE = 0.4;
const LOW_SHOULDER_STRESS_ABSOLUTE = 0.45;

/** Deterministic short tags for swap recommendation reasons. */
export const EXERCISE_SWAP_REASON_TAGS = {
  SIMILAR_STIMULUS: "similar_stimulus",
  BETTER_SFR: "better_sfr",
  LOWER_LUMBAR_STRESS: "lower_lumbar_stress",
  SAME_TARGET_MUSCLE: "same_target_muscle",
  LOWER_SHOULDER_STRESS: "lower_shoulder_stress",
} as const;

export type ExerciseSwapReasonTag =
  (typeof EXERCISE_SWAP_REASON_TAGS)[keyof typeof EXERCISE_SWAP_REASON_TAGS];

const REASON_TAG_ORDER: readonly ExerciseSwapReasonTag[] = [
  EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS,
  EXERCISE_SWAP_REASON_TAGS.SAME_TARGET_MUSCLE,
  EXERCISE_SWAP_REASON_TAGS.BETTER_SFR,
  EXERCISE_SWAP_REASON_TAGS.LOWER_LUMBAR_STRESS,
  EXERCISE_SWAP_REASON_TAGS.LOWER_SHOULDER_STRESS,
];

const REGION_PHRASES: Record<keyof RegionalStimulusV1, string> = {
  upperChest: "upper chest",
  midChest: "chest",
  lowerChest: "lower chest",
  lats: "lat",
  upperBack: "upper back",
  frontDelts: "front delt",
  sideDelts: "side delt",
  rearDelts: "rear delt",
  biceps: "biceps",
  triceps: "triceps",
  quads: "quad",
  hamstrings: "hamstring",
  glutes: "glute",
  calves: "calf",
  abs: "ab",
  forearms: "forearm",
  tibialis: "tibialis",
};

const REASON_PHRASES: Record<Exclude<ExerciseSwapReasonTag, "similar_stimulus">, string> = {
  same_target_muscle: "Same target muscle",
  better_sfr: "Better SFR",
  lower_lumbar_stress: "Lower lumbar stress",
  lower_shoulder_stress: "Lower shoulder stress",
};

export type RankExerciseSwapConstraints = {
  /** Penalize candidates with elevated lumbar stress. */
  avoidHighLumbarStress?: boolean;
  /** Penalize candidates with elevated shoulder stress. */
  avoidHighShoulderStress?: boolean;
  /** Prefer candidates that stimulate these regions. */
  targetRegions?: readonly (keyof RegionalStimulusV1)[];
  /** When false, skip SFR bonus. Defaults to true. */
  preferHigherSfr?: boolean;
};

export type ExerciseSwapIntelligenceScoreBreakdown = {
  stimulusSimilarity: number;
  primaryRegionBonus: number;
  movementIntentBonus: number;
  sfrBonus: number;
  targetRegionBonus: number;
  jointStressPenalty: number;
  intelligenceScore: number;
  baseSwapScore: number;
  finalScore: number;
};

export type RankedExerciseSwapCandidate = {
  exerciseId: string;
  breakdown: ExerciseSwapIntelligenceScoreBreakdown;
  reasonTags: readonly ExerciseSwapReasonTag[];
  reasonSummary: string | null;
};

export type RankExerciseSwapByIntelligenceArgs = {
  sourceExerciseId: string;
  candidateExerciseIds: readonly string[];
  constraints?: RankExerciseSwapConstraints;
  /** Legacy swap scores keyed by exercise id (preserved in final ranking). */
  baseSwapScoresByExerciseId?: Readonly<Record<string, number>>;
};

function primaryStimulusRegion(stimulus: RegionalStimulusV1): keyof RegionalStimulusV1 | null {
  let best: keyof RegionalStimulusV1 | null = null;
  let bestVal = 0;
  for (const key of REGION_KEYS) {
    const v = stimulus[key];
    if (typeof v === "number" && v > bestVal) {
      bestVal = v;
      best = key;
    }
  }
  return best;
}

/** Cosine similarity of regional stimulus vectors (0–1). */
export function stimulusProfileSimilarity(
  source: RegionalStimulusV1,
  candidate: RegionalStimulusV1,
): number {
  let dot = 0;
  let normSource = 0;
  let normCandidate = 0;
  for (const key of REGION_KEYS) {
    const sourceVal = source[key] ?? 0;
    const candidateVal = candidate[key] ?? 0;
    dot += sourceVal * candidateVal;
    normSource += sourceVal * sourceVal;
    normCandidate += candidateVal * candidateVal;
  }
  if (normSource <= 0 || normCandidate <= 0) return 0;
  return dot / (Math.sqrt(normSource) * Math.sqrt(normCandidate));
}

function resolveMovementIntentKey(exerciseId: string): string {
  const merged = mergeExerciseIntelligenceForId(exerciseId);
  const slices = [
    merged.chestClassification,
    merged.backClassification,
    merged.shouldersClassification,
    merged.bicepsClassification,
    merged.tricepsClassification,
    merged.quadsClassification,
    merged.hamstringsClassification,
    merged.glutesClassification,
    merged.calvesClassification,
    merged.coreClassification,
  ];
  for (const slice of slices) {
    if (slice?.primaryPattern) return slice.primaryPattern;
  }
  return merged.libraryItem?.movement ?? merged.meta.movement;
}

function movementIntentBonus(sourceExerciseId: string, candidateExerciseId: string): number {
  const sourceKey = resolveMovementIntentKey(sourceExerciseId);
  const candidateKey = resolveMovementIntentKey(candidateExerciseId);
  let bonus = 0;
  if (sourceKey === candidateKey) bonus += MOVEMENT_PATTERN_BONUS;
  const sourceMovement = mergeExerciseIntelligenceForId(sourceExerciseId).meta.movement;
  const candidateMovement = mergeExerciseIntelligenceForId(candidateExerciseId).meta.movement;
  if (sourceMovement === candidateMovement) bonus += LIBRARY_MOVEMENT_BONUS;
  return bonus;
}

function targetRegionBonus(
  candidateStimulus: RegionalStimulusV1,
  targetRegions: readonly (keyof RegionalStimulusV1)[] | undefined,
): number {
  if (!targetRegions || targetRegions.length === 0) return 0;
  let bonus = 0;
  for (const region of targetRegions) {
    const v = candidateStimulus[region];
    if (typeof v === "number" && v >= 0.1) bonus += TARGET_REGION_BONUS;
  }
  return bonus;
}

function jointStressPenalty(
  candidateExerciseId: string,
  constraints: RankExerciseSwapConstraints | undefined,
): number {
  if (!constraints?.avoidHighLumbarStress && !constraints?.avoidHighShoulderStress) return 0;
  const intelligence = getExerciseIntelligenceV1(candidateExerciseId);
  if (!intelligence) return 0;

  let penalty = 0;
  const lumbar = intelligence.jointStress.lumbarStress ?? 0;
  const shoulder = intelligence.jointStress.shoulderStress ?? 0;

  if (constraints.avoidHighLumbarStress && lumbar >= HIGH_JOINT_STRESS_THRESHOLD) {
    penalty += lumbar * LUMBAR_PENALTY_WEIGHT;
  }
  if (constraints.avoidHighShoulderStress && shoulder >= HIGH_JOINT_STRESS_THRESHOLD) {
    penalty += shoulder * SHOULDER_PENALTY_WEIGHT;
  }
  return penalty;
}

function buildExerciseSwapReasons(
  sourceExerciseId: string,
  candidateExerciseId: string,
): { reasonTags: ExerciseSwapReasonTag[]; reasonSummary: string | null } {
  const sourceIntelligence = getExerciseIntelligenceV1(sourceExerciseId);
  const candidateIntelligence = getExerciseIntelligenceV1(candidateExerciseId);
  if (!sourceIntelligence || !candidateIntelligence) {
    return { reasonTags: [], reasonSummary: null };
  }

  const tags: ExerciseSwapReasonTag[] = [];
  const similarity = stimulusProfileSimilarity(
    sourceIntelligence.stimulus,
    candidateIntelligence.stimulus,
  );
  const sourcePrimary = primaryStimulusRegion(sourceIntelligence.stimulus);
  const candidatePrimary = primaryStimulusRegion(candidateIntelligence.stimulus);

  if (similarity >= SIMILAR_STIMULUS_THRESHOLD && sourcePrimary != null) {
    tags.push(EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS);
  } else if (sourcePrimary != null && sourcePrimary === candidatePrimary) {
    tags.push(EXERCISE_SWAP_REASON_TAGS.SAME_TARGET_MUSCLE);
  }

  if (
    candidateIntelligence.stimulusToFatigueRatio >
    sourceIntelligence.stimulusToFatigueRatio + BETTER_SFR_MARGIN
  ) {
    tags.push(EXERCISE_SWAP_REASON_TAGS.BETTER_SFR);
  }

  const sourceLumbar = sourceIntelligence.jointStress.lumbarStress ?? 0;
  const candidateLumbar = candidateIntelligence.jointStress.lumbarStress ?? 0;
  if (
    candidateLumbar < sourceLumbar - 0.01 ||
    (similarity >= SIMILAR_STIMULUS_THRESHOLD && candidateLumbar < LOW_LUMBAR_STRESS_ABSOLUTE)
  ) {
    tags.push(EXERCISE_SWAP_REASON_TAGS.LOWER_LUMBAR_STRESS);
  }

  const sourceShoulder = sourceIntelligence.jointStress.shoulderStress ?? 0;
  const candidateShoulder = candidateIntelligence.jointStress.shoulderStress ?? 0;
  const shoulderStressRelevant = sourceShoulder >= 0.35;
  if (
    shoulderStressRelevant &&
    (candidateShoulder < sourceShoulder - 0.01 ||
      (similarity >= SIMILAR_STIMULUS_THRESHOLD && candidateShoulder < LOW_SHOULDER_STRESS_ABSOLUTE))
  ) {
    tags.push(EXERCISE_SWAP_REASON_TAGS.LOWER_SHOULDER_STRESS);
  }

  if (tags.length === 0) {
    return { reasonTags: [], reasonSummary: null };
  }

  const phrases: string[] = [];
  for (const tag of REASON_TAG_ORDER) {
    if (!tags.includes(tag)) continue;
    if (
      tag === EXERCISE_SWAP_REASON_TAGS.SAME_TARGET_MUSCLE &&
      tags.includes(EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS)
    ) {
      continue;
    }
    if (tag === EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS && sourcePrimary != null) {
      phrases.push(`Similar ${REGION_PHRASES[sourcePrimary]} stimulus`);
      continue;
    }
    if (tag === EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS) continue;
    phrases.push(REASON_PHRASES[tag]);
  }

  return { reasonTags: tags, reasonSummary: phrases.length > 0 ? phrases.join(" · ") : null };
}

function intelligenceScoreForCandidate(
  sourceExerciseId: string,
  candidateExerciseId: string,
  constraints: RankExerciseSwapConstraints | undefined,
): Omit<ExerciseSwapIntelligenceScoreBreakdown, "baseSwapScore" | "finalScore"> {
  const sourceIntelligence = getExerciseIntelligenceV1(sourceExerciseId);
  const candidateIntelligence = getExerciseIntelligenceV1(candidateExerciseId);

  if (!sourceIntelligence) {
    return {
      stimulusSimilarity: 0,
      primaryRegionBonus: 0,
      movementIntentBonus: 0,
      sfrBonus: 0,
      targetRegionBonus: 0,
      jointStressPenalty: 0,
      intelligenceScore: 0,
    };
  }

  const preferHigherSfr = constraints?.preferHigherSfr !== false;
  let stimulusSimilarityScore = 0;
  let primaryRegionBonusScore = 0;
  let sfrBonusScore = 0;
  let targetRegionBonusScore = 0;

  if (candidateIntelligence) {
    const similarity = stimulusProfileSimilarity(sourceIntelligence.stimulus, candidateIntelligence.stimulus);
    stimulusSimilarityScore = similarity * STIMULUS_SIMILARITY_WEIGHT;

    const sourcePrimary = primaryStimulusRegion(sourceIntelligence.stimulus);
    const candidatePrimary = primaryStimulusRegion(candidateIntelligence.stimulus);
    if (sourcePrimary != null && sourcePrimary === candidatePrimary) {
      primaryRegionBonusScore = PRIMARY_REGION_BONUS;
    }

    if (preferHigherSfr) {
      sfrBonusScore = candidateIntelligence.stimulusToFatigueRatio * SFR_BONUS_WEIGHT;
    }

    targetRegionBonusScore = targetRegionBonus(candidateIntelligence.stimulus, constraints?.targetRegions);
  }

  const movementIntentBonusScore = movementIntentBonus(sourceExerciseId, candidateExerciseId);
  const jointStressPenaltyScore = jointStressPenalty(candidateExerciseId, constraints);

  const intelligenceScore =
    stimulusSimilarityScore +
    primaryRegionBonusScore +
    movementIntentBonusScore +
    sfrBonusScore +
    targetRegionBonusScore -
    jointStressPenaltyScore;

  return {
    stimulusSimilarity: stimulusSimilarityScore,
    primaryRegionBonus: primaryRegionBonusScore,
    movementIntentBonus: movementIntentBonusScore,
    sfrBonus: sfrBonusScore,
    targetRegionBonus: targetRegionBonusScore,
    jointStressPenalty: jointStressPenaltyScore,
    intelligenceScore,
  };
}

/**
 * Rank swap candidates with an additive intelligence layer on top of legacy swap scores.
 * When the source exercise has no seeded intelligence, every candidate receives zero
 * intelligence adjustment and ordering follows base scores only.
 */
export function rankExerciseSwapByIntelligence(
  args: RankExerciseSwapByIntelligenceArgs,
): RankedExerciseSwapCandidate[] {
  const { sourceExerciseId, candidateExerciseIds, constraints, baseSwapScoresByExerciseId = {} } = args;
  const sourceHasIntelligence = getExerciseIntelligenceV1(sourceExerciseId) != null;

  const ranked = candidateExerciseIds.map((exerciseId) => {
    const baseSwapScore = baseSwapScoresByExerciseId[exerciseId] ?? 0;
    const partial = sourceHasIntelligence
      ? intelligenceScoreForCandidate(sourceExerciseId, exerciseId, constraints)
      : {
          stimulusSimilarity: 0,
          primaryRegionBonus: 0,
          movementIntentBonus: 0,
          sfrBonus: 0,
          targetRegionBonus: 0,
          jointStressPenalty: 0,
          intelligenceScore: 0,
        };

    const finalScore = baseSwapScore + partial.intelligenceScore;
    const reasons = sourceHasIntelligence
      ? buildExerciseSwapReasons(sourceExerciseId, exerciseId)
      : { reasonTags: [] as ExerciseSwapReasonTag[], reasonSummary: null };
    return {
      exerciseId,
      breakdown: {
        ...partial,
        baseSwapScore,
        finalScore,
      },
      reasonTags: reasons.reasonTags,
      reasonSummary: reasons.reasonSummary,
    };
  });

  return ranked.sort((a, b) => {
    if (b.breakdown.finalScore !== a.breakdown.finalScore) {
      return b.breakdown.finalScore - a.breakdown.finalScore;
    }
    return a.exerciseId.localeCompare(b.exerciseId);
  });
}

/** True when intelligence-aware swap ranking can run for this source exercise. */
export function canRankExerciseSwapByIntelligence(sourceExerciseId: string): boolean {
  return getExerciseIntelligenceV1(sourceExerciseId) != null;
}
