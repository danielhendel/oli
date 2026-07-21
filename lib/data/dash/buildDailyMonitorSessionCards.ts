/**
 * Pure Workout + Cardio Monitor models from current-day calendar sessions.
 * Strength sessions → Workout; cardio-classified sessions → Cardio.
 * Rest days are absent (no empty rest cards on Daily Monitor).
 */

import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  buildStrengthTodayCardModel,
  pickLatestStrengthSessionToday,
} from "@/lib/data/workouts/strengthTodayCardModel";
import { buildCardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import { mapWorkoutAverageIntensityToLabel } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import {
  formatStrengthTodayAvgHeartRateValue,
  formatStrengthTodayCalorieBurnValue,
  STRENGTH_TODAY_DETAIL_MISSING_VALUE,
} from "@/lib/data/workouts/strengthTodayDetailVm";
import { resolveStrengthTodayAverageHeartRateBpm } from "@/lib/data/workouts/resolveStrengthTodayAverageHeartRateBpm";
import { computeStrengthMetricsFromExercises } from "@/lib/workouts/journal/manualWorkoutSummary";
import { kgToLbs } from "@/lib/metrics/metricUnits";
import { trainingVolumeKgForManualExercises } from "@/lib/workouts/strength/strengthVolumeKg";

const UNAVAILABLE = "Unavailable" as const;

export type DailyMonitorWorkoutMetricRow = {
  key: "duration" | "total_volume" | "estimated_calorie_burn" | "average_heart_rate";
  label: string;
  valueLabel: string;
  isAvailable: boolean;
};

export type DailyMonitorWorkoutCardModel = {
  day: DayKey;
  sessionCount: number;
  /** Strength or existing session title for a single session. */
  primaryTitle: string;
  intensityLabel: string | null;
  intensityAccessibilityLabel: string | null;
  rows: readonly DailyMonitorWorkoutMetricRow[];
  accessibilityLabel: string;
};

export type DailyMonitorCardioCardModel = {
  day: DayKey;
  sessionCount: number;
  primaryTitle: string;
  primaryLine: string;
  metaLine: string;
  accessibilityLabel: string;
};

function missingDashToUnavailable(value: string): { valueLabel: string; isAvailable: boolean } {
  if (value === STRENGTH_TODAY_DETAIL_MISSING_VALUE || value.trim().length === 0) {
    return { valueLabel: UNAVAILABLE, isAvailable: false };
  }
  return { valueLabel: value, isAvailable: true };
}

function formatVolumeKg(volumeKg: number | null | undefined, massUnit: "lb" | "kg"): string | null {
  if (typeof volumeKg !== "number" || !Number.isFinite(volumeKg) || volumeKg <= 0) return null;
  if (massUnit === "kg") {
    return `${Math.round(volumeKg).toLocaleString("en-US")} kg`;
  }
  return `${Math.round(kgToLbs(volumeKg)).toLocaleString("en-US")} lb`;
}

export function buildDailyMonitorWorkoutCardModel(input: {
  requestedDay: DayKey;
  calendarDays: readonly WorkoutCalendarDayLike[];
  overridesByWorkoutId?: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId?: Record<string, string | undefined>;
  /** Shared Daily Energy DTO for the same day (calories / influencer HR). */
  energy?: DailyEnergyCardDto | null;
  /** Preferred mass unit for Total Volume. Defaults to lb (repo Strength UI default). */
  massUnit?: "lb" | "kg";
}): DailyMonitorWorkoutCardModel | null {
  const strengthDays = mapWorkoutCalendarDaysForDomain(input.calendarDays, "strength");
  const todayModel = buildStrengthTodayCardModel({
    strengthCalendarDays: strengthDays,
    todayDayKey: input.requestedDay,
    overridesByWorkoutId: input.overridesByWorkoutId ?? {},
    durableTitlesByWorkoutId: input.durableTitlesByWorkoutId ?? {},
  });
  if (todayModel.kind !== "completed") return null;

  const dayRow = strengthDays.find((d) => d.day === input.requestedDay);
  const sessions = dayRow
    ? collectStrengthOverviewTabSessions([{ day: input.requestedDay, workouts: dayRow.workouts }])
    : [];
  const sessionCount = Math.max(1, sessions.length);
  const primaryTitle =
    sessionCount > 1
      ? `${sessionCount} workouts`
      : todayModel.primaryTitle.trim().length > 0
        ? todayModel.primaryTitle
        : "Strength";

  const latest = pickLatestStrengthSessionToday(sessions);
  const actionWorkout = latest?.workouts[0];
  const ingestExercises = actionWorkout?.strengthIngestExercises ?? [];
  const metricsFromIngest =
    ingestExercises.length > 0 ? computeStrengthMetricsFromExercises(ingestExercises) : null;
  const volumeKg =
    (typeof actionWorkout?.strengthVolumeKg === "number" &&
    Number.isFinite(actionWorkout.strengthVolumeKg) &&
    actionWorkout.strengthVolumeKg > 0
      ? actionWorkout.strengthVolumeKg
      : null) ??
    (ingestExercises.length > 0 ? trainingVolumeKgForManualExercises(ingestExercises) : null) ??
    metricsFromIngest?.totalVolume ??
    null;
  const volumeLabel = formatVolumeKg(volumeKg, input.massUnit ?? "lb");

  const calorieRaw = formatStrengthTodayCalorieBurnValue(input.energy?.factors.strength);
  const calorie = missingDashToUnavailable(calorieRaw);

  const avgHrBpm = resolveStrengthTodayAverageHeartRateBpm({
    todayStrengthSessions: sessions,
    dailyFactsAverageHeartRateBpm: input.energy?.energyInfluencers?.strength?.averageHeartRateBpm,
  });
  const hrRaw = formatStrengthTodayAvgHeartRateValue(avgHrBpm);
  const hr = missingDashToUnavailable(hrRaw);

  const intensity = mapWorkoutAverageIntensityToLabel(metricsFromIngest?.avgIntensity ?? null);

  const durationAvailable =
    todayModel.durationLabel.trim().length > 0 && todayModel.durationLabel !== "—";

  const rows: DailyMonitorWorkoutMetricRow[] = [
    {
      key: "duration",
      label: "Duration",
      valueLabel: durationAvailable ? todayModel.durationLabel : UNAVAILABLE,
      isAvailable: durationAvailable,
    },
    {
      key: "total_volume",
      label: "Total Volume",
      valueLabel: volumeLabel ?? UNAVAILABLE,
      isAvailable: volumeLabel != null,
    },
    {
      key: "estimated_calorie_burn",
      label: "Estimated Calorie Burn",
      valueLabel: calorie.valueLabel,
      isAvailable: calorie.isAvailable,
    },
    {
      key: "average_heart_rate",
      label: "Average Heart Rate",
      valueLabel: hr.valueLabel,
      isAvailable: hr.isAvailable,
    },
  ];

  const intensityPart =
    intensity != null ? ` ${intensity.accessibilityLabel}` : "";
  return {
    day: input.requestedDay,
    sessionCount,
    primaryTitle,
    intensityLabel: intensity?.label ?? null,
    intensityAccessibilityLabel: intensity?.accessibilityLabel ?? null,
    rows,
    accessibilityLabel: `Workout. ${primaryTitle}.${intensityPart} Opens Workouts.`.trim(),
  };
}

export function buildDailyMonitorCardioCardModel(input: {
  requestedDay: DayKey;
  calendarDays: readonly WorkoutCalendarDayLike[];
  overridesByWorkoutId?: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId?: Record<string, string | undefined>;
}): DailyMonitorCardioCardModel | null {
  const cardioDays = mapWorkoutCalendarDaysForDomain(input.calendarDays, "cardio");
  const todayModel = buildCardioTodayCardModel({
    cardioCalendarDays: cardioDays,
    todayDayKey: input.requestedDay,
    overridesByWorkoutId: input.overridesByWorkoutId ?? {},
    durableTitlesByWorkoutId: input.durableTitlesByWorkoutId ?? {},
  });
  if (todayModel.kind !== "completed" || todayModel.sessions.length === 0) return null;

  const sessionCount = todayModel.sessions.length;
  const first = todayModel.sessions[0]!;
  const modalityFromMeta = first.metaLine.includes(" · ")
    ? first.metaLine.split(" · ")[0]!.trim()
    : first.metaLine.trim();
  const primaryTitle =
    sessionCount > 1
      ? `${sessionCount} cardio sessions`
      : modalityFromMeta.length > 0
        ? modalityFromMeta
        : "Cardio";
  const primaryLine = first.primaryLine === "—" ? UNAVAILABLE : first.primaryLine;
  const metaLine = first.metaLine === "—" ? "" : first.metaLine;

  return {
    day: input.requestedDay,
    sessionCount,
    primaryTitle,
    primaryLine,
    metaLine,
    accessibilityLabel: `Cardio. ${primaryTitle}. ${primaryLine}. ${metaLine}`.trim(),
  };
}

export function resolveWorkoutMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  model: DailyMonitorWorkoutCardModel | null;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) return "refresh_error_with_cached_day_evidence";
  if (input.model == null) return "absent_no_day_evidence";
  const anyUnavailable = input.model.rows.some((r) => !r.isAvailable);
  return anyUnavailable ? "present_partial" : "present_complete";
}

export function resolveCardioMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  model: DailyMonitorCardioCardModel | null;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) return "refresh_error_with_cached_day_evidence";
  if (input.model == null) return "absent_no_day_evidence";
  return "present_complete";
}
