/**
 * Calendar-jump continuity: selecting D must keep newer days toward Today.
 * Client-only strategy: Today-rooted pages + bounded older append.
 */
import type { TimelinePresentationItem } from "@oli/contracts";
import {
  groupSectionsAscending,
  mergeFeedPageItems,
} from "@/lib/features/timeline/timelineFeedOrder";
import {
  MAX_ENSURE_DAY_OLDER_PAGES,
  canRequestEnsureDayPage,
  dayIsLoaded,
  resolveScrollLocation,
} from "@/lib/features/timeline/timelineFeedScrollIntent";

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

describe("timeline calendar continuity (client-only ensure-day)", () => {
  const today = "2026-07-16";
  const loaded = groupSectionsAscending([
    item("2026-07-14", "d2"),
    item("2026-07-15", "d1"),
    item("2026-07-16", "today"),
  ]);

  test("selecting loaded D issues zero network need and scrolls to D", () => {
    expect(dayIsLoaded(loaded, "2026-07-15")).toBe(true);
    const loc = resolveScrollLocation(loaded, {
      id: 1,
      mode: "day",
      day: "2026-07-15",
    });
    expect(loc?.sectionIndex).toBe(1);
    expect(loc?.viewPosition).toBe(0);
  });

  test("D-1 remains above and D+1/Today remain below after selecting D", () => {
    expect(loaded.map((s) => s.day)).toEqual([
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
    ]);
    const dIndex = loaded.findIndex((s) => s.day === "2026-07-15");
    expect(loaded[dIndex - 1]?.day).toBe("2026-07-14");
    expect(loaded[dIndex + 1]?.day).toBe(today);
  });

  test("appending older pages preserves already-loaded newer history", () => {
    const todayPage = [item("2026-07-16", "today"), item("2026-07-15", "d1")];
    const olderPage = [
      item("2026-07-14", "d2"),
      item("2026-07-13", "d3"),
      item("2026-07-12", "target"),
    ];
    const merged = mergeFeedPageItems(todayPage, olderPage);
    const sections = groupSectionsAscending(merged);
    expect(sections.map((s) => s.day)).toEqual([
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
    ]);
    expect(dayIsLoaded(sections, "2026-07-12")).toBe(true);
    expect(dayIsLoaded(sections, today)).toBe(true);
    // No duplicate day or item
    expect(new Set(sections.map((s) => s.day)).size).toBe(sections.length);
    expect(new Set(merged.map((i) => i.dedupeKey)).size).toBe(merged.length);
  });

  test("ensure-day budget is page-capped (not one request per day)", () => {
    expect(MAX_ENSURE_DAY_OLDER_PAGES).toBe(10);
    let pages = 0;
    while (
      canRequestEnsureDayPage({
        pagesRequested: pages,
        maxPages: MAX_ENSURE_DAY_OLDER_PAGES,
        hasMore: true,
        targetLoaded: false,
      })
    ) {
      pages += 1;
    }
    expect(pages).toBe(10);
  });

  test("Return to Today targets newest section without needing page discard", () => {
    const loc = resolveScrollLocation(loaded, { id: 9, mode: "newest" });
    expect(loc?.sectionIndex).toBe(loaded.length - 1);
    expect(loaded[loc!.sectionIndex]?.day).toBe(today);
  });
});
