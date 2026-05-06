import { getDailyFacts, type TruthGetOptions } from "@/lib/api/usersMe";
import type { ApiResult } from "@/lib/api/http";
import type { DailyFactsDto } from "@/lib/contracts";

type CacheEntry = {
  value: ApiResult<DailyFactsDto>;
  cachedAtMs: number;
};

const CACHE_TTL_MS = 30_000;
const settled = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ApiResult<DailyFactsDto>>>();

function buildKey(userUid: string, day: string): string {
  return `${userUid}::${day}`;
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAtMs <= CACHE_TTL_MS;
}

/** Best-effort invalidation after upstream sync updates today's truth. */
export function invalidateDailyFactsSessionCache(input: { userUid: string; day: string }): void {
  const key = buildKey(input.userUid, input.day);
  settled.delete(key);
  inflight.delete(key);
}

export async function getDailyFactsSessionCached(input: {
  userUid: string;
  day: string;
  token: string;
  opts?: TruthGetOptions;
}): Promise<ApiResult<DailyFactsDto>> {
  const key = buildKey(input.userUid, input.day);
  const bypassCache = Boolean(input.opts?.cacheBust);

  if (!bypassCache) {
    const cached = settled.get(key);
    if (cached && isFresh(cached)) return cached.value;
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const req = getDailyFacts(input.day, input.token, input.opts).then((res) => {
    settled.set(key, { value: res, cachedAtMs: Date.now() });
    inflight.delete(key);
    return res;
  });
  inflight.set(key, req);
  return req;
}
