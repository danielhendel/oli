/**
 * Strength Today card — metrics-first detail view model.
 *
 * Composes the existing `StrengthTodayCardModel` (hero / pill / muscle-volume block) with the
 * shared Daily Energy DTO so the Strength Today card can mirror the Sleep Today layout: large
 * left-aligned workout-name hero followed by an ordered list of typed metric rows
 * (Duration → Total Volume → Estimated Calorie Burn → Avg heart rate).
 *
 * Pure + presentation-only:
 * - No React, no Firebase, no I/O.
 * - All inputs come from selectors / hooks already in use elsewhere — this VM never
 *   re-computes calories or HR. It only formats existing canonical values.
 *
 * Canonical sources reused (no parallel paths):
 * - `formatWorkoutDurationLabel` → duration (already on the existing `cardModel.durationLabel`).
 * - `sumWorkoutDetailTotalVolumeSets` → total set count for the picked session
 *   (broader than `countedNonWarmupSets` — every logged set, matching the day-detail screen).
 * - `formatFactorDisplayAdditive(energy.factors.strength)` → strength burn range, identical
 *   to what `DailyEnergyCard` renders for the "Strength" row on the same day.
 * - {@link resolveStrengthTodayAverageHeartRateBpm} → session-level physiology from hydrated
 *   workouts first, then `energy.energyInfluencers.strength.averageHeartRateBpm` (DailyFacts).
 *
 * Missing-data policy: never invent a value. Calories / Avg HR render as `MISSING_VALUE` ("—")
 * whenever the underlying canonical field is `undefined`/`null` (including loading / error /
 * unauthenticated states surfaced through `energy === undefined`).
 */

