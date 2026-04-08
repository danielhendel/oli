import { getRawEvents } from "@/lib/api/usersMe";
import { stepsIdempotencyKey } from "@/lib/integrations/appleHealth";
import { addLocalCalendarDaysToDayKey } from "@/lib/integrations/appleHealth/healthKit";

/** Substring of {@link stepsIdempotencyKey} doc ids; server matches case-insensitively on id. */
const GAP_QUERY_KEYWORD = "applehealth:v2:steps:";
/** Must be ≤ {@link rawEventsListQuerySchema} `limit` max (100) or GET /raw-events returns 400. */
const GAP_FETCH_LIMIT = 100;

/**
 * Local calendar days in [today - (daysBack-1), today] inclusive (newest first in output order).
 */
export function enumerateRecentLocalDayKeysEndInclusive(todayYmd: string, daysBack: number): string[] {
  const n = Math.max(1, daysBack);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(addLocalCalendarDaysToDayKey(todayYmd, -i));
  }
  return out;
}

export type AppleHealthStepsRawGapProbe = {
  gaps: string[];
  /** False when the raw-events list call failed — callers must not treat `gaps: []` as “no missing days”. */
  probeReliable: boolean;
};

/**
 * Returns calendar day keys (YYYY-MM-DD) in the recent window that lack a rawEvents doc id
 * matching {@link stepsIdempotencyKey} for Apple Health daily steps (v2 scheme).
 *
 * Uses GET /users/me/raw-events with `kind=steps` and keyword filter on doc id prefix (server-side in-memory).
 */
export async function detectAppleHealthStepsRawGapsForRecentDays(
  idToken: string,
  todayYmd: string,
  daysBack: number,
): Promise<AppleHealthStepsRawGapProbe> {
  const candidates = enumerateRecentLocalDayKeysEndInclusive(todayYmd, daysBack);
  const oldest = candidates[candidates.length - 1] ?? todayYmd;
  /** Pad ±1 local day so UTC `observedAt` for local-midnight bounds stays inside the Firestore range filter. */
  const rangeStart = addLocalCalendarDaysToDayKey(oldest, -1);
  const rangeEnd = addLocalCalendarDaysToDayKey(todayYmd, 1);

  const res = await getRawEvents(idToken, {
    kind: "steps",
    q: GAP_QUERY_KEYWORD,
    start: rangeStart,
    end: rangeEnd,
    limit: GAP_FETCH_LIMIT,
    cacheBust: `stepsGap:${todayYmd}:${daysBack}`,
  });
  if (!res.ok) {
    return { gaps: [], probeReliable: false };
  }

  const have = new Set(res.json.items.map((it) => it.id));
  const gaps: string[] = [];
  for (const day of candidates) {
    if (day > todayYmd) continue;
    const expected = stepsIdempotencyKey(day);
    if (!have.has(expected)) gaps.push(day);
  }
  return { gaps, probeReliable: true };
}
