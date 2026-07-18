/**
 * Source guards: selected-day completeness — no silent truncation, no feed path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TIMELINE_DAY_EVENTS_MAX_ITEMS,
  TIMELINE_DAY_EVENTS_PAGE_SIZE,
  TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
  TIMELINE_DAY_RAW_EVENTS_MAX_ITEMS,
  TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE,
  TIMELINE_DAY_WORST_CASE_SELECTED_DAY_REQUESTS,
} from "@/lib/features/timeline/timelineDayPageLimits";
import { isTimelineDayStatusReadyComplete } from "@/lib/features/timeline/types";

describe("Daily Timeline selected-day completeness guards", () => {
  const root = join(__dirname, "..", "..", "..", "..");

  test("useTimelineDay follows pages via Timeline loaders (does not ignore nextCursor)", () => {
    const hook = readFileSync(join(root, "lib/features/timeline/useTimelineDay.ts"), "utf8");
    expect(hook).toContain("fetchTimelineDayEventsPages");
    expect(hook).toContain("fetchTimelineDayRawEventsPages");
    expect(hook).not.toContain("getTimelineFeed");
    expect(hook).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
    expect(hook).not.toContain("while (");
    expect(hook).toContain('completeness === "complete"');
  });

  test("page collection has a finite cap ≤ 10", () => {
    expect(TIMELINE_DAY_MAX_PAGES_PER_FAMILY).toBeLessThanOrEqual(10);
    expect(TIMELINE_DAY_MAX_PAGES_PER_FAMILY).toBeGreaterThanOrEqual(1);
    expect(TIMELINE_DAY_EVENTS_MAX_ITEMS).toBe(
      TIMELINE_DAY_EVENTS_PAGE_SIZE * TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
    );
    expect(TIMELINE_DAY_RAW_EVENTS_MAX_ITEMS).toBe(
      TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE * TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
    );
    expect(TIMELINE_DAY_WORST_CASE_SELECTED_DAY_REQUESTS).toBeLessThanOrEqual(23);
  });

  test("collector enforces cursor cycle and page cap reasons", () => {
    const collector = readFileSync(
      join(root, "lib/features/timeline/collectCursorPages.ts"),
      "utf8",
    );
    expect(collector).toContain("page_cap");
    expect(collector).toContain("cursor_cycle");
    expect(collector).toContain("seenCursors");
    expect(collector).not.toContain("console.log");
  });

  test("shipping screen has no feed / Firebase / per-row fetch", () => {
    const screen = readFileSync(join(root, "lib/ui/timeline/TimelineDayScreen.tsx"), "utf8");
    expect(screen).not.toContain("getTimelineFeed");
    expect(screen).not.toContain("firebase");
    expect(screen).not.toContain("getEvents(");
    expect(screen).not.toContain("getRawEvents(");
    expect(screen).toContain("TimelineDayIncompleteNotice");
    expect(screen).not.toContain("nextCursor");
  });

  test("ready-state invariant helper only accepts ready", () => {
    expect(
      isTimelineDayStatusReadyComplete({
        status: "ready",
        vm: {
          day: "2026-07-16",
          context: [],
          items: [],
          isEmpty: true,
          summary: null,
        },
      }),
    ).toBe(true);
    expect(
      isTimelineDayStatusReadyComplete({
        status: "partial",
        history: "incomplete",
        incompletenessReason: "page_cap",
        vm: {
          day: "2026-07-16",
          context: [],
          items: [],
          isEmpty: true,
          summary: null,
        },
      }),
    ).toBe(false);
  });

  test("incomplete notice copy is friendly and hides internals", () => {
    const notice = readFileSync(
      join(root, "lib/ui/timeline/TimelineDayIncompleteNotice.tsx"),
      "utf8",
    );
    expect(notice).toContain("Some activity may be missing");
    expect(notice).not.toContain("page_cap");
    expect(notice).not.toContain("nextCursor");
    expect(notice).toContain("minHeight: 44");
  });
});
