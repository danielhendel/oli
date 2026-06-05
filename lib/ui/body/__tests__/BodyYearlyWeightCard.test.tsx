import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyYearlyWeightCard } from "@/lib/ui/body/BodyYearlyWeightCard";
import { buildBodyYearlyWeightCardModel } from "@/lib/data/body/bodyYearlyWeightCardModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

function s(dayKey: string, weightKg: number): BodyWeightSample {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

const MODEL = buildBodyYearlyWeightCardModel({
  selectedYear: 2026,
  todayDayKey: "2026-03-31",
  unit: "lb",
  samples: [s("2026-01-15", 79), s("2026-02-10", 80), s("2026-03-25", 82)],
});

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x): x is string => typeof x === "string")
    .join(" ");
}

describe("BodyYearlyWeightCard", () => {
  it("renders the year title, navigation cluster, and the line chart", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyYearlyWeightCard
          loading={false}
          model={MODEL}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const text = collectText(tree);
    expect(text).toContain("2026 Weight");
    expect(tree.root.findByProps({ testID: "body-yearly-nav" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-yearly-range-label" }).props.children).toBe("2026");
    expect(tree.root.findByProps({ testID: "body-yearly-line-chart" })).toBeDefined();
    expect(text).not.toMatch(/Optimal|Out of range/);
  });

  it("disables Next on the current year and invokes prev on press", async () => {
    const onPrev = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyYearlyWeightCard
          loading={false}
          model={MODEL}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={onPrev}
          onPressNext={jest.fn()}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "body-yearly-nav-next" }).props.disabled).toBe(true);
    await act(async () => {
      tree.root.findByProps({ testID: "body-yearly-nav-previous" }).props.onPress();
    });
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state for a year with no readings", async () => {
    const empty = buildBodyYearlyWeightCardModel({
      selectedYear: 2024,
      todayDayKey: "2026-03-31",
      unit: "lb",
      samples: [],
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyYearlyWeightCard loading={false} model={empty} canGoPrevious canGoNext onPressPrevious={jest.fn()} onPressNext={jest.fn()} />,
      );
    });
    expect(tree.root.findByProps({ testID: "body-yearly-empty-state" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-yearly-line-chart" })).toHaveLength(0);
  });
});
