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
  it("shows prominent average metric, qualifier copy, taller chart, no rating pill, View All unchanged", async () => {
    const onViewAll = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityThisWeekCard loading={false} model={MODEL} onPressViewAll={onViewAll} />);
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
    const valueText = tree.root.findByProps({ testID: "activity-this-week-average-metric-value" });
    expect(valueText.props.style).toMatchObject(ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE);
    const qualifierNodes = tree.root.findAll(
      (n) => n.type === "Text" && typeof n.props.children === "string" && n.props.children === "avg steps per day",
    );
    expect(qualifierNodes.length).toBeGreaterThanOrEqual(1);
    expect(qualifierNodes[0]!.props.style).toMatchObject(ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE);
    const bars = tree.root.findByType(ActivityWeeklyStepsBars);
    expect(bars.props.barTrackHeight).toBe(ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT);
    const viewAll = tree.root.findByProps({ testID: "activity-this-week-view-all" });
    await act(async () => {
      viewAll.props.onPress();
    });
    expect(onViewAll).toHaveBeenCalled();
  });
});
