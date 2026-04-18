/**
 * Local calendar day key (YYYY-MM-DD) for instant `iso` in IANA `ianaTimeZone`.
 *
 * Used for:
 * - Apple Health `steps` (and other window payloads): canonical `day` = f(payload.start, payload.timezone)
 * - POST /ingest acknowledgement `day` for those same payloads
 *
 * Algorithm matches historical ingest + normalization: `Intl.DateTimeFormat("en-CA", { timeZone })`.
 * Returns `null` if `iso` is not parseable or `ianaTimeZone` is invalid (fail closed; no silent UTC fallback).
 */
export function localCalendarDayKeyFromIsoInTimeZone(iso: string, ianaTimeZone: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ianaTimeZone }).format(d);
  } catch {
    return null;
  }
}
