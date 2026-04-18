const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse `YYYY-MM-DD` from Expo Router's normalized pathname for this screen
 * (e.g. `/activity/day/2026-04-14`). Prefer this over raw search params when they can lag or shallow-merge
 * behind the visible stack location.
 */
export function activityDayKeyFromActivityDayPathname(pathname: string | undefined): string | null {
  if (typeof pathname !== "string" || pathname.length === 0) return null;
  const trimmed = pathname.replace(/\/+$/, "");
  const m = trimmed.match(/\/activity\/day\/(\d{4}-\d{2}-\d{2})$/);
  const day = m?.[1];
  return day != null && DAY_KEY_RE.test(day) ? day : null;
}

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
