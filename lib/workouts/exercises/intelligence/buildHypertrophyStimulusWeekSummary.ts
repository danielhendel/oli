/**
 * Weekly hypertrophy stimulus summary from completed session sets.
 * Pure derived model — does not replace volume analytics or logging.
 */

import {
  buildHypertrophyStimulusSessionSummary,
  type HypertrophyStimulusRegionTotal,
  type HypertrophyStimulusSessionSetInput,
} from "./buildHypertrophyStimulusSessionSummary";
import type { RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";

export type HypertrophyStimulusWeekSessionInput = {
  sessionId: string;
  completedAt: string;
  sets: readonly HypertrophyStimulusSessionSetInput[];
};

export type BuildHypertrophyStimulusWeekSummaryInput = {
  weekStart: string;
  sessions: readonly HypertrophyStimulusWeekSessionInput[];
};

export type HypertrophyStimulusWeekSummary = {
  weekStart: string;
  totalEstimatedStimulus: number;
  stimulusByRegion: RegionalStimulusV1;
  topStimulusRegions: HypertrophyStimulusRegionTotal[];
  estimatedFatigue: number;
  recoveryDemand: number;
  fallbackExerciseCount: number;
  sessionCount: number;
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

function hasWorkingSets(sets: readonly HypertrophyStimulusSessionSetInput[]): boolean {
  for (const set of sets) {
    if (set.isWarmup === true) continue;
    const exerciseId = set.exerciseId.trim();
    if (exerciseId.length === 0) continue;
    if (!Number.isFinite(set.reps) || set.reps <= 0) continue;
    return true;
  }
  return false;
}

/**
 * Aggregate hypertrophy stimulus across completed sessions in a calendar week.
 * Warmup sets are ignored per session. Unseeded exercises contribute zero stimulus.
 */
export function buildHypertrophyStimulusWeekSummary(
  input: BuildHypertrophyStimulusWeekSummaryInput,
): HypertrophyStimulusWeekSummary {
  const stimulusByRegion: RegionalStimulusV1 = {};
  let estimatedFatigue = 0;
  let recoveryDemand = 0;
  const fallbackExerciseIds = new Set<string>();
  let sessionCount = 0;

  const sortedSessions = [...input.sessions].sort((a, b) => {
    const byCompletedAt = a.completedAt.localeCompare(b.completedAt);
    if (byCompletedAt !== 0) return byCompletedAt;
    return a.sessionId.localeCompare(b.sessionId);
  });

  for (const session of sortedSessions) {
    if (!hasWorkingSets(session.sets)) continue;

    const summary = buildHypertrophyStimulusSessionSummary({
      sessionId: session.sessionId,
      sets: session.sets,
    });

    sessionCount += 1;
    mergeRegionalStimulus(stimulusByRegion, summary.stimulusByRegion);
    estimatedFatigue += summary.estimatedFatigue;
    recoveryDemand += summary.recoveryDemand;

    for (const exerciseId of summary.exercisesWithFallback) {
      fallbackExerciseIds.add(exerciseId);
    }
  }

  return {
    weekStart: input.weekStart,
    totalEstimatedStimulus: sumRegionalStimulus(stimulusByRegion),
    stimulusByRegion,
    topStimulusRegions: buildTopStimulusRegions(stimulusByRegion),
    estimatedFatigue,
    recoveryDemand,
    fallbackExerciseCount: fallbackExerciseIds.size,
    sessionCount,
  };
}
