/**
 * Sprint 4 — Stable cache keys and memoized selectors for Timeline & Library.
 *
 * Non-negotiable: deterministic ordering, stable keys for virtualization.
 * Read-through cache for recent ranges (offline resilience).
 */

import type { TimelineResponseDto, TimelineDay } from "@oli/contracts";
import type { CanonicalEventsListResponseDto } from "@oli/contracts";

/** Stable cache key for timeline range. Same input → same key. */
export function timelineCacheKey(start: string, end: string): string {
  return `timeline:${start}:${end}`;
}

/** Stable cache key for events query. Same input → same key. */
export function eventsCacheKey(opts: {
  start?: string;
  end?: string;
  kinds?: string[];
  cursor?: string;
}): string {
  const parts = [
    opts.start ?? "",
    opts.end ?? "",
    opts.kinds?.slice().sort().join(",") ?? "",
    opts.cursor ?? "",
  ];
  return `events:${parts.join(":")}`;
}

/** Memoized selector: sorted days from timeline (preserves server order). */
export function selectTimelineDays(data: TimelineResponseDto): TimelineDay[] {
  return data.days;
}

/** Memoized selector: events in deterministic order (server order preserved). */
export function selectEventItems(data: CanonicalEventsListResponseDto) {
  return data.items;
}

/** In-memory read-through cache for recent timeline ranges. */
const timelineCache = new Map<string, { data: TimelineResponseDto; at: number }>();
const eventsCache = new Map<string, { data: CanonicalEventsListResponseDto; at: number }>();

const MAX_AGE_MS = 5 * 60 * 1000; // 5 min
const MAX_ENTRIES = 20;

function evictStale(map: Map<string, { at: number }>): void {
  const now = Date.now();
  for (const [k, v] of map.entries()) {
    if (now - v.at > MAX_AGE_MS) map.delete(k);
  }
  if (map.size > MAX_ENTRIES) {
    const entries = Array.from(map.entries()).sort((a, b) => a[1].at - b[1].at);
    for (let i = 0; i < entries.length - MAX_ENTRIES; i++) {
      map.delete(entries[i]![0]);
    }
  }
}

export function getTimelineCached(key: string): TimelineResponseDto | null {
  const entry = timelineCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > MAX_AGE_MS) {
    timelineCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setTimelineCached(key: string, data: TimelineResponseDto): void {
  evictStale(timelineCache);
  timelineCache.set(key, { data, at: Date.now() });
}

export function getEventsCached(key: string): CanonicalEventsListResponseDto | null {
  const entry = eventsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > MAX_AGE_MS) {
    eventsCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setEventsCached(key: string, data: CanonicalEventsListResponseDto): void {
  evictStale(eventsCache);
  eventsCache.set(key, { data, at: Date.now() });
}
