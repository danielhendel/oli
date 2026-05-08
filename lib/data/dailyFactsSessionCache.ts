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

/**
 * Notification target for {@link invalidateDailyFactsSessionCache}.
 * Receives the (userUid, day) tuple so consumers (e.g. {@link useDailyFacts})
 * can refetch only when their own (uid, day) matches.
 */
export type DailyFactsInvalidationListener = (input: { userUid: string; day: string }) => void;

const invalidationListeners = new Set<DailyFactsInvalidationListener>();

/**
 * Subscribe to {@link invalidateDailyFactsSessionCache} events. Returns an unsubscribe.
 *
 * Used by {@link useDailyFacts} so that after Apple Health steps backfill / body
 * sync lands the rawEvent → canonical → dailyFacts recompute, the persisted
 * `dailyFacts` doc is refetched without waiting for screen refocus.
 */
export function subscribeDailyFactsInvalidations(cb: DailyFactsInvalidationListener): () => void {
  invalidationListeners.add(cb);
  return () => {
    invalidationListeners.delete(cb);
  };
}

/** Best-effort invalidation after upstream sync updates today's truth. */
export function invalidateDailyFactsSessionCache(input: { userUid: string; day: string }): void {
  const key = buildKey(input.userUid, input.day);
  settled.delete(key);
  inflight.delete(key);
  for (const cb of invalidationListeners) {
    try {
      cb(input);
    } catch {
      // Listeners are best-effort; never let a faulty subscriber block invalidation.
    }
  }
}

/**
 * Default backend recompute settle delay: ingest UPDATEs the rawEvent, which fires
 * `onRawEventUpdatedForNormalization` → canonical write → `recomputeDerivedTruthForDay`.
 * The Cloud Function chain typically lands well under this budget; the buffer is
 * intentionally larger than the median to avoid refetching while the new
 * `dailyFacts/{day}` doc is still in flight.
 */
export const DAILY_FACTS_INVALIDATION_DEFAULT_DELAY_MS = 2500;

/**
 * Defers cache invalidation + listener notification by `delayMs` (default
 * {@link DAILY_FACTS_INVALIDATION_DEFAULT_DELAY_MS}). Used after a successful
 * Apple Health steps ingest for `day` so subscribers refetch *after* the backend
 * recompute lands rather than racing it.
 *
 * `schedule` is injectable for tests (defaults to `setTimeout`).
 *
 * Returns a cancel function; calling it before the timer fires prevents the
 * scheduled invalidation.
 */
export function scheduleDailyFactsInvalidationAfterIngest(input: {
  userUid: string;
  day: string;
  delayMs?: number;
  schedule?: (cb: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}): () => void {
  const delay = Math.max(0, input.delayMs ?? DAILY_FACTS_INVALIDATION_DEFAULT_DELAY_MS);
  const sched = input.schedule ?? ((cb, ms) => setTimeout(cb, ms));
  const cancel = input.cancel ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let cancelled = false;
  const handle = sched(() => {
    if (cancelled) return;
    invalidateDailyFactsSessionCache({ userUid: input.userUid, day: input.day });
  }, delay);
  return () => {
    cancelled = true;
    cancel(handle);
  };
}

/** Test-only: clears all subscribers between tests. Avoid using outside tests. */
export function __testing_resetDailyFactsInvalidationListeners(): void {
  invalidationListeners.clear();
}

/**
 * Test-only: clears the settled and inflight session cache so adjacent tests don't
 * leak cached responses across runs. Avoid using outside tests.
 */
export function __testing_resetDailyFactsSessionCache(): void {
  settled.clear();
  inflight.clear();
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
