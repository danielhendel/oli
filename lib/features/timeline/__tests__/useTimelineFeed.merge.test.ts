// lib/features/timeline/__tests__/useTimelineFeed.merge.test.ts
// Pure merge/group behavior for the feed hook (no Auth/Firebase).

import type { TimelinePresentationItem } from "@oli/contracts";
import {
  groupSectionsAscending,
  mergeFeedPageItems,
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

describe("timeline feed merge helpers", () => {
  test("mergeFeedPageItems drops duplicate dedupeKeys", () => {
    const a = item("a", "2026-07-16", "nutrition:a");
    const b = item("b", "2026-07-15", "canonical:b");
    const merged = mergeFeedPageItems([a], [a, b]);
    expect(merged.map((i) => i.dedupeKey)).toEqual(["nutrition:a", "canonical:b"]);
  });

  test("groupSectionsAscending places Today/newest last for chat-style chronology", () => {
    const page1 = [
      item("a", "2026-07-16", "a"),
      item("b", "2026-07-16", "b"),
    ];
    const page2 = [
      item("c", "2026-07-15", "c"),
      item("d", "2026-07-14", "d"),
    ];
    const merged = mergeFeedPageItems(page1, page2);
    const sections = groupSectionsAscending(merged);
    expect(sections.map((s) => s.day)).toEqual([
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
    ]);
    expect(sections[sections.length - 1]?.data).toHaveLength(2);
  });

  test("refetch omits optional opts under exactOptionalPropertyTypes", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const src = readFileSync(join(__dirname, "..", "useTimelineFeed.ts"), "utf8");
    expect(src).toContain("...(opts !== undefined ? { opts } : {})");
    expect(src).not.toMatch(/append:\s*false,\s*opts,/);
  });

  test("request-budget contract: one feed client, guarded loadOlder, no per-day fan-out", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const hook = readFileSync(join(__dirname, "..", "useTimelineFeed.ts"), "utf8");
    const list = readFileSync(
      join(__dirname, "..", "..", "..", "ui", "timeline", "TimelineFeedList.tsx"),
      "utf8",
    );
    const screen = readFileSync(
      join(__dirname, "..", "..", "..", "ui", "timeline", "TimelineDayScreen.tsx"),
      "utf8",
    );
    expect(hook).toContain("import { getTimelineFeed }");
    expect(hook).toContain("await getTimelineFeed(token,");
    expect(hook).toContain("loadOlder");
    expect(hook).toContain("canRequestOlderPage");
    expect(hook).toContain("inFlightOlderCursorRef");
    expect(hook).toContain("groupSectionsAscending");
    expect(hook).not.toContain("getRawEvents");
    expect(hook).not.toContain("oura");
    expect(list).toContain("onStartReached");
    expect(list).not.toContain("onEndReached=");
    expect(list).toContain("maintainVisibleContentPosition");
    // Daily Timeline v1: shipping screen must not gate on the continuous-feed flag.
    expect(screen).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
    expect(screen).not.toContain("TimelineFeedScreen");
  });
});
