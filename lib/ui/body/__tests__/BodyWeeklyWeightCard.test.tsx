import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyWeeklyWeightCard } from "@/lib/ui/body/BodyWeeklyWeightCard";
import type { BodyWeeklyWeightCardModel } from "@/lib/data/body/bodyWeeklyWeightCardModel";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

const WEEK = [
  "2026-03-29",
  "2026-03-30",
  "2026-03-31",
  "2026-04-01",
  "2026-04-02",
  "2026-04-03",
  "2026-04-04",
] as const;
const LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const MODEL: BodyWeeklyWeightCardModel = {
  chartPoints: WEEK.map((dayKey, i) => ({
    dayKey,
    displayLabel: LABELS[i]!,
    weightKg: i === 0 ? 78 : i === 2 ? 80 : null,
    isFutureDay: i >= 3,
  })),
  weeklyAverageKg: 79,
  weeklyAverageMetricValue: "174.2",
  measuredDayCount: 2,
  isEmpty: false,
};

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x): x is string => typeof x === "string")
    .join(" ");
}

describe("BodyWeeklyWeightCard", () => {
  it("renders the title, weekly average, range label, and the line chart with day labels", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyWeeklyWeightCard
          loading={false}
          unit="lb"
          model={MODEL}
          weekRangeLabel={"Mar 29\u2013Apr 4"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const text = collectText(tree);
    expect(text).toContain("This Week's Weight");
    expect(text).toContain("174.2");
    expect(text).toContain("Mar 29\u2013Apr 4");
    expect(tree.root.findByProps({ testID: "body-this-week-line-chart" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-this-week-line-chart-labels" })).toBeDefined();
    for (const letter of LABELS) {
      expect(text).toContain(letter);
    }
    // no range/status pills
    expect(text).not.toMatch(/Optimal|Out of range/);
  });

  it("disables Next on the current week and enables both on a historical week", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyWeeklyWeightCard
          loading={false}
          unit="lb"
          model={MODEL}
          weekRangeLabel={"Mar 29\u2013Apr 4"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "body-this-week-nav-next" }).props.disabled).toBe(true);
    expect(tree.root.findByProps({ testID: "body-this-week-nav-previous" }).props.disabled).toBe(false);
  });

  it("invokes prev/next callbacks when chevrons are pressed", async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyWeeklyWeightCard
          loading={false}
          unit="lb"
          model={MODEL}
          weekRangeLabel={"Mar 22\u201328"}
          canGoPrevious
          canGoNext
          onPressPrevious={onPrev}
          onPressNext={onNext}
        />,
      );
    });
    await act(async () => {
      tree.root.findByProps({ testID: "body-this-week-nav-next" }).props.onPress();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "body-this-week-nav-previous" }).props.onPress();
    });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when there are no readings this week", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyWeeklyWeightCard
          loading={false}
          unit="lb"
          model={{
            chartPoints: WEEK.map((dayKey, i) => ({
              dayKey,
              displayLabel: LABELS[i]!,
              weightKg: null,
              isFutureDay: i >= 3,
            })),
            weeklyAverageKg: null,
            weeklyAverageMetricValue: null,
            measuredDayCount: 0,
            isEmpty: true,
          }}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "body-this-week-empty-state" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-this-week-line-chart" })).toHaveLength(0);
  });
});
