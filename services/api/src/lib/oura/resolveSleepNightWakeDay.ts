/**
 * Pure wake-day resolution for SleepNight write path.
 *
 * Contract (repository truth for Oura long_sleep):
 * - `providerDay` = Oura `day` when it is a valid YYYY-MM-DD (user-local sleep belonging day).
 * - `utcEndDay` = calendar day of `endedAt` in UTC.
 * - Prefer the later of the two when both are valid: Oura day after UTC end repairs
 *   east-of-UTC morning skew; UTC end after Oura day repairs bed-day rollup vs morning wake.
 * - Invalid / missing provider day → UTC end only.
 * - Lexical `>=` is safe only after both values pass YYYY-MM-DD validation.
 */

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_KEY.test(value.trim());
}

export function normalizeProviderDay(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return DAY_KEY.test(t) ? t : null;
}

/**
 * @param utcEndDay - already-validated YYYY-MM-DD from UTC(endedAt), or null if unavailable
 * @param providerDay - validated Oura day or null
 */
export function resolveSleepNightWakeDay(args: {
  utcEndDay: string | null;
  providerDay: string | null;
}): string | null {
  const utc = args.utcEndDay != null && isValidDayKey(args.utcEndDay) ? args.utcEndDay.trim() : null;
  const provider =
    args.providerDay != null && isValidDayKey(args.providerDay) ? args.providerDay.trim() : null;

  if (provider != null && utc != null) {
    return provider >= utc ? provider : utc;
  }
  if (provider != null) return provider;
  if (utc != null) return utc;
  return null;
}

/**
 * Read-path compatibility: when stored Oura rollup `anchorDay` is after UTC(endedAt),
 * treat anchor as the wake morning (same skew class as write-path provider ≥ utc).
 * Does not move wake earlier; does not invent days from invalid anchors.
 */
export function repairWakeDayFromAnchorSkew(args: {
  wakeDay: string | null;
  anchorDay: string | null;
  utcEndDay: string | null;
}): string | null {
  const wake = args.wakeDay != null && isValidDayKey(args.wakeDay) ? args.wakeDay.trim() : null;
  const anchor = args.anchorDay != null && isValidDayKey(args.anchorDay) ? args.anchorDay.trim() : null;
  const utc = args.utcEndDay != null && isValidDayKey(args.utcEndDay) ? args.utcEndDay.trim() : null;

  if (anchor != null && utc != null && anchor > utc) {
    return anchor;
  }
  return wake ?? utc;
}
