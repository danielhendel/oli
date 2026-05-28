import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildCardioYearlyCardModel } from "@/lib/data/workouts/cardioYearlyCardModel";
import type { DayKey } from "@/lib/ui/calendar/types";

import { CardioYearlyCard } from "../CardioYearlyCard";

const TODAY = "2026-05-26" as DayKey;

describe("CardioYearlyCard", () => {
  it("renders title, year nav, and hero figure for the current year", async () => {
    const model = buildCardioYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      monthlyMiles: { "2026-01": 5, "2026-02": 10, "2026-05": 7.5 },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioYearlyCard
          loading={false}
          model={model}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
        />,
      );
    });
    expect(tree!.root.findByProps({ testID: "cardio-yearly-title" }).props.children).toBe(
      "2026 Cardio",
    );
    expect(tree!.root.findByProps({ testID: "cardio-yearly-range-label" }).props.children).toBe(
      "2026",
    );
    expect(
      tree!.root.findByProps({ testID: "cardio-yearly-total-metric-value" }).props.children,
    ).toBe("22.5");
    // next disabled because current year
    expect(
      tree!.root.findByProps({ testID: "cardio-yearly-nav-next" }).props.accessibilityState.disabled,
    ).toBe(true);
    // chart mounted
    expect(tree!.root.findAllByProps({ testID: "cardio-yearly-month-labels" }).length).toBeGreaterThan(0);
  });

  it("renders prior-year placeholder when model is empty + placeholder copy provided", async () => {
    const model = buildCardioYearlyCardModel({
      selectedYear: 2025,
      todayDayKey: TODAY,
      monthlyMiles: {},
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioYearlyCard
          loading={false}
          model={model}
          canGoPrevious
          canGoNext
          onPressPrevious={() => undefined}
          onPressNext={() => undefined}
          priorYearPlaceholder="Yearly cardio history is coming soon"
        />,
      );
    });
    const empty = tree!.root.findByProps({ testID: "cardio-yearly-empty-state" });
    expect(empty.props.children).toBe("Yearly cardio history is coming soon");
    expect(tree!.root.findAllByProps({ testID: "cardio-yearly-chart-plot" })).toHaveLength(0);
  });
});
