// lib/ui/timeline/__tests__/TimelineFeedList.railParity.test.tsx
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import renderer, { act } from "react-test-renderer";
import type { TimelinePresentationItem } from "@oli/contracts";
import { TimelineFeedList } from "@/lib/ui/timeline/TimelineFeedList";
import { TimelineRailRow } from "@/lib/ui/timeline/TimelineRailRow";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-07-16",
}));

function item(
  overrides: Partial<TimelinePresentationItem> &
    Pick<TimelinePresentationItem, "id" | "kind" | "day" | "occurredAt">,
): TimelinePresentationItem {
  return {
    timezone: "UTC",
    title: overrides.title ?? overrides.kind,
    status: "ready",
    source: "manual",
    destination: "/(app)/(tabs)/timeline/2026-07-16",
    accessibilityLabel: overrides.title ?? overrides.kind,
    dedupeKey: overrides.dedupeKey ?? overrides.id,
    isSynthetic: false,
    displayRole: overrides.displayRole ?? "chronological_event",
    ...overrides,
  };
}

describe("TimelineFeedList rail/card parity", () => {
  it("renders TimelineRailRow instead of plain divider rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineFeedList
            sections={[
              {
                day: "2026-07-16",
                data: [
                  item({
                    id: "sleep",
                    kind: "sleep_context",
                    day: "2026-07-16",
                    occurredAt: "2026-07-16T07:00:00.000Z",
                    displayRole: "day_context",
                    title: "Sleep",
                  }),
                  item({
                    id: "meal",
                    kind: "nutrition",
                    day: "2026-07-16",
                    occurredAt: "2026-07-16T12:00:00.000Z",
                    title: "Lunch",
                  }),
                ],
              },
            ]}
            onPressItem={jest.fn()}
            onStartReached={jest.fn()}
            loadingMore={false}
            refreshing={false}
            onRefresh={jest.fn()}
            contentBottomPadding={40}
            scrollTarget={{ id: 1, mode: "newest" }}
          />
        </OliThemeProvider>,
      );
    });

    const rows = tree.root.findAllByType(TimelineRailRow);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const context = rows.find((r) => r.props.title === "Sleep");
    expect(context?.props.timeLabel).toBe("");
    const meal = rows.find((r) => r.props.title === "Lunch");
    expect(meal?.props.timeLabel.length).toBeGreaterThan(0);
    act(() => {
      tree.unmount();
    });
  });

  it("source uses shared rail row and no hairline-only feed row", () => {
    const src = readFileSync(join(__dirname, "..", "TimelineFeedList.tsx"), "utf8");
    const rail = readFileSync(join(__dirname, "..", "TimelineRail.tsx"), "utf8");
    expect(src).toContain("TimelineRailRow");
    expect(src).toContain("timelinePresentationIcon");
    expect(src).not.toContain("borderBottomWidth: StyleSheet.hairlineWidth");
    expect(rail).toContain("TimelineRailRow");
    expect(src).toContain("onStartReached");
    expect(src).toContain("stickySectionHeadersEnabled={false}");
    expect(src).toContain("contentBottomPadding");
    expect(src).toContain("scrollTarget");
  });
});
