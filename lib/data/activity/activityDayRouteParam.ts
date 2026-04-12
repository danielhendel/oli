const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize Expo Router search params for `activity/day/[day]` (`string | string[] | undefined`).
 */
export function normalizeActivityDayRouteParam(raw: unknown): { ok: true; day: string } | { ok: false } {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "string" || !DAY_KEY_RE.test(first)) {
    return { ok: false };
  }
  return { ok: true, day: first };
}
