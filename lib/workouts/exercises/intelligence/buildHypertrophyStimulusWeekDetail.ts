/**
 * Weekly hypertrophy stimulus drill-down model.
 * Pure derived model — does not replace volume analytics or logging.
 */

import { resolveExerciseDisplayName } from "@/lib/workouts/exercises/displayName";
import {
  formatRegionalStimulusBand,
  type WeeklyHypertrophyStimulusBand,
} from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import {
  calculateHypertrophyStimulus,
  type HypertrophyStimulusSetInput,
  type HypertrophyStimulusSource,
} from "./calculateHypertrophyStimulus";
import {
  buildHypertrophyStimulusWeekSummary,
  type HypertrophyStimulusWeekSessionInput,
} from "./buildHypertrophyStimulusWeekSummary";
import type { RegionalStimulusV1 } from "./exerciseIntelligenceV1Types";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type HypertrophyStimulusWeekDetailSessionInput = HypertrophyStimulusWeekSessionInput;

export type BuildHypertrophyStimulusWeekDetailInput = {
  weekStart: string;
  sessions: readonly HypertrophyStimulusWeekDetailSessionInput[];
  customExerciseNameById?: ReadonlyMap<string, string>;
};

export type HypertrophyStimulusWeekDetailExerciseRow = {
  exerciseId: string;
  exerciseName: string;
  estimatedStimulus: number;
  setCount: number;
  source: HypertrophyStimulusSource;
};

export type HypertrophyStimulusWeekDetailRegionRow = {
  region: string;
  label: string;
  estimatedStimulus: number;
  band: WeeklyHypertrophyStimulusBand;
  percentOfWeekStimulus: number;
  topExercises: HypertrophyStimulusWeekDetailExerciseRow[];
};

export type HypertrophyStimulusWeekDetailFallbackExerciseRow = {
  exerciseId: string;
  exerciseName: string;
  setCount: number;
};

export type HypertrophyStimulusWeekDetail = {
  weekStart: string;
  weekEnd: string;
  totalEstimatedStimulus: number;
  estimatedFatigue: number;
  recoveryDemand: number;
  regions: HypertrophyStimulusWeekDetailRegionRow[];
  fallbackExercises: HypertrophyStimulusWeekDetailFallbackExerciseRow[];
  sessionCount: number;
  workingSetCount: number;
};

const REGION_DISPLAY_LABELS: Record<keyof RegionalStimulusV1, string> = {
  upperChest: "Upper chest",
  midChest: "Chest",
  lowerChest: "Lower chest",
  lats: "Lats",
  upperBack: "Upper back",
  frontDelts: "Front delts",
  sideDelts: "Side delts",
  rearDelts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  forearms: "Forearms",
  tibialis: "Tibialis",
};

const TOP_EXERCISES_PER_REGION = 5;

function createEmptyDetail(weekStart: string): HypertrophyStimulusWeekDetail {
  const weekEnd = addCalendarDaysToDayKey(weekStart as DayKey, 6);
  return {
    weekStart,
    weekEnd,
    totalEstimatedStimulus: 0,
    estimatedFatigue: 0,
    recoveryDemand: 0,
    regions: [],
    fallbackExercises: [],
    sessionCount: 0,
    workingSetCount: 0,
  };
}

function countWorkingSet(set: HypertrophyStimulusWeekDetailSessionInput["sets"][number]): boolean {
  if (set.isWarmup === true) return false;
  const exerciseId = set.exerciseId.trim();
  if (exerciseId.length === 0) return false;
  return Number.isFinite(set.reps) && set.reps > 0;
}

function toSetInput(
  set: HypertrophyStimulusWeekDetailSessionInput["sets"][number],
): HypertrophyStimulusSetInput | null {
  if (!countWorkingSet(set)) return null;
  const row: HypertrophyStimulusSetInput = { reps: set.reps };
  if (set.loadKg !== undefined) row.loadKg = set.loadKg;
  if (set.rpe !== undefined) row.rpe = set.rpe;
  return row;
}

function roundPercentOfWeek(regionStimulus: number, totalStimulus: number): number {
  if (!Number.isFinite(regionStimulus) || regionStimulus <= 0) return 0;
  if (!Number.isFinite(totalStimulus) || totalStimulus <= 0) return 0;
  return Math.round((regionStimulus / totalStimulus) * 100);
}

/**
 * Build a weekly hypertrophy stimulus drill-down model with per-region exercise attribution.
 * Warmup sets are ignored. Fallback exercises contribute zero stimulus.
 */
