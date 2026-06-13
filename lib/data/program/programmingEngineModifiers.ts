// lib/data/program/programmingEngineModifiers.ts
/**
 * Training-type volume multipliers for the Programming Engine (step 2: "Apply training-type
 * multipliers"). Pure data + pure functions only.
 *
 * SCIENTIFIC INTENT / ASSUMPTION: the base volume tables are hypertrophy-oriented, so Hypertrophy
 * is the 1.0 reference. Strength/Powerlifting trade volume for intensity; Athletic Performance
 * prioritizes quality over accumulated fatigue (lowest volume); Conditioning keeps near-base set
 * counts at higher reps; General Fitness uses a reduced, sustainable dose.
 *
 * NOTE: a multiplier table was referenced in the spec but not included in the request payload.
 * These values are a documented, defensible default and the single source of truth — adjust here
 * if the canonical table differs. Multipliers are intentionally independent of training days, so
 * training days change distribution (frequency/split) and not total volume.
 */
import type { TrainingType } from "@/lib/data/program/workoutProgramDesignTypes";
import type { BaseVolumeTemplate } from "@/lib/data/program/programmingEngineBaseVolume";

export const TRAINING_TYPE_VOLUME_MULTIPLIER: Record<TrainingType, number> = {
  general_fitness: 0.8,
  hypertrophy: 1.0,
  strength: 0.85,
  powerlifting: 0.8,
  athletic_performance: 0.75,
  conditioning: 0.9,
};

/** Return the volume multiplier for a training type. */
export function getTrainingTypeVolumeMultiplier(type: TrainingType): number {
  return TRAINING_TYPE_VOLUME_MULTIPLIER[type];
}

/**
 * Scale a coarse base table by a multiplier, rounding each bucket to whole sets. Applied before
 * the canonical chest/back split so per-type totals stay deterministic and testable.
 */
export function applyVolumeMultiplierToBase(
  table: BaseVolumeTemplate,
  multiplier: number,
): BaseVolumeTemplate {
  const scaled = {} as BaseVolumeTemplate;
  for (const key of Object.keys(table) as (keyof BaseVolumeTemplate)[]) {
    scaled[key] = Math.round(table[key] * multiplier);
  }
  return scaled;
}
