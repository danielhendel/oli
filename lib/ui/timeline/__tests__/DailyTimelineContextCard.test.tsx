import React from "react";
import renderer, { act } from "react-test-renderer";
import { DailyTimelineContextCard } from "@/lib/ui/timeline/DailyTimelineContextCard";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import type { TimelineDayContextRow } from "@/lib/features/timeline/types";

const rows: TimelineDayContextRow[] = [
  {
    kind: "sleep",
    title: "Sleep",
    valueLabel: "Score 84 · 7h 30m",
    availability: "available",
    accessibilityLabel: "Sleep, Score 84 · 7h 30m",
    href: "/(app)/recovery/sleep?day=2026-07-16",
    icon: "moon-outline",
  },
  {
    kind: "recovery",
    title: "Recovery",
    availability: "unavailable",
    accessibilityLabel: "Recovery, unavailable",
    href: "/(app)/recovery/readiness",
    icon: "heart-outline",
  },
  {
    kind: "activity",
    title: "Activity",
    valueLabel: "0 steps",
    availability: "available",
    accessibilityLabel: "Activity, 0 steps",
    href: "/(app)/activity/day/2026-07-16",
    icon: "walk-outline",
  },
];

describe("DailyTimelineContextCard", () => {
  it("renders three compact context rows with chevrons only when navigable", () => {
    let tree!: renderer.ReactTestRenderer;
    const onPress = jest.fn();
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode="dark">
          <DailyTimelineContextCard rows={rows} onPressRow={onPress} />
        </OliThemeProvider>,
      );
    });
    expect(tree.root.findByProps({ testID: "timeline-daily-context-card" })).toBeTruthy();
    const sleep = tree.root.findByProps({ testID: "timeline-context-sleep" });
    expect(sleep.props.accessibilityRole).toBe("button");
    expect(sleep.props.accessibilityLabel).toContain("Sleep");
    const recovery = tree.root.findByProps({ testID: "timeline-context-recovery" });
    expect(recovery.props.accessibilityRole).toBe("button");
    // Unavailable still navigable when href present — chevron on actionable
    expect(tree.root.findAll((n) => n.props?.name === "chevron-forward").length).toBe(3);
    act(() => {
      tree.unmount();
    });
  });

  it("keeps minHeight 44 for touch targets", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "DailyTimelineContextCard.tsx"),
      "utf8",
    );
    expect(src).toContain("minHeight: 44");
    expect(src).toContain("accessibilityRole");
  });
});
