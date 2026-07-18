/**
 * Deterministic scroll-intent wiring on TimelineFeedList (no device layout).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import type { TimelinePresentationItem } from "@oli/contracts";
import { TimelineFeedList } from "@/lib/ui/timeline/TimelineFeedList";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import { MAX_FEED_SCROLL_RETRIES } from "@/lib/features/timeline/timelineFeedScrollIntent";

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

const sections = [
  { day: "2026-07-14", data: [item("2026-07-14", "a")] },
  { day: "2026-07-15", data: [item("2026-07-15", "b")] },
  { day: "2026-07-16", data: [item("2026-07-16", "c"), item("2026-07-16", "d")] },
];

describe("TimelineFeedList scroll positioning", () => {
  it("exposes bounded scroll retry contract and content-size handler", () => {
    expect(MAX_FEED_SCROLL_RETRIES).toBe(8);

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineFeedList
            sections={sections}
            onPressItem={jest.fn()}
            onStartReached={jest.fn()}
            loadingMore={false}
            refreshing={false}
            onRefresh={jest.fn()}
            contentBottomPadding={48}
            scrollTarget={{ id: 1, mode: "newest" }}
          />
        </OliThemeProvider>,
      );
    });

    const list = tree.root.find(
      (n) => n.props?.stickySectionHeadersEnabled === false,
    );
    expect(typeof list.props.onContentSizeChange).toBe("function");
    expect(typeof list.props.onScrollToIndexFailed).toBe("function");
    expect(typeof list.props.onScrollBeginDrag).toBe("function");
    expect(list.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 48 }),
    );
    act(() => {
      tree.unmount();
    });
  });

  it("does not render a separate fixed active-day header beside the list", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "TimelineFeedList.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/activeDay|pinnedDay|stickyDate|headerDateLabel/);
    expect(src).toContain("stickySectionHeadersEnabled={false}");
  });
});
