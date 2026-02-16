/**
 * Canonical dayKey derivation using an IANA timezone.
 * Falls back to UTC if timezone is invalid or unavailable.
 */
export declare const ymdInTimeZoneFromIso: (iso: string, timeZone: string) => string;
/**
 * Returns YYYY-MM-DD in the user's local timezone.
 * NOTE: UI helper; canonical derivation should use ymdInTimeZoneFromIso.
 */
export declare const getTodayDayKey: () => string;
//# sourceMappingURL=dayKey.d.ts.map