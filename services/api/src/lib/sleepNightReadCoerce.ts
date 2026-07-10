import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

import { isValidDayKey, repairWakeDayFromAnchorSkew } from "./oura/resolveSleepNightWakeDay";

/** YYYY-MM-DD from ISO start (UTC slice). */
function toYmdUtc(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Repair legacy / partial `sleepNights` payloads before Zod parse so GET /sleep-night can resolve.
 *
 * Pure / deterministic / idempotent: copies `flat`, never mutates the caller's object.
 * Does not invent wake days from invalid anchors; does not move wake earlier than UTC(end).
 * No schemaVersion/logicVersion fields exist on SleepNight today — eligibility is structural
 * (valid day keys + endedAt). Remove this skew repair after a bounded reprocess backfills
 * wakeDay on write for all active users.
 */
export function coerceRawSleepNightForRead(flat: Record<string, unknown>, docId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...flat };

  const anchorFromFlat = typeof out.anchorDay === "string" ? out.anchorDay.trim() : "";
  out.anchorDay = isValidDayKey(anchorFromFlat) ? anchorFromFlat : docId;

  const main = out.mainSleepMinutes;
  const total = out.totalSleepMinutes;
  const durationMinutes =
    typeof main === "number" && Number.isFinite(main) && main > 0
      ? main
      : typeof total === "number" && Number.isFinite(total) && total > 0
        ? total
        : null;

  let endedRaw = typeof out.endedAt === "string" ? out.endedAt.trim() : "";
  const startedRaw = typeof out.startedAt === "string" ? out.startedAt.trim() : "";
  /** Legacy rows sometimes omit `endedAt`; infer from Oura window semantics so exact-anchor beats D−1 wake_day. */
  if (!endedRaw && startedRaw && durationMinutes != null) {
    const startMs = Date.parse(startedRaw);
    if (!Number.isNaN(startMs)) {
      endedRaw = new Date(startMs + durationMinutes * 60_000).toISOString();
      out.endedAt = endedRaw;
    }
  }

  const endedOk = endedRaw.length > 0 && !Number.isNaN(Date.parse(endedRaw));
  const utcEndDay = endedOk
    ? localCalendarDayKeyFromIsoInTimeZone(endedRaw, "UTC") ?? toYmdUtc(endedRaw)
    : null;

  const wakeRaw = typeof out.wakeDay === "string" ? out.wakeDay.trim() : null;
  const wakeInitial = isValidDayKey(wakeRaw) ? wakeRaw : null;
  const anchorFinal = typeof out.anchorDay === "string" ? out.anchorDay.trim() : null;

  const repaired = repairWakeDayFromAnchorSkew({
    wakeDay: wakeInitial ?? utcEndDay,
    anchorDay: isValidDayKey(anchorFinal) ? anchorFinal : null,
    utcEndDay,
  });
  if (repaired != null) {
    out.wakeDay = repaired;
  }

  const hasDuration =
    (typeof main === "number" && Number.isFinite(main) && main > 0) ||
    (typeof total === "number" && Number.isFinite(total) && total > 0);
  const wakeFinal = typeof out.wakeDay === "string" ? out.wakeDay.trim() : "";
  const wakeOk = isValidDayKey(wakeFinal);
  const derivedComplete = Boolean(out.anchorDay && hasDuration && endedOk && wakeOk);

  if (typeof out.isComplete !== "boolean") {
    out.isComplete = derivedComplete;
  } else if (out.isComplete === false && derivedComplete) {
    out.isComplete = true;
  }

  return out;
}
