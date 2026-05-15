import type { ReadinessViewDto, SleepViewDto } from "@oli/contracts";

function normalizeDayKey(dayKey: string): string {
  return typeof dayKey === "string" ? dayKey.trim() : dayKey;
}

/**
 * True when an Oura vendor view DTO is for the **exact** calendar day requested.
 * Reject last-resort / fallback rows where `resolvedDay` differs from the screen day.
 */
export function isOuraViewAlignedToDay(
  view:
    | Pick<SleepViewDto, "requestedDay" | "resolvedDay">
    | Pick<ReadinessViewDto, "requestedDay" | "resolvedDay">
    | undefined,
  day: string,
): boolean {
  if (!view) return false;
  const anchor = normalizeDayKey(day);
  return normalizeDayKey(view.resolvedDay) === anchor && normalizeDayKey(view.requestedDay) === anchor;
}
