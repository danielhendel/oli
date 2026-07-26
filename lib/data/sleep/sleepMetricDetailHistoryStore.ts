/**
 * User/range-scoped in-memory cache for bounded SleepNight detail history.
 *
 * Shared by Duration, Deep, and REM detail so one 90-day response is reused.
 * No cross-user leakage: cache keys include uid. Stale ranges are keyed separately.
 */

import type { SleepNightViewDto } from "@oli/contracts";

import { getSleepNightsRange } from "@/lib/api/usersMe";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepMetricDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepMetricDetailHistorySnapshot = {
  historyStatus: SleepMetricDetailHistoryStatus;
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  errorMessage: string | null;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  /** Monotonic generation for stale-response protection. */
  generation: number;
};

type CacheKey = string;

function makeKey(uid: string, start: DayKey, end: DayKey): CacheKey {
  return `${uid}|${start}|${end}`;
}

function cellFromRangeNight(view: SleepNightViewDto | undefined): WeeklyFitnessSleepNightCell {
  if (view == null) return { settled: true };
  if (view.resolution === "latest_completed_prior_night") return { settled: true };
  return { settled: true, view };
}

type CacheEntry = {
  snapshot: SleepMetricDetailHistorySnapshot;
  inflight: Promise<SleepMetricDetailHistorySnapshot> | null;
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
      sleepNightByDay: {},
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

export function subscribeSleepMetricDetailHistory(
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

export function peekSleepMetricDetailHistory(
  uid: string,
  rangeStart: DayKey,
  rangeEnd: DayKey,
): SleepMetricDetailHistorySnapshot | null {
  const entry = entries.get(makeKey(uid, rangeStart, rangeEnd));
  return entry?.snapshot ?? null;
}

/**
 * Ensure a 90-day range is loading or ready. Shares in-flight promises across subscribers.
 */
export async function ensureSleepMetricDetailHistory(input: {
  uid: string;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  dayKeys: readonly DayKey[];
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  cacheBust?: string;
}): Promise<SleepMetricDetailHistorySnapshot> {
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

  const generation = ++generationCounter;
  entry.snapshot = {
    ...entry.snapshot,
    historyStatus: "loading",
    errorMessage: null,
    generation,
  };
  notify(entry);

  const inflightRef: { current: Promise<SleepMetricDetailHistorySnapshot> | null } = {
    current: null,
  };
  const inflightPromise = (async (): Promise<SleepMetricDetailHistorySnapshot> => {
    try {
      const token = await getIdToken(false);
      if (entry.snapshot.generation !== generation) {
        return entry.snapshot;
      }
      if (!token) {
        entry.snapshot = {
          historyStatus: "error",
          sleepNightByDay: {},
          errorMessage: "Could not load recent sleep averages.",
          rangeStart,
          rangeEnd,
          generation,
        };
        notify(entry);
        return entry.snapshot;
      }

      const res = await getSleepNightsRange(
        rangeStart,
        rangeEnd,
        token,
        cacheBust ? { cacheBust: `${cacheBust}:${rangeStart}:${rangeEnd}` } : undefined,
      );
      if (entry.snapshot.generation !== generation) {
        return entry.snapshot;
      }

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status !== "ready") {
        entry.snapshot = {
          historyStatus: "error",
          sleepNightByDay: {},
          errorMessage: "Could not load recent sleep averages.",
          rangeStart,
          rangeEnd,
          generation,
        };
        notify(entry);
        return entry.snapshot;
      }

      const byRequested = new Map<string, SleepNightViewDto>();
      for (const night of outcome.data.nights) {
        byRequested.set(night.requestedDay, night);
      }
      const next: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>> = {};
      for (const day of dayKeys) {
        next[day] = cellFromRangeNight(byRequested.get(day));
      }
      entry.snapshot = {
        historyStatus: "ready",
        sleepNightByDay: next,
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
        sleepNightByDay: {},
        errorMessage: "Could not load recent sleep averages.",
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
export function resetSleepMetricDetailHistoryCacheForTests(): void {
  entries.clear();
  generationCounter = 0;
}
