// lib/time/dayKey.ts

/**
 * Canonical dayKey derivation using an IANA timezone.
 * Falls back to UTC if timezone is invalid or unavailable.
 */
export const ymdInTimeZoneFromIso = (iso: string, timeZone: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // defensive fallback: "today" UTC
    return toYmdUtc(new Date());
  }

  try {
    // Use Intl to format YYYY-MM-DD in the requested timezone
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d); // en-CA yields YYYY-MM-DD
  } catch {
    return toYmdUtc(d);
  }
};

const toYmdUtc = (date: Date): string => {
  const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Returns YYYY-MM-DD in the user's local timezone.
 * NOTE: UI helper; canonical derivation should use ymdInTimeZoneFromIso.
 */
export const getTodayDayKey = (): string => {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
