// lib/features/timeline/__tests__/useTimelineFeed.merge.test.ts
// Pure merge/group behavior for the feed hook (no Auth/Firebase).

import type { TimelinePresentationItem } from "@oli/contracts";

function mergeItems(
  prev: TimelinePresentationItem[],
  next: TimelinePresentationItem[],
): TimelinePresentationItem[] {
  const seen = new Set(prev.map((i) => i.dedupeKey));
  const out = [...prev];
  for (const item of next) {
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    out.push(item);
  }
  return out;
}

function groupSections(items: TimelinePresentationItem[]) {
  const order: string[] = [];
  const map = new Map<string, TimelinePresentationItem[]>();
  for (const item of items) {
    if (!map.has(item.day)) {
      map.set(item.day, []);
      order.push(item.day);
    }
    map.get(item.day)!.push(item);
  }
  return order.map((day) => ({ day, data: map.get(day)! }));
}

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

describe("timeline feed merge helpers", () => {
  test("mergeItems drops duplicate dedupeKeys", () => {
    const a = item("a", "2026-07-16", "nutrition:a");
    const b = item("b", "2026-07-15", "canonical:b");
    const merged = mergeItems([a], [a, b]);
    expect(merged.map((i) => i.dedupeKey)).toEqual(["nutrition:a", "canonical:b"]);
  });

  test("groupSections preserves first-seen day order with Today first and older below", () => {
    const page1 = [
      item("a", "2026-07-16", "a"),
      item("b", "2026-07-16", "b"),
    ];
    const page2 = [
      item("c", "2026-07-15", "c"),
      item("d", "2026-07-14", "d"),
    ];
    const merged = mergeItems(page1, page2);
    const sections = groupSections(merged);
    expect(sections.map((s) => s.day)).toEqual([
      "2026-07-16",
      "2026-07-15",
      "2026-07-14",
    ]);
    expect(sections[0]?.data).toHaveLength(2);
  });

  test("refetch omits optional opts under exactOptionalPropertyTypes", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const src = readFileSync(join(__dirname, "..", "useTimelineFeed.ts"), "utf8");
    expect(src).toContain("...(opts !== undefined ? { opts } : {})");
    expect(src).not.toMatch(/append:\s*false,\s*opts,/);
  });

  test("request-budget contract: one feed client, guarded loadMore, no per-day fan-out", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const hook = readFileSync(join(__dirname, "..", "useTimelineFeed.ts"), "utf8");
    const screen = readFileSync(
      join(__dirname, "..", "..", "..", "ui", "timeline", "TimelineDayScreen.tsx"),
      "utf8",
    );
    expect(hook).toContain("import { getTimelineFeed }");
    expect(hook).toContain("await getTimelineFeed(token,");
    expect(hook).toContain("if (!hasMore || !nextCursor || loadingMore || loading) return");
    expect(hook).toContain("setAnchorDayState");
    expect(hook).toContain("returnToToday");
    expect(hook).not.toContain("getRawEvents");
    expect(hook).not.toContain("oura");
    expect(screen).toContain('EXPO_PUBLIC_TIMELINE_FEED === "1"');
    expect(screen).not.toMatch(/EXPO_PUBLIC_TIMELINE_FEED\s*=\s*["']1["']/);
  });
});
