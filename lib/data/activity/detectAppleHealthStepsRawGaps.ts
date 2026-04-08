import { getRawEvents } from "@/lib/api/usersMe";
import { stepsIdempotencyKey } from "@/lib/integrations/appleHealth";
import { addLocalCalendarDaysToDayKey } from "@/lib/integrations/appleHealth/healthKit";

const GAP_QUERY_KEYWORD = "applehealth:v2:steps:";
const GAP_FETCH_LIMIT = 200;

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
): Promise<string[]> {
  const res = await getRawEvents(idToken, {
    kind: "steps",
    q: GAP_QUERY_KEYWORD,
    limit: GAP_FETCH_LIMIT,
    cacheBust: `stepsGap:${todayYmd}:${daysBack}`,
  });
  if (!res.ok) return [];

  const have = new Set(res.json.items.map((it) => it.id));
  const candidates = enumerateRecentLocalDayKeysEndInclusive(todayYmd, daysBack);
  const gaps: string[] = [];
  for (const day of candidates) {
    if (day > todayYmd) continue;
    const expected = stepsIdempotencyKey(day);
    if (!have.has(expected)) gaps.push(day);
  }
  return gaps;
}
