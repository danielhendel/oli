import React from "react";
import renderer, { act } from "react-test-renderer";
import type { TimelinePresentationItem } from "@oli/contracts";
import { TimelineFeedList } from "@/lib/ui/timeline/TimelineFeedList";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { formatTimelineDaySectionHeading } from "@/lib/ui/timeline/formatTimelineDaySectionHeading";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-07-16",
}));

function item(day: string, id: string): TimelinePresentationItem {
  return {
    id,
    kind: "nutrition",
    day,
    occurredAt: `${day}T12:00:00.000Z`,
    timezone: "UTC",
    title: `Meal ${id}`,
    status: "ready",
    source: "manual",
    destination: `/(app)/nutrition/day/${day}`,
    accessibilityLabel: `Meal ${id}`,
    dedupeKey: `nutrition:${id}`,
    isSynthetic: false,
    displayRole: "chronological_event",
  };
}

describe("TimelineFeedList day section headers", () => {
  it("enables sticky section headers and uses one header component per day", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineFeedList
            sections={[
              { day: "2026-07-16", data: [item("2026-07-16", "a")] },
              { day: "2026-07-15", data: [item("2026-07-15", "b")] },
              { day: "2026-07-14", data: [] },
            ]}
            onPressItem={jest.fn()}
            onEndReached={jest.fn()}
            loadingMore={false}
            refreshing={false}
            onRefresh={jest.fn()}
            contentBottomPadding={40}
          />
        </OliThemeProvider>,
      );
    });

    const sectionList = tree.root.find(
      (n) => n.props?.stickySectionHeadersEnabled === true,
    );
    expect(sectionList.props.stickySectionHeadersEnabled).toBe(true);
    expect(typeof sectionList.props.renderSectionHeader).toBe("function");
    expect(sectionList.props.sections).toHaveLength(3);
    expect(sectionList.props.sections.map((s: { day: string }) => s.day)).toEqual([
      "2026-07-16",
      "2026-07-15",
      "2026-07-14",
    ]);
    // Section data contains events only — no duplicate date rows.
    for (const section of sectionList.props.sections as {
      day: string;
      data: TimelinePresentationItem[];
    }[]) {
      expect(section.data.every((row) => row.day === section.day)).toBe(true);
      expect(section.data.every((row) => row.kind != null)).toBe(true);
    }
  });

  it("formats Today / abbreviated weekday headings for feed section days", () => {
    expect(
      formatTimelineDaySectionHeading({
        dayKey: "2026-07-16",
        todayDayKey: "2026-07-16",
        locale: "en-US",
      }).visibleLabel,
    ).toBe("Today July 16, 2026");
    expect(
      formatTimelineDaySectionHeading({
        dayKey: "2026-07-15",
        todayDayKey: "2026-07-16",
        locale: "en-US",
      }).visibleLabel,
    ).toBe("Wed July 15, 2026");
    expect(
      formatTimelineDaySectionHeading({
        dayKey: "2026-07-14",
        todayDayKey: "2026-07-16",
        locale: "en-US",
      }).accessibilityLabel,
    ).toBe("Tuesday, July 14, 2026");

    let headerTree!: renderer.ReactTestRenderer;
    act(() => {
      headerTree = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineDaySectionHeader
            dayKey="2026-07-14"
            todayDayKey="2026-07-16"
            sticky
            testID="timeline-feed-section-header-2026-07-14"
          />
        </OliThemeProvider>,
      );
    });
    expect(
      headerTree.root.find(
        (n) =>
          n.props?.testID === "timeline-feed-section-header-2026-07-14" &&
          n.props?.accessibilityRole === "header",
      ).props.accessibilityLabel,
    ).toBe("Tuesday, July 14, 2026");
  });

  it("uses TimelineDaySectionHeader from source and keeps sticky headers enabled", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "TimelineFeedList.tsx"),
      "utf8",
    );
    expect(src).toContain("TimelineDaySectionHeader");
    expect(src).toContain("stickySectionHeadersEnabled");
    expect(src).toContain("renderSectionHeader");
    expect(src).not.toContain("formatSectionLabel");
  });
});
