/**
 * Source guards for current-day viewport and calendar newer-history continuity.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("timeline viewport and calendar continuity contracts", () => {
  const root = join(__dirname, "..", "..", "..");

  test("sticky section headers are disabled on the continuous feed list", () => {
    const list = readFileSync(join(root, "ui/timeline/TimelineFeedList.tsx"), "utf8");
    expect(list).toContain("stickySectionHeadersEnabled={false}");
    expect(list).toContain("TimelineDaySectionHeader");
    expect(list).toContain("onScrollToIndexFailed");
    expect(list).toContain("onScrollBeginDrag");
    expect(list).toContain("MAX_FEED_SCROLL_RETRIES");
    expect(list).not.toMatch(/stickySectionHeadersEnabled\s*$/m);
  });

  test("calendar selection uses jumpToDay without replacing newer history", () => {
    const hook = readFileSync(join(root, "features/timeline/useTimelineFeed.ts"), "utf8");
    const screen = readFileSync(join(root, "ui/timeline/TimelineFeedScreen.tsx"), "utf8");
    expect(hook).toContain("jumpToDay");
    expect(hook).toContain("MAX_ENSURE_DAY_OLDER_PAGES");
    expect(hook).toContain("dayIsLoaded");
    expect(hook).toContain("anchorDay: today");
    expect(hook).not.toMatch(/setAnchorDayState\(day\)/);
    expect(screen).toContain("feed.jumpToDay");
    expect(screen).not.toContain("feed.setAnchorDay");
    expect(screen).toContain("selectedDay={feed.selectedDay}");
  });

  test("Return to Today re-targets newest without discarding loaded pages", () => {
    const hook = readFileSync(join(root, "features/timeline/useTimelineFeed.ts"), "utf8");
    const returnBlock = hook.slice(hook.indexOf("const returnToToday"), hook.indexOf("const refetch"));
    expect(returnBlock).toContain('mode: "newest"');
    expect(returnBlock).not.toContain("setItems([])");
  });

  test("no request-per-day or unbounded ensure loop", () => {
    const hook = readFileSync(join(root, "features/timeline/useTimelineFeed.ts"), "utf8");
    const intent = readFileSync(
      join(root, "features/timeline/timelineFeedScrollIntent.ts"),
      "utf8",
    );
    expect(intent).toContain("MAX_ENSURE_DAY_OLDER_PAGES = 10");
    expect(hook).toContain("canRequestEnsureDayPage");
    expect(hook).not.toMatch(/for\s*\(\s*let\s+d\s*=/);
    expect(hook).not.toContain("getTimelineDay");
  });
});
