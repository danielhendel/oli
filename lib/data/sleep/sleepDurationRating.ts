/** Duration-based sleep status for overview cards (not Oura score tiers). */
export type SleepDurationRatingLabel = "Optimal" | "Good" | "Fair" | "Low";

/** Target nightly duration for progress bars (8 hours). */
export const SLEEP_DURATION_BASELINE_TARGET_MINUTES = 8 * 60;

/**
 * Deterministic duration tiers for Sleep overview pills and baseline rows.
 * - >= 8h: Optimal
 * - >= 7h and < 8h: Good
 * - >= 6h and < 7h: Fair
 * - < 6h: Low
 */
export function sleepDurationRatingFromMinutes(minutes: number): SleepDurationRatingLabel {
  if (!Number.isFinite(minutes)) return "Low";
  if (minutes >= 8 * 60) return "Optimal";
  if (minutes >= 7 * 60) return "Good";
  if (minutes >= 6 * 60) return "Fair";
  return "Low";
}

export function sleepDurationRatingPillColors(label: SleepDurationRatingLabel): {
  color: string;
  backgroundColor: string;
} {
  switch (label) {
    case "Optimal":
      return { color: "#3D62CC", backgroundColor: "#F2F6FC" };
    case "Good":
      return { color: "#248A3D", backgroundColor: "#F0F8F4" };
    case "Fair":
      return { color: "#CC7700", backgroundColor: "#FFFAF4" };
    case "Low":
      return { color: "#D70015", backgroundColor: "#FDF5F5" };
    default: {
      const _x: never = label;
      return _x;
    }
  }
}

/** Progress fill vs {@link SLEEP_DURATION_BASELINE_TARGET_MINUTES}, clamped 0–1. */
export function sleepDurationProgressFill01(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.max(0, Math.min(1, minutes / SLEEP_DURATION_BASELINE_TARGET_MINUTES));
}
