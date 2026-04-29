import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";

export function strengthSessionDurationMinutes(session: ReconciledWorkoutSession): number | null {
  if (
    typeof session.durationMinutes === "number" &&
    Number.isFinite(session.durationMinutes) &&
    session.durationMinutes > 0
  ) {
    return session.durationMinutes;
  }
  let maxDuration: number | null = null;
  for (const workout of session.workouts) {
    if (
      typeof workout.durationMinutes === "number" &&
      Number.isFinite(workout.durationMinutes) &&
      workout.durationMinutes > 0
    ) {
      maxDuration = maxDuration == null ? workout.durationMinutes : Math.max(maxDuration, workout.durationMinutes);
    }
  }
  return maxDuration;
}

export function formatStrengthWeeklyWorkoutsAndMinutes(input: {
  averageWorkoutsPerWeek?: number | null;
  averageMinutesPerWeek?: number | null;
}): string {
  const workouts =
    typeof input.averageWorkoutsPerWeek === "number" && Number.isFinite(input.averageWorkoutsPerWeek)
      ? `${input.averageWorkoutsPerWeek.toFixed(1)} wo`
      : null;
  const minutes =
    typeof input.averageMinutesPerWeek === "number" &&
    Number.isFinite(input.averageMinutesPerWeek) &&
    input.averageMinutesPerWeek > 0
      ? `${Math.round(input.averageMinutesPerWeek)} min/wk`
      : null;
  if (workouts && minutes) return `${workouts} · ${minutes}`;
  if (workouts) return `${workouts}/wk`;
  if (minutes) return minutes;
  return "—";
}
