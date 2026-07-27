/**
 * User/range-scoped in-memory cache for bounded readiness contributor history.
 *
 * One GET /users/me/oura-readiness-range response serves all four approved
 * contributor metrics (hrv_balance, body_temperature, recovery_index,
 * sleep_balance). No per-metric fan-out. No unbounded Firestore listeners.
 *
 * Cache keys include uid — no cross-user leakage. Generation guards reject
 * stale responses. Warm exact-range cache is reused; failed refreshes do not
 * erase a matching ready cache (offline reuse).
 *
 * Exact-day vendor rows only — the range API never densifies prior-night fallback.
 */

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import { getOuraReadinessRange } from "@/lib/api/ouraReadinessRange";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type {
  ReadinessContributorDayCell,
  ReadinessContributorHistorySnapshot,
} from "@/lib/data/readiness/readinessContributorHistoryTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

export type {
  ReadinessContributorHistoryStatus,
  ReadinessContributorDayCell,
  ReadinessContributorHistorySnapshot,
} from "@/lib/data/readiness/readinessContributorHistoryTypes";

type CacheKey = string;

function makeKey(uid: string, start: DayKey, end: DayKey): CacheKey {
  return `${uid}|${start}|${end}`;
}

function cellFromRangeDay(day: OuraReadinessRangeDayDto | undefined): ReadinessContributorDayCell {
  if (day == null) return { settled: true };
  return { settled: true, day };
}

type CacheEntry = {
  snapshot: ReadinessContributorHistorySnapshot;
  inflight: Promise<ReadinessContributorHistorySnapshot> | null;
  listeners: Set<() => void>;
};

const entries = new Map<CacheKey, CacheEntry>();
let generationCounter = 0;

function notify(entry: CacheEntry): void {
  for (const listener of entry.listeners) {
    listener();
  }
}

function getOrCreateEntry(
  key: CacheKey,
  rangeStart: DayKey,
  rangeEnd: DayKey,
): CacheEntry {
  const existing = entries.get(key);
  if (existing != null) return existing;
  const entry: CacheEntry = {
    snapshot: {
      historyStatus: "idle",
      dayByDay: {},
      errorMessage: null,
      rangeStart,
      rangeEnd,
      generation: 0,
    },
    inflight: null,
    listeners: new Set(),
  };
  entries.set(key, entry);
  return entry;
}

export function subscribeReadinessContributorHistory(
  uid: string,
  rangeStart: DayKey,
  rangeEnd: DayKey,
  listener: () => void,
): () => void {
  const key = makeKey(uid, rangeStart, rangeEnd);
  const entry = getOrCreateEntry(key, rangeStart, rangeEnd);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

export function peekReadinessContributorHistory(
  uid: string,
  rangeStart: DayKey,
  rangeEnd: DayKey,
): ReadinessContributorHistorySnapshot | null {
  const entry = entries.get(makeKey(uid, rangeStart, rangeEnd));
  return entry?.snapshot ?? null;
}

/**
 * Ensure a bounded contributor-history range is loading or ready.
 * Shares in-flight promises; one request covers all four contributors.
 */
export async function ensureReadinessContributorHistory(input: {
  uid: string;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  dayKeys: readonly DayKey[];
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  cacheBust?: string;
}): Promise<ReadinessContributorHistorySnapshot> {
  const { uid, rangeStart, rangeEnd, dayKeys, getIdToken, cacheBust } = input;
  const key = makeKey(uid, rangeStart, rangeEnd);
  const entry = getOrCreateEntry(key, rangeStart, rangeEnd);

  const force = cacheBust != null && cacheBust.length > 0;
  if (!force && entry.snapshot.historyStatus === "ready" && entry.inflight == null) {
    return entry.snapshot;
  }
  if (!force && entry.inflight != null) {
    return entry.inflight;
  }

  const previousReady =
    entry.snapshot.historyStatus === "ready" ? entry.snapshot.dayByDay : null;
  const generation = ++generationCounter;
  entry.snapshot = {
    ...entry.snapshot,
    historyStatus: "loading",
    errorMessage: null,
    generation,
  };
  notify(entry);

  const inflightRef: { current: Promise<ReadinessContributorHistorySnapshot> | null } = {
    current: null,
  };
  const inflightPromise = (async (): Promise<ReadinessContributorHistorySnapshot> => {
    try {
      const token = await getIdToken(false);
      if (entry.snapshot.generation !== generation) {
        return entry.snapshot;
      }
      if (!token) {
        entry.snapshot = {
          historyStatus: "error",
          dayByDay: previousReady ?? {},
          errorMessage: "Could not load readiness contributor history.",
          rangeStart,
          rangeEnd,
          generation,
        };
        notify(entry);
        return entry.snapshot;
      }

      const res = await getOuraReadinessRange(
        token,
        rangeStart,
        rangeEnd,
        cacheBust ? { cacheBust: `${cacheBust}:${rangeStart}:${rangeEnd}` } : undefined,
      );
      if (entry.snapshot.generation !== generation) {
        return entry.snapshot;
      }

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status !== "ready") {
        entry.snapshot = {
          historyStatus: "error",
          // Preserve warm exact-range cache for offline / transient failure.
          dayByDay: previousReady ?? {},
          errorMessage: "Could not load readiness contributor history.",
          rangeStart,
          rangeEnd,
          generation,
        };
        notify(entry);
        return entry.snapshot;
      }

      const byDay = new Map<string, OuraReadinessRangeDayDto>();
      for (const row of outcome.data.days) {
        byDay.set(row.day, row);
      }
      const next: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
      for (const day of dayKeys) {
        next[day] = cellFromRangeDay(byDay.get(day));
      }
      entry.snapshot = {
        historyStatus: "ready",
        dayByDay: next,
        errorMessage: null,
        rangeStart,
        rangeEnd,
        generation,
      };
      notify(entry);
      return entry.snapshot;
    } catch {
      if (entry.snapshot.generation !== generation) {
        return entry.snapshot;
      }
      entry.snapshot = {
        historyStatus: "error",
        dayByDay: previousReady ?? {},
        errorMessage: "Could not load readiness contributor history.",
        rangeStart,
        rangeEnd,
        generation,
      };
      notify(entry);
      return entry.snapshot;
    } finally {
      if (entry.inflight === inflightRef.current) {
        entry.inflight = null;
      }
    }
  })();
  inflightRef.current = inflightPromise;

  entry.inflight = inflightPromise;
  return inflightPromise;
}

/** Test-only: clear all cached history. */
export function resetReadinessContributorHistoryCacheForTests(): void {
  entries.clear();
  generationCounter = 0;
}
