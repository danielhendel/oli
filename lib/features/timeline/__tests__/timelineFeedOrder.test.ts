// lib/features/timeline/__tests__/timelineFeedOrder.test.ts
import type { TimelinePresentationItem } from "@oli/contracts";
import {
  canRequestOlderPage,
  finalSectionDay,
  finalSectionIndex,
  groupSectionsAscending,
  mergeFeedPageItems,
  shouldLoadOlderFromEdge,
} from "@/lib/features/timeline/timelineFeedOrder";

function item(
  id: string,
  day: string,
  dedupeKey: string,
): TimelinePresentationItem {
  return {
    id,
    kind: "nutrition",
    day,
    occurredAt: `${day}T10:00:00.000Z`,
    timezone: "UTC",
    title: id,
    status: "ready",
    source: "manual",
    destination: `/(app)/nutrition/day/${day}`,
    accessibilityLabel: id,
    dedupeKey,
    isSynthetic: false,
    displayRole: "chronological_event",
  };
}

describe("timelineFeedOrder", () => {
  test("groupSectionsAscending orders oldest→newest with Today last", () => {
    const page1 = [item("a", "2026-07-16", "a"), item("b", "2026-07-16", "b")];
    const page2 = [item("c", "2026-07-15", "c"), item("d", "2026-07-14", "d")];
    const merged = mergeFeedPageItems(page1, page2);
    const sections = groupSectionsAscending(merged);
    expect(sections.map((s) => s.day)).toEqual([
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
    ]);
    expect(finalSectionDay(sections)).toBe("2026-07-16");
    expect(finalSectionIndex(sections)).toBe(2);
    expect(sections[2]?.data).toHaveLength(2);
  });

  test("mergeFeedPageItems drops duplicate dedupeKeys", () => {
    const a = item("a", "2026-07-16", "nutrition:a");
    const b = item("b", "2026-07-15", "canonical:b");
    const merged = mergeFeedPageItems([a], [a, b]);
    expect(merged.map((i) => i.dedupeKey)).toEqual(["nutrition:a", "canonical:b"]);
  });

  test("older-page gate is top-boundary only and blocks concurrent duplicates", () => {
    const gate = {
      hasMore: true,
      nextCursor: "opaque",
      loadingMore: false,
      loading: false,
    };
    expect(shouldLoadOlderFromEdge({ edge: "start", gate })).toBe(true);
    expect(shouldLoadOlderFromEdge({ edge: "end", gate })).toBe(false);
    expect(canRequestOlderPage({ ...gate, nextCursor: null })).toBe(false);
    expect(canRequestOlderPage({ ...gate, hasMore: false })).toBe(false);
    expect(canRequestOlderPage({ ...gate, loadingMore: true })).toBe(false);
    expect(canRequestOlderPage({ ...gate, loading: true })).toBe(false);
  });

  test("empty older page does not invent sections", () => {
    const page1 = [item("a", "2026-07-16", "a")];
    const merged = mergeFeedPageItems(page1, []);
    expect(groupSectionsAscending(merged).map((s) => s.day)).toEqual(["2026-07-16"]);
  });
});
