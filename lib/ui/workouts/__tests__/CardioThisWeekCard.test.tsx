import React from "react";
import renderer, { act } from "react-test-renderer";

import { CardioThisWeekCard, type CardioThisWeekSessionRow } from "../CardioThisWeekCard";

const sampleRow: CardioThisWeekSessionRow = {
  dayKey: "2026-05-26",
  sessionId: "sess-1",
  displayTitle: "Indoor Run",
  metadataLine: "3.13 mi · 35 min",
  rowAccessibilityLabel: "Open cardio session details Indoor Run",
  menuAccessibilityLabel: "Cardio session actions Indoor Run",
};

describe("CardioThisWeekCard", () => {
  it("renders the week navigator and a session row (no View All link)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioThisWeekCard
          loading={false}
          emptyMessage="No cardio sessions this week yet"
          sessions={[sampleRow]}
          onPressSession={() => undefined}
          onPressSessionMenu={() => undefined}
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
        />,
      );
    });
    // navigator chevrons
    expect(
      tree!.root.findAllByProps({ testID: "workouts-this-week-nav-previous" }).length,
    ).toBeGreaterThan(0);
    expect(
      tree!.root.findAllByProps({ testID: "workouts-this-week-nav-next" }).length,
    ).toBeGreaterThan(0);
    // week range label
    const label = tree!.root.findByProps({ testID: "workouts-this-week-range-label" });
    expect(label.props.children).toBe("May 24–30");
    // session row exists
    expect(
      tree!.root.findAllByProps({ testID: "workouts-overview-this-week-row-sess-1" }).length,
    ).toBeGreaterThan(0);
    // no "View All" link element
    const allText = JSON.stringify(tree!.toJSON());
    expect(allText).not.toContain("View All");
  });

  it("renders empty placeholder when no sessions", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioThisWeekCard
          loading={false}
          emptyMessage="No cardio sessions this week yet"
          sessions={[]}
          onPressSession={() => undefined}
          onPressSessionMenu={() => undefined}
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
        />,
      );
    });
    const allText = JSON.stringify(tree!.toJSON());
    expect(allText).toContain("No cardio sessions this week yet");
  });

  it("disables next chevron when canGoNext is false", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioThisWeekCard
          loading={false}
          emptyMessage="No cardio sessions this week yet"
          sessions={[sampleRow]}
          onPressSession={() => undefined}
          onPressSessionMenu={() => undefined}
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
        />,
      );
    });
    const next = tree!.root.findByProps({ testID: "workouts-this-week-nav-next" });
    expect(next.props.accessibilityState.disabled).toBe(true);
  });
});
