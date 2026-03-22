import React from "react";
import renderer, { act } from "react-test-renderer";
import { buildWorkoutOverviewAnalyticsFromCalendarDays } from "@/lib/data/workouts/workoutsCalendarModel";
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
});