import type { DayKey } from "@/lib/ui/calendar/types";
import type {
  DailyEnergyCardDto,
  DailyEnergyFactorDto,
} from "@/lib/data/dash/useDailyEnergyCard";
import type {
  WorkoutDetailMuscleExerciseSetCountRow,
  WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { sumWorkoutDetailTotalVolumeSets } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import type { StrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import { formatFactorDisplayAdditive } from "@/lib/ui/energy/energyPresentation";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  buildWorkoutHypertrophyStimulusCardModel,
  mapManualWorkoutExercisesToHypertrophyStimulusSets,
  type WorkoutHypertrophyStimulusCardModel,
} from "@/lib/ui/workouts/buildWorkoutHypertrophyStimulusCardModel";
import {
  hasStrengthTodayHrDetailToInspect,
  resolveStrengthTodayAverageHeartRateBpm,
} from "@/lib/data/workouts/resolveStrengthTodayAverageHeartRateBpm";

/** Glyph used for any unavailable metric value. Never replaced by computed estimates. */
export const STRENGTH_TODAY_DETAIL_MISSING_VALUE = "\u2014" as const;

/** Ordered metric-row identifiers. Order is part of the contract — must match VM `rows` order. */
export type StrengthTodayDetailMetricRowId =
  | "duration"
  | "totalVolume"
  | "estimatedCalorieBurn"
  | "avgHeartRate";

/** Stable, design-approved labels — exported so the card / tests don't duplicate the literal. */
export const STRENGTH_TODAY_DETAIL_METRIC_LABELS: Record<
  StrengthTodayDetailMetricRowId,
  string
> = {
  duration: "Duration",
  totalVolume: "Total Volume",
  estimatedCalorieBurn: "Estimated Calorie Burn",
  avgHeartRate: "Avg heart rate",
};

export type StrengthTodayDetailMetricRow = {
  id: StrengthTodayDetailMetricRowId;
  label: string;
  /** Rendered value. `STRENGTH_TODAY_DETAIL_MISSING_VALUE` when source is missing. */
  value: string;
  /**
   * When `true`, the row opens a detail modal (chevron + full-row press). Only the Avg heart
   * rate row is tappable today; this is intentional and enforced by builder output.
   */
  tappable?: true;
};

/**
 * Volume-by-muscle-group section — pass-through of the existing `cardModel.workingVolume`
 * shape (RPE 7–10 by primary muscle + per-exercise drill-down). Kept structurally identical so
 * the existing `StrengthTodayWorkingVolumeRows` block keeps rendering and routing unchanged.
 */
export type StrengthTodayDetailMuscleVolumeSection = {
  rows: readonly WorkoutDetailMuscleSetCountRow[];
  exercisesByMuscleGroup: Partial<
    Record<MuscleGroup, readonly WorkoutDetailMuscleExerciseSetCountRow[]>
  >;
};

export type StrengthTodayDetailVm =
  | {
      status: "rest";
      pill: "Rest";
      hero: "No workout today";
      subtitleLine: "Log a session when you train";
    }
  | {
      status: "completed";
      pill: "Completed";
      /** Large left-aligned workout name (e.g. "Pull Day"). Mirrors Sleep Today hero. */
      hero: string;
      /**
       * Muted contextual line under the hero (e.g. "17 sets · Back focused"). `null` when no
       * focus / set summary can be derived; the card then renders no subtitle line.
       */
      subtitleLine: string | null;
      /**
       * Ordered metric rows. Order is **part of the contract** and asserted by tests:
       *   1. duration
       *   2. totalVolume
       *   3. estimatedCalorieBurn
       *   4. avgHeartRate (tappable: true)
       */
      rows: readonly [
        StrengthTodayDetailMetricRow,
        StrengthTodayDetailMetricRow,
        StrengthTodayDetailMetricRow,
        StrengthTodayDetailMetricRow,
      ];
      /** Mirrors the existing card's working-volume block; `null` when not eligible. */
      muscleVolume: StrengthTodayDetailMuscleVolumeSection | null;
      /**
       * Day the Avg HR row maps to — passed verbatim into the HR detail modal route params so
       * the modal can re-read the same `DailyEnergyCardDto.energyInfluencers.strength`.
       */
      energyDay: DayKey;
      /** Derived hypertrophy stimulus card; null when no working sets qualify. */
      muscleStimulus: WorkoutHypertrophyStimulusCardModel | null;
    };

/** Format an integer set count as "{n} sets" (`"1 set"` for 1). */
function formatTotalSetsValue(setCount: number): string {
  if (!Number.isFinite(setCount) || setCount <= 0) return STRENGTH_TODAY_DETAIL_MISSING_VALUE;
  const rounded = Math.floor(setCount);
  return `${rounded} set${rounded === 1 ? "" : "s"}`;
}

/** Format an avg HR value (bpm). `STRENGTH_TODAY_DETAIL_MISSING_VALUE` when missing/invalid. */
export function formatStrengthTodayAvgHeartRateValue(
  averageHeartRateBpm: number | undefined | null,
): string {
  if (
    typeof averageHeartRateBpm !== "number" ||
    !Number.isFinite(averageHeartRateBpm) ||
    averageHeartRateBpm <= 0
  ) {
    return STRENGTH_TODAY_DETAIL_MISSING_VALUE;
  }
  return `${Math.round(averageHeartRateBpm)} bpm`;
}

/** Format strength calorie burn via the **same** formatter Daily Energy uses (no parallel calc). */
export function formatStrengthTodayCalorieBurnValue(
  factor: DailyEnergyFactorDto | undefined,
): string {
  const display = formatFactorDisplayAdditive(factor);
  return display ?? STRENGTH_TODAY_DETAIL_MISSING_VALUE;
}

export type BuildStrengthTodayDetailVmInput = {
  todayDayKey: DayKey;
  /** Output of `buildStrengthTodayCardModel` for the same day (hero / pill / muscle-volume). */
  cardModel: StrengthTodayCardModel | null;
  /**
   * Display exercises for the picked strength session — same list returned by
   * `resolveStrengthSessionExerciseDisplay(journal, actionWorkout).exercises`. Sourced upstream
   * so this VM stays pure. Used solely to compute `totalVolume`.
   */
  actionWorkoutExercises: readonly ManualWorkoutExerciseSummary[];
  /** Journal session id for today's completed workout, when available. */
  sessionId?: string | null;
  /** Hydrated daily energy DTO for `todayDayKey`. `undefined` while loading / on error / signed-out. */
  energy: DailyEnergyCardDto | undefined;
  /**
   * All strength sessions reconciled for `todayDayKey` (same list as the Today card hero).
   * Used for session-level avg HR before DailyFacts recompute lands.
   */
  todayStrengthSessions?: readonly ReconciledWorkoutSession[];
};

/**
 * Build the Strength Today detail VM.
 *
 * - `rest` branch: VM mirrors `cardModel`'s rest copy exactly (no metric rows).
 * - `completed` branch: emits the **exact 4-row** metric list in the approved order. Rows whose
 *   underlying canonical field is missing render as `"—"` — never as estimates or defaults.
 */
export function buildStrengthTodayDetailVm(
  input: BuildStrengthTodayDetailVmInput,
): StrengthTodayDetailVm {
  const { todayDayKey, cardModel, actionWorkoutExercises, sessionId, energy, todayStrengthSessions = [] } =
    input;

  if (cardModel == null || cardModel.kind === "rest") {
    return {
      status: "rest",
      pill: "Rest",
      hero: "No workout today",
      subtitleLine: "Log a session when you train",
    };
  }

  const totalSetCount = sumWorkoutDetailTotalVolumeSets(actionWorkoutExercises);
  const strengthFactor = energy?.factors.strength;
  const strengthInfluencer = energy?.energyInfluencers?.strength;
  const subtitleLine = cardModel.subtitle.trim();

  const resolvedAvgHeartRateBpm = resolveStrengthTodayAverageHeartRateBpm({
    todayStrengthSessions,
    dailyFactsAverageHeartRateBpm: strengthInfluencer?.averageHeartRateBpm,
  });
  const avgHrTappable = hasStrengthTodayHrDetailToInspect({
    todayStrengthSessions,
    dailyFactsAverageHeartRateBpm: strengthInfluencer?.averageHeartRateBpm,
    dailyFactsHeartRateZoneMinutes: strengthInfluencer?.heartRateZoneMinutes,
  });

  const rows: readonly [
    StrengthTodayDetailMetricRow,
    StrengthTodayDetailMetricRow,
    StrengthTodayDetailMetricRow,
    StrengthTodayDetailMetricRow,
  ] = [
    {
      id: "duration",
      label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.duration,
      value:
        cardModel.durationLabel.trim().length > 0
          ? cardModel.durationLabel
          : STRENGTH_TODAY_DETAIL_MISSING_VALUE,
    },
    {
      id: "totalVolume",
      label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.totalVolume,
      value: formatTotalSetsValue(totalSetCount),
    },
    {
      id: "estimatedCalorieBurn",
      label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.estimatedCalorieBurn,
      value: formatStrengthTodayCalorieBurnValue(strengthFactor),
    },
    {
      id: "avgHeartRate",
      label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
      value: formatStrengthTodayAvgHeartRateValue(resolvedAvgHeartRateBpm),
      ...(avgHrTappable ? { tappable: true as const } : {}),
    },
  ];

  const muscleStimulus = buildWorkoutHypertrophyStimulusCardModel({
    sessionId: sessionId?.trim() || `${todayDayKey}-strength`,
    sets: mapManualWorkoutExercisesToHypertrophyStimulusSets(actionWorkoutExercises),
  });

  return {
    status: "completed",
    pill: "Completed",
    hero: cardModel.primaryTitle,
    subtitleLine: subtitleLine.length > 0 ? subtitleLine : null,
    rows,
    muscleVolume: cardModel.workingVolume
      ? {
          rows: cardModel.workingVolume.rows,
          exercisesByMuscleGroup: cardModel.workingVolume.exercisesByMuscleGroup,
        }
      : null,
    energyDay: todayDayKey,
    muscleStimulus,
  };
}
