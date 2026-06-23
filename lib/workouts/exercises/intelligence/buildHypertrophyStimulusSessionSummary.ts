/**
 * Session-level hypertrophy stimulus summary from completed workout sets.
 * Pure derived model — does not replace volume analytics or logging.
 */

import {
  calculateHypertrophyStimulus,
  type HypertrophyStimulusSetInput,
  type HypertrophyStimulusSource,
} from "./calculateHypertrophyStimulus";
import type { RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";

export type HypertrophyStimulusSessionSetInput = {
  exerciseId: string;
  reps: number;
  loadKg?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
};

export type BuildHypertrophyStimulusSessionSummaryInput = {
  sessionId: string;
  sets: readonly HypertrophyStimulusSessionSetInput[];
};

export type HypertrophyStimulusRegionTotal = {
  region: keyof RegionalStimulusV1;
  stimulus: number;
};

export type HypertrophyStimulusSessionSourceCounts = Record<HypertrophyStimulusSource, number>;

export type HypertrophyStimulusSessionSummary = {
  sessionId: string;
  totalEstimatedStimulus: number;
  stimulusByRegion: RegionalStimulusV1;
  estimatedFatigue: number;
  recoveryDemand: number;
  topStimulusRegions: HypertrophyStimulusRegionTotal[];
  exercisesWithFallback: string[];
  sourceCounts: HypertrophyStimulusSessionSourceCounts;
};

const TOP_STIMULUS_REGION_LIMIT = 10;

function sumRegionalStimulus(stimulusByRegion: RegionalStimulusV1): number {
  let total = 0;
  for (const value of Object.values(stimulusByRegion)) {
    if (typeof value === "number" && Number.isFinite(value)) total += value;
  }
  return total;
}

function mergeRegionalStimulus(
  target: RegionalStimulusV1,
  addition: RegionalStimulusV1,
): void {
  for (const [region, value] of Object.entries(addition) as [
    keyof RegionalStimulusV1,
    number | undefined,
  ][]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    target[region] = (target[region] ?? 0) + value;
  }
}

function buildTopStimulusRegions(
  stimulusByRegion: RegionalStimulusV1,
): HypertrophyStimulusRegionTotal[] {
  const rows = (Object.entries(stimulusByRegion) as [keyof RegionalStimulusV1, number | undefined][])
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)
    .map(([region, stimulus]) => ({ region, stimulus: stimulus! }))
    .sort((a, b) => {
      if (b.stimulus !== a.stimulus) return b.stimulus - a.stimulus;
      return String(a.region).localeCompare(String(b.region));
    });

  return rows.slice(0, TOP_STIMULUS_REGION_LIMIT);
}

function groupWorkingSetsByExercise(
  sets: readonly HypertrophyStimulusSessionSetInput[],
): Map<string, HypertrophyStimulusSetInput[]> {
  const grouped = new Map<string, HypertrophyStimulusSetInput[]>();

  for (const set of sets) {
    if (set.isWarmup === true) continue;
    const exerciseId = set.exerciseId.trim();
    if (exerciseId.length === 0) continue;

    const bucket = grouped.get(exerciseId) ?? [];
    const setInput: HypertrophyStimulusSetInput = { reps: set.reps };
    if (set.loadKg !== undefined) setInput.loadKg = set.loadKg;
    if (set.rpe !== undefined) setInput.rpe = set.rpe;
    bucket.push(setInput);
    grouped.set(exerciseId, bucket);
  }

  return grouped;
}

/**
 * Aggregate hypertrophy stimulus, fatigue, and recovery for a completed session.
 * Warmup sets are ignored. Unseeded exercises contribute zero stimulus and are listed in
 * `exercisesWithFallback`.
 */
export function buildHypertrophyStimulusSessionSummary(
  input: BuildHypertrophyStimulusSessionSummaryInput,
): HypertrophyStimulusSessionSummary {
  const grouped = groupWorkingSetsByExercise(input.sets);
  const stimulusByRegion: RegionalStimulusV1 = {};
  let estimatedFatigue = 0;
  let recoveryDemand = 0;
  const exercisesWithFallback: string[] = [];
  const sourceCounts: HypertrophyStimulusSessionSourceCounts = {
    hypertrophy_intelligence_v1: 0,
    fallback: 0,
  };

  for (const exerciseId of [...grouped.keys()].sort((a, b) => a.localeCompare(b))) {
    const result = calculateHypertrophyStimulus({
      exerciseId,
      sets: grouped.get(exerciseId) ?? [],
    });

    sourceCounts[result.source] += 1;
    if (result.source === "fallback") {
      exercisesWithFallback.push(exerciseId);
      continue;
    }

    mergeRegionalStimulus(stimulusByRegion, result.stimulusByRegion);
    estimatedFatigue += result.estimatedFatigue;
    recoveryDemand += result.recoveryDemand;
  }

  return {
    sessionId: input.sessionId,
    totalEstimatedStimulus: sumRegionalStimulus(stimulusByRegion),
    stimulusByRegion,
    estimatedFatigue,
    recoveryDemand,
    topStimulusRegions: buildTopStimulusRegions(stimulusByRegion),
    exercisesWithFallback,
    sourceCounts,
  };
}
