/**
 * Pure scroll-intent / ensure-day budget tests for Timeline continuous feed.
 */
import {
  MAX_ENSURE_DAY_OLDER_PAGES,
  MAX_FEED_SCROLL_RETRIES,
  canRequestEnsureDayPage,
  dayIsLoaded,
  resolveScrollLocation,
  sectionIndexForDay,
} from "@/lib/features/timeline/timelineFeedScrollIntent";
import {
  finalSectionIndex,
  groupSectionsAscending,
} from "@/lib/features/timeline/timelineFeedOrder";
import type { TimelinePresentationItem } from "@oli/contracts";

function item(day: string, id: string): TimelinePresentationItem {
  return {
    id,
    kind: "nutrition",
    day,
    occurredAt: `${day}T12:00:00.000Z`,
    timezone: "UTC",
    title: id,
    status: "ready",
    source: "manual",
    destination: `/(app)/nutrition/day/${day}`,
    accessibilityLabel: id,
    dedupeKey: id,
    isSynthetic: false,
    displayRole: "chronological_event",
  };
}

describe("timelineFeedScrollIntent", () => {
  const sections = groupSectionsAscending([
    item("2026-07-14", "a"),
    item("2026-07-15", "b"),
    item("2026-07-16", "c"),
    item("2026-07-16", "d"),
  ]);

  test("newest intent targets final section last item near bottom", () => {
    const loc = resolveScrollLocation(sections, { id: 1, mode: "newest" });
    expect(loc).toEqual({
      sectionIndex: finalSectionIndex(sections),
      itemIndex: 1,
      viewPosition: 1,
    });
  });

  test("day intent targets section header near top", () => {
    const loc = resolveScrollLocation(sections, {
      id: 2,
      mode: "day",
      day: "2026-07-15",
    });
    expect(loc).toEqual({
      sectionIndex: 1,
      itemIndex: 0,
      viewPosition: 0,
    });
  });

  test("day intent returns null until the day is loaded", () => {
    expect(
      resolveScrollLocation(sections, { id: 3, mode: "day", day: "2026-07-10" }),
    ).toBeNull();
    expect(dayIsLoaded(sections, "2026-07-14")).toBe(true);
    expect(dayIsLoaded(sections, "2026-07-10")).toBe(false);
    expect(sectionIndexForDay(sections, "2026-07-16")).toBe(2);
  });

  test("ensure-day budget is bounded and stops when loaded or exhausted", () => {
    expect(MAX_FEED_SCROLL_RETRIES).toBeGreaterThan(0);
    expect(MAX_ENSURE_DAY_OLDER_PAGES).toBe(10);
    expect(
      canRequestEnsureDayPage({
        pagesRequested: 0,
        maxPages: 10,
        hasMore: true,
        targetLoaded: false,
      }),
    ).toBe(true);
    expect(
      canRequestEnsureDayPage({
        pagesRequested: 10,
        maxPages: 10,
        hasMore: true,
        targetLoaded: false,
      }),
    ).toBe(false);
    expect(
      canRequestEnsureDayPage({
        pagesRequested: 2,
        maxPages: 10,
        hasMore: false,
        targetLoaded: false,
      }),
    ).toBe(false);
    expect(
      canRequestEnsureDayPage({
        pagesRequested: 2,
        maxPages: 10,
        hasMore: true,
        targetLoaded: true,
      }),
    ).toBe(false);
  });
});
