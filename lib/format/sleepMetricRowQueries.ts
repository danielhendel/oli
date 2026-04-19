import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import type { SleepOliMetricRowModel } from "@/lib/format/sleepOliMetricRows";

/** Deterministic rating label for a built row (null when no pill / no invented tier). */
export function getSleepMetricRating(row: SleepOliMetricRowModel): OuraRatingLabel | null {
  return row.pill?.label ?? null;
}

/** Normalized bar progress (0–1) or null when there is no numeric basis. */
export function getSleepMetricProgress(row: SleepOliMetricRowModel): number | null {
  return row.barProgress;
}
