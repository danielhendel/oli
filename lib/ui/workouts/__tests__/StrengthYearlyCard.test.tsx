import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  STRENGTH_YEARLY_MONTH_LETTERS,
  type StrengthYearlyCardModel,
} from "@/lib/data/workouts/strengthYearlyCardModel";
import { StrengthYearlyCard } from "@/lib/ui/workouts/StrengthYearlyCard";
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

function makeModel(overrides: Partial<StrengthYearlyCardModel> = {}): StrengthYearlyCardModel {
  const months = STRENGTH_YEARLY_MONTH_LETTERS.map((label, monthIndex) => ({
    monthIndex,
    monthKey: `2026-${String(monthIndex + 1).padStart(2, "0")}`,
    label,
    workoutCount: monthIndex <= 4 ? 12 + monthIndex : 0,
    isFutureMonth: monthIndex > 4,
    isCurrentMonth: monthIndex === 4,
  }));
  const totalWorkouts = months.reduce((acc, m) => acc + m.workoutCount, 0);
  return {
    year: 2026,
    title: "2026 Strength",
    rangeLabel: "2026",
    isCurrentYear: true,
    hasData: totalWorkouts > 0,
    totalWorkouts,
    totalDisplay: String(totalWorkouts),
    totalQualifier: "workouts completed",
    months,
    chartMaxScale: 20,
    todayMonthKey: "2026-05",
    isEmpty: false,
    ...overrides,
  };
}

describe("StrengthYearlyCard", () => {
  it("renders the title, range label, hero metric, qualifier, and 12 month-letter labels", async () => {
    const model = makeModel();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyCard
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
    expect(json).toContain("2026 Strength");
    expect(json).toContain("workouts-yearly-range-label");
    expect(json).toContain("workouts-yearly-month-chart");
    expect(json).toContain("workouts-yearly-month-labels");
    expect(json).toContain("workouts-yearly-total-metric");
    expect(json).toContain("workouts-yearly-total-metric-value");

    const value = tree.root.findByProps({ testID: "workouts-yearly-total-metric-value" });
    expect(value.props.children).toBe(model.totalDisplay);
    expect(value.props.style).toMatchObject(ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE);

    const qualifierNodes = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        typeof n.props.children === "string" &&
        n.props.children === "workouts completed",
    );
    expect(qualifierNodes.length).toBeGreaterThanOrEqual(1);
    expect(qualifierNodes[0]!.props.style).toMatchObject(ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE);

    const rendered = [...STRENGTH_YEARLY_MONTH_LETTERS].map(
      (letter) => (json.match(new RegExp(`"${letter}"`, "g")) ?? []).length,
    );
    rendered.forEach((n) => expect(n).toBeGreaterThan(0));
  });

  it("uses exact card title text '2026 Strength'", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyCard
          loading={false}
          model={makeModel()}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const title = tree.root.findByProps({ testID: "workouts-yearly-title" });
    expect(title.props.children).toBe("2026 Strength");
  });

  it("disables Next when canGoNext is false (current year)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyCard
          loading={false}
          model={makeModel()}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "workouts-yearly-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("invokes prev/next handlers when enabled", async () => {
    const onPressPrevious = jest.fn();
    const onPressNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyCard
          loading={false}
          model={makeModel({
            rangeLabel: "2024",
            title: "2024 Strength",
            isCurrentYear: false,
          })}
          canGoPrevious
          canGoNext
          onPressPrevious={onPressPrevious}
          onPressNext={onPressNext}
        />,
      );
    });
    const prev = tree.root.findByProps({ testID: "workouts-yearly-nav-previous" });
    const next = tree.root.findByProps({ testID: "workouts-yearly-nav-next" });
    await act(async () => {
      prev.props.onPress?.();
      next.props.onPress?.();
    });
    expect(onPressPrevious).toHaveBeenCalledTimes(1);
    expect(onPressNext).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when the model reports no data and hides the hero figure", async () => {
    const empty = makeModel({
      hasData: false,
      isEmpty: true,
      totalWorkouts: 0,
      totalDisplay: "0",
      rangeLabel: "2022",
      title: "2022 Strength",
      isCurrentYear: false,
      months: makeModel().months.map((m) => ({
        ...m,
        workoutCount: 0,
        isFutureMonth: false,
        isCurrentMonth: false,
      })),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthYearlyCard
          loading={false}
          model={empty}
          canGoPrevious
          canGoNext
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const emptyState = tree.root.findByProps({ testID: "workouts-yearly-empty-state" });
    const joined = ([] as unknown[])
      .concat(emptyState.props.children as unknown[])
      .map(String)
      .join("");
    expect(joined).toBe("No strength workouts for 2022 yet");

    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("workouts-yearly-total-metric");
    expect(json).not.toContain("workouts-yearly-month-chart");
  });
});
