/**
 * UI adapter for weekly hypertrophy stimulus summary (derived only).
 * Pure — no React, no IO.
 */

import type { HypertrophyStimulusWeekSummary } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekSummary";
import type { RegionalStimulusV1 } from "@/lib/workouts/exercises/intelligence/exerciseIntelligenceV1Types";

export const WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE = "This Week's Muscle Stimulus" as const;

export const WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE =
  "Estimated training stimulus based on exercise selection and effort." as const;

export type WeeklyHypertrophyStimulusBand =
  | "Minimal"
  | "Low"
  | "Moderate"
  | "High"
  | "Very High";

export type WeeklyHypertrophyStimulusRegionRow = {
  label: string;
  band: WeeklyHypertrophyStimulusBand;
};

export type WeeklyHypertrophyStimulusCardModel = {
  title: typeof WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE;
  subtitle: typeof WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE;
  topRegions: readonly WeeklyHypertrophyStimulusRegionRow[];
  fatigueBand: WeeklyHypertrophyStimulusBand;
  recoveryBand: WeeklyHypertrophyStimulusBand;
  fallbackNote: string | null;
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

const TOP_REGION_LIMIT = 5;
const FALLBACK_NOTE_MIN_EXERCISES = 2;

export function formatRegionalStimulusBand(stimulus: number): WeeklyHypertrophyStimulusBand {
  if (!Number.isFinite(stimulus) || stimulus <= 0) return "Minimal";
  if (stimulus < 8) return "Low";
  if (stimulus < 20) return "Moderate";
  if (stimulus < 40) return "High";
  return "Very High";
}

export function formatWeeklyWorkloadBand(value: number): WeeklyHypertrophyStimulusBand {
  if (!Number.isFinite(value) || value <= 0) return "Minimal";
  if (value < 25) return "Low";
  if (value < 60) return "Moderate";
  if (value < 100) return "High";
  return "Very High";
}

function buildFallbackNote(
  fallbackExerciseCount: number,
  sessionCount: number,
  totalEstimatedStimulus: number,
): string | null {
  if (fallbackExerciseCount <= 0 || sessionCount <= 0) return null;
  if (totalEstimatedStimulus <= 0) {
    return "Stimulus estimates aren't available for these exercises yet.";
  }
  if (fallbackExerciseCount >= FALLBACK_NOTE_MIN_EXERCISES) {
    return "Some exercises aren't in the stimulus catalog yet.";
  }
  return null;
}

/**
 * Build a display-safe weekly Muscle Stimulus card model.
 * Returns null when there are no completed sessions, no working sets, or no usable stimulus.
 */
export function buildWeeklyHypertrophyStimulusCardModel(
  summary: HypertrophyStimulusWeekSummary,
): WeeklyHypertrophyStimulusCardModel | null {
  if (summary.sessionCount <= 0) return null;
  if (summary.totalEstimatedStimulus <= 0) return null;

  const topRegions = summary.topStimulusRegions.slice(0, TOP_REGION_LIMIT).map((row) => ({
    label: REGION_DISPLAY_LABELS[row.region],
    band: formatRegionalStimulusBand(row.stimulus),
  }));

  return {
    title: WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE,
    subtitle: WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE,
    topRegions,
    fatigueBand: formatWeeklyWorkloadBand(summary.estimatedFatigue),
    recoveryBand: formatWeeklyWorkloadBand(summary.recoveryDemand),
    fallbackNote: buildFallbackNote(
      summary.fallbackExerciseCount,
      summary.sessionCount,
      summary.totalEstimatedStimulus,
    ),
  };
}
