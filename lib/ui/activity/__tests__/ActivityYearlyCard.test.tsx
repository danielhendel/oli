import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  ACTIVITY_YEARLY_MONTH_LETTERS,
  type ActivityYearlyCardModel,
} from "@/lib/data/activity/activityYearlyCardModel";
import { ActivityYearlyCard } from "@/lib/ui/activity/ActivityYearlyCard";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

function makeModel(overrides: Partial<ActivityYearlyCardModel> = {}): ActivityYearlyCardModel {
  const months = ACTIVITY_YEARLY_MONTH_LETTERS.map((label, monthIndex) => ({
    monthIndex,
    monthKey: `2026-${String(monthIndex + 1).padStart(2, "0")}`,
    label,
    averageSteps: monthIndex <= 4 ? 5000 + monthIndex * 500 : null,
    numericDayCount: monthIndex <= 4 ? 25 : 0,
    isFutureMonth: monthIndex > 4,
    isCurrentMonth: monthIndex === 4,
  }));
  return {
    year: 2026,
    title: "2026 Activity",
    rangeLabel: "2026",
    isCurrentYear: true,
    hasData: true,
    averageStepsPerDay: 6000,
    averageDisplay: "6,000",
    averageQualifier: "avg steps per day",
    months,
    chartMaxScale: 7500,
    todayMonthKey: "2026-05",
    isEmpty: false,
    ...overrides,
  };
}

describe("ActivityYearlyCard", () => {
  it("renders the title, range label, hero metric, and 12 month-letter labels", async () => {
    const model = makeModel();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityYearlyCard
          loading={false}
          model={model}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("2026 Activity");
    expect(json).toContain("activity-yearly-range-label");
    expect(json).toContain("activity-yearly-month-chart");
    expect(json).toContain("activity-yearly-month-labels");
    expect(json).toContain("activity-yearly-average-steps");
    expect(json).toContain("activity-yearly-average-metric-value");

    const value = tree.root.findByProps({ testID: "activity-yearly-average-metric-value" });
    expect(value.props.children).toBe("6,000");
    expect(value.props.style).toMatchObject(ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE);

    const qualifierNodes = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        typeof n.props.children === "string" &&
        n.props.children === "avg steps per day",
    );
    expect(qualifierNodes.length).toBeGreaterThanOrEqual(1);
    expect(qualifierNodes[0]!.props.style).toMatchObject(ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE);

    const rendered = [...ACTIVITY_YEARLY_MONTH_LETTERS].map(
      (letter) => (json.match(new RegExp(`"${letter}"`, "g")) ?? []).length,
    );
    rendered.forEach((n) => expect(n).toBeGreaterThan(0));
  });

  it("disables Next when canGoNext is false (current year)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityYearlyCard
          loading={false}
          model={makeModel()}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "activity-yearly-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("invokes prev/next handlers when enabled", async () => {
    const onPressPrevious = jest.fn();
    const onPressNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityYearlyCard
          loading={false}
          model={makeModel({ rangeLabel: "2024", title: "2024 Activity", isCurrentYear: false })}
          canGoPrevious
          canGoNext
          onPressPrevious={onPressPrevious}
          onPressNext={onPressNext}
        />,
      );
    });
    const prev = tree.root.findByProps({ testID: "activity-yearly-nav-previous" });
    const next = tree.root.findByProps({ testID: "activity-yearly-nav-next" });
    await act(async () => {
      prev.props.onPress?.();
      next.props.onPress?.();
    });
    expect(onPressPrevious).toHaveBeenCalledTimes(1);
    expect(onPressNext).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when the model reports no data and hides the hero figure", async () => {
    const model = makeModel({
      hasData: false,
      isEmpty: true,
      averageDisplay: "",
      averageStepsPerDay: 0,
      rangeLabel: "2022",
      title: "2022 Activity",
      isCurrentYear: false,
      months: makeModel().months.map((m) => ({
        ...m,
        averageSteps: null,
        numericDayCount: 0,
      })),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityYearlyCard
          loading={false}
          model={model}
          canGoPrevious
          canGoNext
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const emptyState = tree.root.findByProps({ testID: "activity-yearly-empty-state" });
    const joined = ([] as unknown[])
      .concat(emptyState.props.children as unknown[])
      .map(String)
      .join("");
    expect(joined).toBe("No activity data for 2022 yet");

    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("activity-yearly-average-steps");
    expect(json).not.toContain("activity-yearly-month-chart");
  });
});
