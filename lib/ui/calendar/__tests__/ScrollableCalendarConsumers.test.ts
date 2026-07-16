import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..");

function source(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("canonical scrollable calendar consumers", () => {
  it.each([
    [
      "Timeline",
      "lib/ui/timeline/TimelineCalendarSheet.tsx",
      "timeline-scrollable-calendar",
    ],
    [
      "Sleep",
      "app/(app)/recovery/sleep/calendar.tsx",
      "sleep-scrollable-calendar",
    ],
    [
      "Workouts",
      "app/(app)/workouts/calendar.tsx",
      "workouts-scrollable-calendar",
    ],
    [
      "Activity",
      "app/(app)/activity/calendar.tsx",
      "activity-scrollable-calendar",
    ],
  ])("%s uses the shared ScrollableMonthCalendar", (_surface, path, testID) => {
    const text = source(path);
    expect(text).toContain("ScrollableMonthCalendar");
    expect(text).toContain(testID);
    expect(text).toContain("buildCanonicalScrollableMonths");
  });

  it("Timeline keeps future dates disabled without changing Sleep/Workout/Activity bounds", () => {
    const timeline = source("lib/ui/timeline/TimelineCalendarSheet.tsx");
    const sleep = source("app/(app)/recovery/sleep/calendar.tsx");
    const workouts = source("app/(app)/workouts/calendar.tsx");
    const activity = source("app/(app)/activity/calendar.tsx");
    expect(timeline).toContain("maxDay={today}");
    expect(sleep).not.toContain("maxDay=");
    expect(workouts).not.toContain("maxDay=");
    expect(activity).not.toContain("maxDay=");
  });

  it("Timeline remounts on open so selected-month initialScrollIndex re-applies", () => {
    const timeline = source("lib/ui/timeline/TimelineCalendarSheet.tsx");
    expect(timeline).toContain("remountKey=");
    expect(timeline).toContain("{visible ? (");
  });

  it("Timeline does not truncate visible months with the selectable max day", () => {
    const timeline = source("lib/ui/timeline/TimelineCalendarSheet.tsx");
    expect(timeline).not.toMatch(/if \(key > todayKey\)/);
    expect(timeline).toContain("buildTimelineCalendarMonths(todayMonth)");
  });
});
