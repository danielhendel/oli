/**
 * Typed Daily Monitor presence contract (Phase 2C).
 * UI/read-model only — not persisted to RawEvent, CanonicalEvent, DailyFacts, or Firestore.
 */

export const DAILY_MONITOR_PRESENCE_STATUSES = [
  "loading_presence",
  "present_complete",
  "present_partial",
  "absent_no_day_evidence",
  "unavailable_source",
  "refresh_error_with_cached_day_evidence",
  "screen_level_error",
  "signed_out",
] as const;

export type DailyMonitorPresenceStatus = (typeof DAILY_MONITOR_PRESENCE_STATUSES)[number];

export type DailyMonitorDomainId =
  | "sleep"
  | "readiness"
  | "energy"
  | "nutrition"
  | "body_composition";

export type DailyMonitorSectionId =
  | "recovery"
  | "movement_output"
  | "intake_exposures"
  | "measurements";

/** Domains that occupy the main card stack. */
export function presenceCreatesMainStackCard(
  status: DailyMonitorPresenceStatus,
): boolean {
  return (
    status === "present_complete" ||
    status === "present_partial" ||
    status === "refresh_error_with_cached_day_evidence"
  );
}

export const DAILY_MONITOR_SECTION_ORDER: readonly DailyMonitorSectionId[] = [
  "recovery",
  "movement_output",
  "intake_exposures",
  "measurements",
] as const;

export const DAILY_MONITOR_SECTION_TITLES: Record<DailyMonitorSectionId, string> = {
  recovery: "Recovery",
  movement_output: "Movement & Output",
  intake_exposures: "Intake & Exposures",
  measurements: "Measurements",
};

/** Stable domain order within each section for Phase 2C. */
export const DAILY_MONITOR_DOMAIN_SECTION: Record<
  DailyMonitorDomainId,
  DailyMonitorSectionId
> = {
  sleep: "recovery",
  readiness: "recovery",
  energy: "movement_output",
  nutrition: "intake_exposures",
  body_composition: "measurements",
};

export const DAILY_MONITOR_DOMAIN_ORDER: readonly DailyMonitorDomainId[] = [
  "sleep",
  "readiness",
  "energy",
  "nutrition",
  "body_composition",
] as const;
