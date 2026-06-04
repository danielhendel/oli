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
/** Bumped on invalidation / cacheBust so late in-flight responses cannot repopulate stale cells. */
const generationByKey = new Map<string, number>();

function buildKey(userUid: string, day: string): string {
  return `${userUid}::${day}`;
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAtMs <= CACHE_TTL_MS;
}

function bumpGeneration(key: string): number {
  const next = (generationByKey.get(key) ?? 0) + 1;
  generationByKey.set(key, next);
  return next;
}

export type DailyFactsCacheLogAction =
  | "hit"
  | "miss"
  | "invalidated"
  | "network"
  | "stale-write-ignored";

function logDailyFactsCache(input: {
  day: string;
  cacheBust?: string;
  action: DailyFactsCacheLogAction;
}): void {
  if (!__DEV__) return;
  if (process.env.JEST_WORKER_ID) return;
  // eslint-disable-next-line no-console
  console.log(
    "[DAILY_FACTS_CACHE]",
    JSON.stringify({
      day: input.day,
      cacheBust: input.cacheBust ?? null,
      action: input.action,
    }),
  );
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

function dropCacheEntry(key: string, day: string, cacheBust?: string): void {
  settled.delete(key);
  inflight.delete(key);
  bumpGeneration(key);
  logDailyFactsCache({
    day,
    ...(cacheBust ? { cacheBust } : {}),
    action: "invalidated",
  });
}

/** Best-effort invalidation after upstream sync updates today's truth. */
export function invalidateDailyFactsSessionCache(input: {
  userUid: string;
  day: string;
  /** When false, clears cache only (no subscriber refetch). Default true. */
  notify?: boolean;
}): void {
  const key = buildKey(input.userUid, input.day);
  dropCacheEntry(key, input.day);
  if (input.notify === false) return;
  for (const cb of invalidationListeners) {
    try {
      cb(input);
    } catch {
      // Listeners are best-effort; never let a faulty subscriber block invalidation.
    }
  }
}

/** Drop session-cache entries for many days (e.g. Weekly Fitness week refetch). */
export function invalidateDailyFactsSessionCacheForDays(input: {
  userUid: string;
  days: readonly string[];
  /** When false, clears cache only (no subscriber refetch). Default true. */
  notify?: boolean;
}): void {
  for (const day of input.days) {
    invalidateDailyFactsSessionCache({
      userUid: input.userUid,
      day,
      ...(input.notify === undefined ? {} : { notify: input.notify }),
    });
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
  generationByKey.clear();
}

function commitSettled(key: string, day: string, writeGen: number, res: ApiResult<DailyFactsDto>): void {
  if (generationByKey.get(key) !== writeGen) {
    logDailyFactsCache({ day, action: "stale-write-ignored" });
    return;
  }
  settled.set(key, { value: res, cachedAtMs: Date.now() });
}

/**
 * Always performs GET /users/me/daily-facts (never reads session settled).
 * Use for Weekly Fitness week rollups that must not reuse stale session cells.
 */
export async function getDailyFactsNetworkFresh(input: {
  userUid: string;
  day: string;
  token: string;
  cacheBust: string;
}): Promise<ApiResult<DailyFactsDto>> {
  const key = buildKey(input.userUid, input.day);
  dropCacheEntry(key, input.day, input.cacheBust);
  const writeGen = generationByKey.get(key) ?? 0;
  logDailyFactsCache({ day: input.day, cacheBust: input.cacheBust, action: "network" });
  const res = await getDailyFacts(input.day, input.token, { cacheBust: input.cacheBust });
  commitSettled(key, input.day, writeGen, res);
  return res;
}

export async function getDailyFactsSessionCached(input: {
  userUid: string;
  day: string;
  token: string;
  opts?: TruthGetOptions;
}): Promise<ApiResult<DailyFactsDto>> {
  const key = buildKey(input.userUid, input.day);
  const cacheBust = input.opts?.cacheBust;
  const bypassCache = Boolean(cacheBust);

  if (bypassCache) {
    dropCacheEntry(key, input.day, cacheBust);
    const writeGen = generationByKey.get(key) ?? 0;
    logDailyFactsCache({
      day: input.day,
      ...(cacheBust ? { cacheBust } : {}),
      action: "network",
    });
    const req = getDailyFacts(input.day, input.token, input.opts).then((res) => {
      inflight.delete(key);
      commitSettled(key, input.day, writeGen, res);
      return res;
    });
    inflight.set(key, req);
    return req;
  }

  const cached = settled.get(key);
  if (cached && isFresh(cached)) {
    logDailyFactsCache({ day: input.day, action: "hit" });
    return cached.value;
  }

  const pending = inflight.get(key);
  if (pending) {
    logDailyFactsCache({ day: input.day, action: "miss" });
    return pending;
  }

  logDailyFactsCache({ day: input.day, action: "miss" });
  const writeGen = generationByKey.get(key) ?? 0;
  logDailyFactsCache({ day: input.day, action: "network" });
  const req = getDailyFacts(input.day, input.token, input.opts).then((res) => {
    inflight.delete(key);
    commitSettled(key, input.day, writeGen, res);
    return res;
  });
  inflight.set(key, req);
  return req;
}
