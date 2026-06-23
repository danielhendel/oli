/**
 * Pure hypertrophy stimulus estimation from logged sets + ExerciseIntelligenceV1 overlay.
 * Does not replace training volume analytics — additive derived metrics only.
 */

import { getExerciseIntelligenceV1 } from "./exerciseIntelligenceV1Registry";
import type { RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";

export type HypertrophyStimulusSource = "hypertrophy_intelligence_v1" | "fallback";

export type HypertrophyStimulusSetInput = {
  reps: number;
  loadKg?: number | null;
  rpe?: number | null;
};

export type CalculateHypertrophyStimulusInput = {
  exerciseId: string;
  sets: readonly HypertrophyStimulusSetInput[];
};

export type HypertrophyStimulusResult = {
  /** Accumulated regional stimulus units across included sets. */
  stimulusByRegion: RegionalStimulusV1;
  estimatedFatigue: number;
  recoveryDemand: number;
  source: HypertrophyStimulusSource;
};

const EMPTY_FALLBACK: HypertrophyStimulusResult = {
  stimulusByRegion: {},
  estimatedFatigue: 0,
  recoveryDemand: 0,
  source: "fallback",
};

/**
 * RPE proximity factor for effective reps (v1 discrete buckets).
 * Missing/invalid RPE → 1 (no discount).
 */
export function rpeFactorForHypertrophyStimulus(rpe: number | null | undefined): number {
  if (rpe == null || !Number.isFinite(rpe)) return 1;
  if (rpe >= 10) return 1;
  if (rpe >= 9) return 0.95;
  if (rpe >= 8) return 0.9;
  if (rpe >= 7) return 0.8;
  return 0.65;
}

function isValidSetReps(reps: number): boolean {
  return Number.isFinite(reps) && reps > 0;
}

/**
 * Estimate hypertrophy stimulus per muscle region from logged sets.
 * Uses bundled intelligence when seeded; otherwise returns a safe zero fallback.
 *
 * Formula v1 (per set):
 * - effectiveReps = reps × rpeFactor
 * - setStimulus[region] = effectiveReps × intelligence.stimulus[region]
 * - setFatigue = effectiveReps × intelligence.fatigue
 * - setRecovery = setFatigue × intelligence.recoveryDemand
 *
 * `loadKg` is accepted for forward compatibility but not used in v1.
 */
export function calculateHypertrophyStimulus(
  input: CalculateHypertrophyStimulusInput,
): HypertrophyStimulusResult {
  const intelligence = getExerciseIntelligenceV1(input.exerciseId);
  if (intelligence == null) return { ...EMPTY_FALLBACK };

  const stimulusByRegion: RegionalStimulusV1 = {};
  let estimatedFatigue = 0;
  let recoveryDemand = 0;

  for (const set of input.sets) {
    if (!isValidSetReps(set.reps)) continue;

    const effectiveReps = set.reps * rpeFactorForHypertrophyStimulus(set.rpe);

    for (const [region, weight] of Object.entries(intelligence.stimulus) as [
      keyof RegionalStimulusV1,
      number | undefined,
    ][]) {
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
      const setStimulus = effectiveReps * weight;
      stimulusByRegion[region] = (stimulusByRegion[region] ?? 0) + setStimulus;
    }

    const setFatigue = effectiveReps * intelligence.fatigue;
    estimatedFatigue += setFatigue;
    recoveryDemand += setFatigue * intelligence.recoveryDemand;
  }

  return {
    stimulusByRegion,
    estimatedFatigue,
    recoveryDemand,
    source: "hypertrophy_intelligence_v1",
  };
}
