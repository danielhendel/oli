/**
 * How the workout log screen should present itself.
 * - live: timed session in progress (default logger).
 * - backfill: post-hoc exercise detail from workout day detail (no live timer framing).
 */
export type WorkoutLogFlowMode = "live" | "backfill";

export function workoutLogFlowModeFromEnrichDayParam(enrichDay: unknown): WorkoutLogFlowMode {
  const d = typeof enrichDay === "string" ? enrichDay : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? "backfill" : "live";
}
