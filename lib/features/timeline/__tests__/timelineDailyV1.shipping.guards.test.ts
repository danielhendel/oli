/**
 * Source guards: Daily Timeline v1 is the only shipping Timeline tab path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Daily Timeline v1 shipping path", () => {
  const root = join(__dirname, "..", "..", "..", "..");

  test("tab entrypoint renders TimelineDayScreen only", () => {
    const index = readFileSync(join(root, "app/(app)/(tabs)/timeline/index.tsx"), "utf8");
    expect(index).toContain("TimelineDayScreen");
    expect(index).not.toContain("TimelineFeedScreen");
    expect(index).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
  });

  test("TimelineDayScreen does not import continuous feed or flag", () => {
    const screen = readFileSync(join(root, "lib/ui/timeline/TimelineDayScreen.tsx"), "utf8");
    expect(screen).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
    expect(screen).not.toContain("TimelineFeedScreen");
    expect(screen).not.toContain("useTimelineFeed");
    expect(screen).not.toContain("SectionList");
    expect(screen).not.toContain("onStartReached");
    expect(screen).not.toContain("scrollToLocation");
    expect(screen).toContain("useTimelineDay");
    expect(screen).toContain("DailyTimelineContextCard");
  });

  test("no continuous older-page loop on shipping screen", () => {
    const screen = readFileSync(join(root, "lib/ui/timeline/TimelineDayScreen.tsx"), "utf8");
    expect(screen).not.toContain("jumpToDay");
    expect(screen).not.toContain("ensureDay");
    expect(screen).not.toContain("getTimelineFeed");
  });

  test("request-budget: useTimelineDay has no feed client and uses selected-day loaders", () => {
    const hook = readFileSync(join(root, "lib/features/timeline/useTimelineDay.ts"), "utf8");
    expect(hook).not.toContain("getTimelineFeed");
    expect(hook).not.toContain("while (");
    expect(hook).toContain("fetchTimelineDayEventsPages");
    expect(hook).toContain("fetchTimelineDayRawEventsPages");
    expect(hook).toContain("useSleepNight");
    expect(hook).toContain("useDailyFacts");
  });
});
