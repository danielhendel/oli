import React from "react";
import renderer, { act } from "react-test-renderer";
import { buildWorkoutOverviewAnalyticsFromCalendarDays } from "@/lib/data/workouts/workoutsCalendarModel";
import { buildStrengthMonthOverviewFromCalendarDays } from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import { WorkoutAnalyticsChart } from "@/lib/ui/workouts/WorkoutAnalyticsChart";

const sampleMetrics = {
  strength: { totalWorkouts: 6, avgPerMonth: 0.5, avgPerWeek: 0.1, avgDurationMinutes: 50 },
  cardio: { totalWorkouts: 4, avgPerMonth: 0.3, avgPerWeek: 0.08, avgDurationMinutes: 35 },
} as const;

describe("Workout analytics cards", () => {
  it("combined card: Strength / Cardio tabs sync chart selection and metrics", () => {
    const { chartPointsByTab, metricsByTab } = buildWorkoutOverviewAnalyticsFromCalendarDays([]);
    const onViewMore = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WorkoutAnalyticsChart
          layout="dual"
          headerTitle="2026"
          onViewMore={onViewMore}
          chartPointsByTab={chartPointsByTab}
          metricsByTab={{ ...metricsByTab, ...sampleMetrics }}
        />,
      );
    });
    const strengthTab = tree.root.findByProps({ accessibilityLabel: "Strength chart tab" });
    const cardioTab = tree.root.findByProps({ accessibilityLabel: "Cardio chart tab" });
    expect(strengthTab.props.accessibilityState.selected).toBe(true);
    expect(cardioTab.props.accessibilityState.selected).toBe(false);
    expect(JSON.stringify(tree.toJSON())).toContain("6");

    act(() => {
      cardioTab.props.onPress();
    });
    expect(strengthTab.props.accessibilityState.selected).toBe(false);
    expect(cardioTab.props.accessibilityState.selected).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain("Total Workouts");
    expect(JSON.stringify(tree.toJSON())).toContain("4");
  });

  it("strength period card: year and month tabs switch metrics", () => {
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays([]);
    const monthBundle = buildStrengthMonthOverviewFromCalendarDays([], "2026-03", {
      todayDayKey: "2026-03-15",
    });
    const onViewMore = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WorkoutAnalyticsChart
          layout="singleStrengthPeriod"
          headerTitle="Workouts"
          yearTabLabel="2026"
          monthTabLabel="Mar"
          onViewMore={onViewMore}
          yearChartPoints={bundle.chartPointsByTab.strength}
          yearMetrics={sampleMetrics.strength}
          monthChartBars={monthBundle.chartBars}
          monthMetrics={monthBundle.metrics}
        />,
      );
    });
    const jsonYear = JSON.stringify(tree.toJSON());
    expect(jsonYear).toContain("Workouts");
    expect(jsonYear).toContain("Avg per Month");

    const monthTab = tree.root.findByProps({ accessibilityLabel: "Month Mar chart tab" });
    act(() => {
      monthTab.props.onPress();
    });
    const jsonMonth = JSON.stringify(tree.toJSON());
    expect(jsonMonth).toContain("Typical Volume");
    expect(jsonMonth).not.toContain("Avg per Month");
  });
});