export function buildHypertrophyStimulusWeekDetail(
  input: BuildHypertrophyStimulusWeekDetailInput,
): HypertrophyStimulusWeekDetail {
  const weekEnd = addCalendarDaysToDayKey(input.weekStart as DayKey, 6);
  const weekSummary = buildHypertrophyStimulusWeekSummary({
    weekStart: input.weekStart,
    sessions: input.sessions,
  });

  if (weekSummary.sessionCount <= 0) {
    return createEmptyDetail(input.weekStart);
  }

  const exerciseSets = new Map<string, HypertrophyStimulusSetInput[]>();
  const exerciseSetCounts = new Map<string, number>();
  let workingSetCount = 0;

  for (const session of input.sessions) {
    for (const set of session.sets) {
      if (!countWorkingSet(set)) continue;
      const exerciseId = set.exerciseId.trim();
      const setInput = toSetInput(set);
      if (setInput == null) continue;

      workingSetCount += 1;
      exerciseSetCounts.set(exerciseId, (exerciseSetCounts.get(exerciseId) ?? 0) + 1);
      const bucket = exerciseSets.get(exerciseId) ?? [];
      bucket.push(setInput);
      exerciseSets.set(exerciseId, bucket);
    }
  }

  if (workingSetCount <= 0) {
    return createEmptyDetail(input.weekStart);
  }

  const regionExerciseStimulus = new Map<
    keyof RegionalStimulusV1,
    Map<string, { estimatedStimulus: number; source: HypertrophyStimulusSource }>
  >();
  const fallbackExercises: HypertrophyStimulusWeekDetailFallbackExerciseRow[] = [];

  for (const exerciseId of [...exerciseSets.keys()].sort((a, b) => a.localeCompare(b))) {
    const result = calculateHypertrophyStimulus({
      exerciseId,
      sets: exerciseSets.get(exerciseId) ?? [],
    });
    const exerciseName = resolveExerciseDisplayName(exerciseId, input.customExerciseNameById);
    const setCount = exerciseSetCounts.get(exerciseId) ?? 0;

    if (result.source === "fallback") {
      fallbackExercises.push({ exerciseId, exerciseName, setCount });
      continue;
    }

    for (const [region, stimulus] of Object.entries(result.stimulusByRegion) as [
      keyof RegionalStimulusV1,
      number | undefined,
    ][]) {
      if (typeof stimulus !== "number" || !Number.isFinite(stimulus) || stimulus <= 0) continue;
      const regionMap = regionExerciseStimulus.get(region) ?? new Map();
      const existing = regionMap.get(exerciseId);
      regionMap.set(exerciseId, {
        estimatedStimulus: (existing?.estimatedStimulus ?? 0) + stimulus,
        source: result.source,
      });
      regionExerciseStimulus.set(region, regionMap);
    }
  }

  fallbackExercises.sort((a, b) => {
    const byName = a.exerciseName.localeCompare(b.exerciseName);
    if (byName !== 0) return byName;
    return a.exerciseId.localeCompare(b.exerciseId);
  });

  const regions = weekSummary.topStimulusRegions
    .map((row) => {
      const exerciseRows = [...(regionExerciseStimulus.get(row.region)?.entries() ?? [])]
        .map(([exerciseId, value]) => ({
          exerciseId,
          exerciseName: resolveExerciseDisplayName(exerciseId, input.customExerciseNameById),
          estimatedStimulus: value.estimatedStimulus,
          setCount: exerciseSetCounts.get(exerciseId) ?? 0,
          source: value.source,
        }))
        .sort((a, b) => {
          if (b.estimatedStimulus !== a.estimatedStimulus) {
            return b.estimatedStimulus - a.estimatedStimulus;
          }
          const byName = a.exerciseName.localeCompare(b.exerciseName);
          if (byName !== 0) return byName;
          return a.exerciseId.localeCompare(b.exerciseId);
        })
        .slice(0, TOP_EXERCISES_PER_REGION);

      return {
        region: row.region,
        label: REGION_DISPLAY_LABELS[row.region],
        estimatedStimulus: row.stimulus,
        band: formatRegionalStimulusBand(row.stimulus),
        percentOfWeekStimulus: roundPercentOfWeek(row.stimulus, weekSummary.totalEstimatedStimulus),
        topExercises: exerciseRows,
      };
    })
    .sort((a, b) => {
      if (b.estimatedStimulus !== a.estimatedStimulus) return b.estimatedStimulus - a.estimatedStimulus;
      return a.label.localeCompare(b.label);
    });

  return {
    weekStart: input.weekStart,
    weekEnd,
    totalEstimatedStimulus: weekSummary.totalEstimatedStimulus,
    estimatedFatigue: weekSummary.estimatedFatigue,
    recoveryDemand: weekSummary.recoveryDemand,
    regions,
    fallbackExercises,
    sessionCount: weekSummary.sessionCount,
    workingSetCount,
  };
}
