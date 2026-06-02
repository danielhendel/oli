/**
 * Strength Today — resolve Avg heart rate from the best available physiology source.
 *
 * Priority (first match wins):
 * 1. Duration-weighted avg across today's hydrated strength session workouts
 *    (`WorkoutHistoryItem.averageHeartRateBpm` parsed from raw/canonical payload).
 * 2. `dailyFacts.energyInfluencers.strength.averageHeartRateBpm` (server aggregate).
 * 3. Absent → callers render "—".
 *
 * Mirrors `aggregateDailyFacts.ts` strength HR weighting: Σ(bpm × durationMinutes) / Σ(minutes).
 * Read-only; never invents values.
 */

import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import { pickSessionHeartRateZoneMinutes } from "@/lib/data/workouts/pickSessionHeartRateZoneMinutes";
import { validateHeartRateZoneMinutesTuple } from "@/lib/data/workouts/heartRateZonePresentation";

export function isValidAverageHeartRateBpm(bpm: unknown): bpm is number {
  return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0;
}

/**
 * Duration-weighted average HR across all workouts in the given sessions.
 * Returns `null` when no workout contributes a positive duration + avg HR pair.
 */
export function computeDurationWeightedAverageHeartRateBpmFromSessions(
  sessions: readonly ReconciledWorkoutSession[],
): number | null {
  let weightedSum = 0;
  let weightedMinutes = 0;
  for (const session of sessions) {
    for (const w of session.workouts) {
      if (!isValidAverageHeartRateBpm(w.averageHeartRateBpm)) continue;
      const mins =
        typeof w.durationMinutes === "number" && Number.isFinite(w.durationMinutes) && w.durationMinutes > 0
          ? w.durationMinutes
          : 0;
      if (mins <= 0) continue;
      weightedSum += w.averageHeartRateBpm * mins;
      weightedMinutes += mins;
    }
  }
  if (weightedMinutes <= 0) return null;
  return weightedSum / weightedMinutes;
}

export function resolveStrengthTodayAverageHeartRateBpm(input: {
  todayStrengthSessions: readonly ReconciledWorkoutSession[];
  dailyFactsAverageHeartRateBpm?: number | null | undefined;
}): number | null {
  const fromSessions = computeDurationWeightedAverageHeartRateBpmFromSessions(
    input.todayStrengthSessions,
  );
  if (fromSessions != null) return fromSessions;
  if (isValidAverageHeartRateBpm(input.dailyFactsAverageHeartRateBpm)) {
    return input.dailyFactsAverageHeartRateBpm;
  }
  return null;
}

/** True when the Strength HR detail modal has avg HR and/or zones to show. */
export function hasStrengthTodayHrDetailToInspect(input: {
  todayStrengthSessions: readonly ReconciledWorkoutSession[];
  dailyFactsAverageHeartRateBpm?: number | null | undefined;
  dailyFactsHeartRateZoneMinutes?: readonly number[] | null | undefined;
}): boolean {
  if (
    resolveStrengthTodayAverageHeartRateBpm({
      todayStrengthSessions: input.todayStrengthSessions,
      dailyFactsAverageHeartRateBpm: input.dailyFactsAverageHeartRateBpm,
    }) != null
  ) {
    return true;
  }
  if (validateHeartRateZoneMinutesTuple(input.dailyFactsHeartRateZoneMinutes ?? null) != null) {
    return true;
  }
  for (const s of input.todayStrengthSessions) {
    if (pickSessionHeartRateZoneMinutes(s) != null) return true;
  }
  return false;
}

/** Session-only avg HR for modal route-param fallback (daily aggregate read separately in modal). */
export function pickSessionOnlyAverageHeartRateBpmFallback(
  sessions: readonly ReconciledWorkoutSession[],
): number | null {
  return computeDurationWeightedAverageHeartRateBpmFromSessions(sessions);
}
