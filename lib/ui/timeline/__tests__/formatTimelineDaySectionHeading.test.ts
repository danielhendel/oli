import { formatTimelineDaySectionHeading } from "@/lib/ui/timeline/formatTimelineDaySectionHeading";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";

describe("formatTimelineDaySectionHeading", () => {
  const today = "2026-07-16";
  const locale = "en-US";

  it("formats Today as one visible line with year", () => {
    const heading = formatTimelineDaySectionHeading({
      dayKey: today,
      todayDayKey: today,
      locale,
    });
    expect(heading.visibleLabel).toBe("Today July 16, 2026");
    expect(heading.accessibilityLabel).toBe("Today, July 16, 2026");
    expect(heading.visibleLabel).toMatch(/2026/);
    expect(heading).not.toHaveProperty("relativeLabel");
    expect(heading).not.toHaveProperty("absoluteDateLabel");
  });

  it("formats historical days as abbreviated weekday + Month D, YYYY (not Yesterday)", () => {
    const yesterday = addCalendarDaysToDayKey(today, -1);
    expect(yesterday).toBe("2026-07-15");
    const heading = formatTimelineDaySectionHeading({
      dayKey: yesterday,
      todayDayKey: today,
      locale,
    });
    expect(heading.visibleLabel).toBe("Wed July 15, 2026");
    expect(heading.accessibilityLabel).toBe("Wednesday, July 15, 2026");
    expect(heading.visibleLabel).not.toMatch(/Yesterday/i);
    expect(heading.visibleLabel).not.toMatch(/Wednesday/);
  });

  it.each([
    ["2026-07-12", "Sun July 12, 2026", "Sunday, July 12, 2026"],
    ["2026-07-13", "Mon July 13, 2026", "Monday, July 13, 2026"],
    ["2026-07-14", "Tue July 14, 2026", "Tuesday, July 14, 2026"],
    ["2026-07-15", "Wed July 15, 2026", "Wednesday, July 15, 2026"],
    ["2026-07-16", "Thu July 16, 2026", "Thursday, July 16, 2026"],
    ["2026-07-17", "Fri July 17, 2026", "Friday, July 17, 2026"],
    ["2026-07-18", "Sat July 18, 2026", "Saturday, July 18, 2026"],
  ] as const)("formats %s as %s", (day, visible, a11y) => {
    // Force historical by anchoring "today" after the sample week.
    const heading = formatTimelineDaySectionHeading({
      dayKey: day,
      todayDayKey: "2026-07-20",
      locale,
    });
    expect(heading.visibleLabel).toBe(visible);
    expect(heading.accessibilityLabel).toBe(a11y);
  });

  it("preserves day keys across UTC-negative and UTC-positive noon anchors", () => {
    const west = formatTimelineDaySectionHeading({
      dayKey: "2026-01-01",
      todayDayKey: "2026-07-16",
      locale,
    });
    const east = formatTimelineDaySectionHeading({
      dayKey: "2026-12-31",
      todayDayKey: "2026-07-16",
      locale,
    });
    expect(west.visibleLabel).toBe("Thu January 1, 2026");
    expect(east.visibleLabel).toBe("Thu December 31, 2026");
  });

  it("preserves DST-boundary day keys without shifting the label", () => {
    const spring = formatTimelineDaySectionHeading({
      dayKey: "2026-03-08",
      todayDayKey: "2026-07-16",
      locale,
    });
    const fall = formatTimelineDaySectionHeading({
      dayKey: "2026-11-01",
      todayDayKey: "2026-07-16",
      locale,
    });
    expect(spring.visibleLabel).toBe("Sun March 8, 2026");
    expect(fall.visibleLabel).toBe("Sun November 1, 2026");
  });

  it("does not use bare new Date(dayKey) and rejects malformed keys safely", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "formatTimelineDaySectionHeading.ts"),
      "utf8",
    );
    expect(src.includes("new Date(dayKey)")).toBe(false);
    expect(src).toContain("T12:00:00.000Z");
    const bad = formatTimelineDaySectionHeading({
      dayKey: "not-a-day",
      todayDayKey: today,
      locale,
    });
    expect(bad.visibleLabel).toBe("not-a-day");
    expect(bad.accessibilityLabel).toBe("not-a-day");
  });
});
