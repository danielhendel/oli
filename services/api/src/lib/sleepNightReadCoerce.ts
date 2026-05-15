import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

/** YYYY-MM-DD from ISO start (UTC slice). */
function toYmdUtc(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Repair legacy / partial `sleepNights` payloads before Zod parse so GET /sleep-night can resolve.
 * - Ensures `anchorDay` matches doc id when absent or invalid.
 * - Derives `wakeDay` from `endedAt` when missing (same semantics as `buildSleepNightFromOuraSleepDocument`).
 * - Upgrades `isComplete` when duration + end + wake are present (score not required).
 */
export function coerceRawSleepNightForRead(flat: Record<string, unknown>, docId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...flat };

  const anchorFromFlat = typeof out.anchorDay === "string" ? out.anchorDay.trim() : "";
  out.anchorDay = /^\d{4}-\d{2}-\d{2}$/.test(anchorFromFlat) ? anchorFromFlat : docId;

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

  const endedOk = endedRaw.length > 0;

  let wake = typeof out.wakeDay === "string" ? out.wakeDay.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wake) && endedOk) {
    wake = localCalendarDayKeyFromIsoInTimeZone(endedRaw, "UTC") ?? toYmdUtc(endedRaw);
    out.wakeDay = wake;
  }

  const hasDuration =
    (typeof main === "number" && Number.isFinite(main) && main > 0) ||
    (typeof total === "number" && Number.isFinite(total) && total > 0);
  const wakeFinal = typeof out.wakeDay === "string" ? out.wakeDay.trim() : "";
  const wakeOk = /^\d{4}-\d{2}-\d{2}$/.test(wakeFinal);
  const derivedComplete = Boolean(out.anchorDay && hasDuration && endedOk && wakeOk);

  if (typeof out.isComplete !== "boolean") {
    out.isComplete = derivedComplete;
  } else if (out.isComplete === false && derivedComplete) {
    out.isComplete = true;
  }

  return out;
}
