import React from "react";
import renderer, { act } from "react-test-renderer";

import type { CardioWeeklyMetricCardModel } from "@/lib/data/workouts/cardioWeeklyMetricCardModel";
import { formatCardioWeeklyDistanceBarLabel } from "@/lib/data/workouts/cardioWeeklyMetricCardModel";
import { CardioWeeklyMetricCard } from "../CardioWeeklyMetricCard";

const model: CardioWeeklyMetricCardModel = {
  totalLabel: "9.5 mi total",
  totalNumeric: 9.5,
  isEmpty: false,
  chartPoints: [
    { dayKey: "2026-05-24", displayLabel: "S", value: 0, isFutureDay: false },
    { dayKey: "2026-05-25", displayLabel: "M", value: 3, isFutureDay: false },
    { dayKey: "2026-05-26", displayLabel: "T", value: 6.5, isFutureDay: false },
    { dayKey: "2026-05-27", displayLabel: "W", value: 0, isFutureDay: true },
    { dayKey: "2026-05-28", displayLabel: "T", value: 0, isFutureDay: true },
    { dayKey: "2026-05-29", displayLabel: "F", value: 0, isFutureDay: true },
    { dayKey: "2026-05-30", displayLabel: "S", value: 0, isFutureDay: true },
  ],
  chartMaxScale: 7,
};

describe("CardioWeeklyMetricCard", () => {
  it("renders title, total figure, and bar chart when model present", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioWeeklyMetricCard
          title="Weekly Distance"
          loading={false}
          model={model}
          unit="mi"
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
          todayDayKey="2026-05-26"
          formatBarLabel={formatCardioWeeklyDistanceBarLabel}
          emptyPlaceholder="No cardio this week yet"
          testIDRoot="cardio-weekly-distance"
        />,
      );
    });
    const totalValue = tree!.root.findByProps({ testID: "cardio-weekly-distance-total-value" });
    expect(String(totalValue.props.children)).toBe("9.5 mi");
    expect(tree!.root.findAllByProps({ testID: "cardio-weekly-distance-chart-plot" }).length).toBeGreaterThan(0);
    expect(tree!.root.findAllByProps({ testID: "cardio-weekly-distance-empty" }).length).toBe(0);
  });

  it("renders empty placeholder when model.isEmpty", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioWeeklyMetricCard
          title="Weekly Distance"
          loading={false}
          model={{ ...model, isEmpty: true, totalNumeric: 0, totalLabel: "0.0 mi total" }}
          unit="mi"
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
          todayDayKey="2026-05-26"
          formatBarLabel={formatCardioWeeklyDistanceBarLabel}
          emptyPlaceholder="No cardio this week yet"
          testIDRoot="cardio-weekly-distance"
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "cardio-weekly-distance-empty" }).props.children).toBe(
      "No cardio this week yet",
    );
  });

  it("disables next chevron when canGoNext is false", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioWeeklyMetricCard
          title="Weekly Distance"
          loading={false}
          model={model}
          unit="mi"
          weekRangeLabel="May 24–30"
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
          todayDayKey="2026-05-26"
          formatBarLabel={formatCardioWeeklyDistanceBarLabel}
          emptyPlaceholder="No cardio this week yet"
          testIDRoot="cardio-weekly-distance"
        />,
      );
    });
    const next = tree!.root.findByProps({ testID: "cardio-weekly-distance-nav-next" });
    expect(next.props.accessibilityState.disabled).toBe(true);
  });
});
