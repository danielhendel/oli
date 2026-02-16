/**
 * Sprint 4 — Stable cache keys and memoized selectors for Timeline & Library.
 *
 * Non-negotiable: deterministic ordering, stable keys for virtualization.
 * Read-through cache for recent ranges (offline resilience).
 */
import type { TimelineResponseDto, TimelineDay } from "@oli/contracts";
import type { CanonicalEventsListResponseDto } from "@oli/contracts";
/** Stable cache key for timeline range. Same input → same key. */
export declare function timelineCacheKey(start: string, end: string): string;
/** Stable cache key for events query. Same input → same key. */
export declare function eventsCacheKey(opts: {
    start?: string;
    end?: string;
    kinds?: string[];
    cursor?: string;
}): string;
/** Memoized selector: sorted days from timeline (preserves server order). */
export declare function selectTimelineDays(data: TimelineResponseDto): TimelineDay[];
/** Memoized selector: events in deterministic order (server order preserved). */
export declare function selectEventItems(data: CanonicalEventsListResponseDto): {
    kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
    day: string;
    start: string;
    end: string;
    timezone: string;
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    createdAt: string;
    updatedAt: string;
}[];
export declare function getTimelineCached(key: string): TimelineResponseDto | null;
export declare function setTimelineCached(key: string, data: TimelineResponseDto): void;
export declare function getEventsCached(key: string): CanonicalEventsListResponseDto | null;
export declare function setEventsCached(key: string, data: CanonicalEventsListResponseDto): void;
//# sourceMappingURL=timelineCache.d.ts.map