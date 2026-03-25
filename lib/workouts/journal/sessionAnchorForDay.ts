import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves an ISO timestamp for the journal "session started" event when backfilling
 * exercises for a calendar day (e.g. from Apple Health day detail). Prefers an Apple
 * session time when it falls on `enrichDay` in the device timezone; otherwise uses
 * local noon on that day so `ymdInTimeZoneFromIso` matches `enrichDay`.
 */
export function resolveSessionStartedAtIsoForDay(
  enrichDay: string,
  preferredIso?: string,
): string {
  if (!DAY_KEY_RE.test(enrichDay)) {
    return new Date().toISOString();
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const trimmed = preferredIso?.trim() ?? "";
  if (trimmed.length > 0) {
    const t = Date.parse(trimmed);
    if (!Number.isNaN(t)) {
      const iso = new Date(t).toISOString();
      if (ymdInTimeZoneFromIso(iso, tz) === enrichDay) {
        return iso;
      }
    }
  }
  const parts = enrichDay.split("-").map((x) => parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    d === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d)
  ) {
    return new Date().toISOString();
  }
  return new Date(y, mo - 1, d, 12, 0, 0, 0).toISOString();
}
