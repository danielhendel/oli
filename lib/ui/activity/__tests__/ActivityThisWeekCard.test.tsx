import React from "react";
import renderer, { act } from "react-test-renderer";

import type { ActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import {
  ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT,
  ActivityThisWeekCard,
} from "@/lib/ui/activity/ActivityThisWeekCard";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import { ActivityWeeklyStepsBars } from "@/lib/ui/activity/ActivityWeeklyStepsBars";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

const WEEK = [
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-05-07",
  "2026-05-08",
  "2026-05-09",
] as const;

const MODEL: ActivityThisWeekCardModel = {
  compactValuePrimary: "8,000 steps/day",
  ratingLabel: "High",
  activityTierIndexForBar: 3,
  fillWidth01Override: 0.5,
  isEmpty: false,
  chartMaxScale: 10_000,
  baselineMeanStepsPerDay: 5000,
  weeklyAverageMetricValue: "8,000",
  chartPoints: WEEK.map((dayKey, i) => ({
    dayKey,
    displayLabel: ["S", "M", "T", "W", "T", "F", "S"][i] ?? "—",
    value: dayKey === "2026-05-05" ? 12_345 : 0,
    isFutureDay: false,
  })),
};

describe("ActivityThisWeekCard", () => {
  it("shows the prominent average metric, qualifier copy, taller chart, and no rating pill", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityThisWeekCard loading={false} model={MODEL} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("This Week's Activity");
    expect(json).toContain('"8,000"');
    expect(json).toContain("avg steps per day");
    expect(json).not.toContain("avg steps/day");
    expect(json).not.toContain('"This Week"');
    expect(json).not.toContain("activity-this-week-rating-pill");
    expect(json).toContain("activity-this-week-average-steps");
    expect(json).toContain("activity-this-week-average-metric-value");
    expect(json).toContain("activity-this-week-weekly-chart");
    expect(json).toContain("activity-this-week-chart-plot");
    for (const letter of ["S", "M", "T", "W", "T", "F", "S"]) {
      expect(json).toContain(`"${letter}"`);
    }
    const valueText = tree.root.findByProps({
      testID: "activity-this-week-average-metric-value",
    });
    expect(valueText.props.style).toMatchObject(ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE);
    const qualifierNodes = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        typeof n.props.children === "string" &&
        n.props.children === "avg steps per day",
    );
    expect(qualifierNodes.length).toBeGreaterThanOrEqual(1);
    expect(qualifierNodes[0]!.props.style).toMatchObject(ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE);
    const bars = tree.root.findByType(ActivityWeeklyStepsBars);
    expect(bars.props.barTrackHeight).toBe(ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT);
  });

  it("does not render the legacy View All link", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityThisWeekCard loading={false} model={MODEL} />);
    });
    expect(tree.root.findAllByProps({ testID: "activity-this-week-view-all" })).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("View All");
  });

  it("hides the week navigation cluster when no weekRangeLabel is supplied", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityThisWeekCard loading={false} model={MODEL} />);
    });
    expect(tree.root.findAllByProps({ testID: "activity-this-week-nav" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "activity-this-week-range-label" })).toHaveLength(0);
  });

  it("renders the week range label and both navigation buttons when weekRangeLabel is supplied", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityThisWeekCard
          loading={false}
          model={MODEL}
          weekRangeLabel={"May 3\u20139"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("May 3\u20139");
    const prev = tree.root.findByProps({ testID: "activity-this-week-nav-previous" });
    const next = tree.root.findByProps({ testID: "activity-this-week-nav-next" });
    expect(prev.props.accessibilityLabel).toBe("Previous week");
    expect(prev.props.accessibilityRole).toBe("button");
    expect(next.props.accessibilityLabel).toBe("Next week");
    expect(next.props.accessibilityRole).toBe("button");
  });

  it("disables Next on the current week (canGoNext={false})", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityThisWeekCard
          loading={false}
          model={MODEL}
          weekRangeLabel={"May 3\u20139"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "activity-this-week-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("invokes prev/next callbacks when chevrons are pressed on a historical week", async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityThisWeekCard
          loading={false}
          model={MODEL}
          weekRangeLabel={"Apr 26\u2013May 2"}
          canGoPrevious
          canGoNext
          onPressPrevious={onPrevious}
          onPressNext={onNext}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "activity-this-week-nav-next" });
    expect(next.props.disabled).toBe(false);
    await act(async () => {
      next.props.onPress?.();
    });
    expect(onNext).toHaveBeenCalledTimes(1);
    const prev = tree.root.findByProps({ testID: "activity-this-week-nav-previous" });
    await act(async () => {
      prev.props.onPress?.();
    });
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("treats missing onPress callbacks as disabled even when canGo* are true", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityThisWeekCard
          loading={false}
          model={MODEL}
          weekRangeLabel={"May 3\u20139"}
          canGoPrevious
          canGoNext
        />,
      );
    });
    expect(
      tree.root.findByProps({ testID: "activity-this-week-nav-previous" }).props.disabled,
    ).toBe(true);
    expect(tree.root.findByProps({ testID: "activity-this-week-nav-next" }).props.disabled).toBe(
      true,
    );
  });
});
