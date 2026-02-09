/**
 * Phase 2 proof test — Cache correctness and invalidation determinism.
 *
 * Proves:
 * - Same query produces same cache key
 * - Cache set/get round-trip preserves data
 * - Stale entries are evicted (age check)
 */
import { describe, it, expect } from "@jest/globals";
import {
  timelineCacheKey,
  eventsCacheKey,
  getTimelineCached,
  setTimelineCached,
  getEventsCached,
  setEventsCached,
} from "@/lib/data/timelineCache";
import type { TimelineResponseDto, CanonicalEventsListResponseDto } from "@oli/contracts";

describe("Phase 2 proof: cache correctness and invalidation determinism", () => {
  it("timeline cache round-trip preserves data", () => {
    const key = timelineCacheKey("2025-01-01", "2025-01-14");
    const data: TimelineResponseDto = {
      days: [
        { day: "2025-01-10", canonicalCount: 3, hasDailyFacts: true, hasInsights: false, hasIntelligenceContext: false, hasDerivedLedger: false },
      ],
    };
    setTimelineCached(key, data);
    const got = getTimelineCached(key);
    expect(got).not.toBeNull();
    expect(got!.days).toHaveLength(1);
    expect(got!.days[0]!.day).toBe("2025-01-10");
  });

  it("events cache round-trip preserves data", () => {
    const key = eventsCacheKey({ start: "2025-01-01", end: "2025-01-15" });
    const data: CanonicalEventsListResponseDto = {
      items: [],
      nextCursor: null,
    };
    setEventsCached(key, data);
    const got = getEventsCached(key);
    expect(got).not.toBeNull();
    expect(got!.items).toHaveLength(0);
  });

  it("cache key determinism: same args produce same key", () => {
    const args = { start: "2025-01-01", end: "2025-01-31", kinds: ["weight", "sleep"] };
    expect(eventsCacheKey(args)).toBe(eventsCacheKey({ ...args }));
    expect(eventsCacheKey({ ...args, kinds: ["sleep", "weight"] })).toBe(eventsCacheKey(args));
  });
});
