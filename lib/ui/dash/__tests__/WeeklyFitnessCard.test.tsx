import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import type { WeeklyFitnessCardModel } from "@/lib/data/dash/buildWeeklyFitnessCardModel";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import { WEEKLY_FITNESS_ROUTES } from "@/lib/data/dash/weeklyFitnessRoutes";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Circle: "Circle",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

function row(
  key: WeeklyFitnessCardModel["metrics"][number]["key"],
  label: string,
  valueLabel: string,
): WeeklyFitnessCardModel["metrics"][number] {
  return {
    key,
    label,
    valueLabel,
    accessibilityLabel: `${label}, ${valueLabel}, button.`,
    progress01: 0.5,
    hasProgress: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    href: WEEKLY_FITNESS_ROUTES[key],
  };
}

const sampleModel: WeeklyFitnessCardModel = {
  weeklyProgress: {
    percent: 62,
    label: "62%",
    subtitle: "Weekly Progress",
    accessibilityLabel: "Weekly Progress, 62 percent, plan completion across 3 metrics. Button.",
    href: WEEKLY_FITNESS_ROUTES.goalsEditor,
    testID: "weekly-fitness-hero-weekly-progress",
  },
  bodyComposition: {
    percent: 81,
    label: "81",
    subtitle: "Body Composition Score",
    accessibilityLabel:
      "Body Composition Score, 81, progress toward your selected body composition goal. Button.",
    href: WEEKLY_FITNESS_ROUTES.bodyComposition,
    testID: "weekly-fitness-hero-body-composition",
  },
  metrics: [
    row("sleep", "Sleep", "7h 30m avg"),
    row("readiness", "Readiness", "84 avg"),
    row("activity", "Activity", "9,998 steps"),
    row("strength", "Strength", "3 workouts"),
    row("cardio", "Cardio", "2.6 miles"),
    row("nutrition", "Nutrition", "5 of 7 logged"),
    row("stress", "Stress", "5 of 7 balanced"),
  ],
  weeklyProgressScore0to100: 62,
  bodyCompositionScore0to100: 81,
  eligibleWeeklyProgressCount: 3,
};

function flatten(node: renderer.ReactTestInstance | string): string {
  if (typeof node === "string") return node;
  const kids = node.children ?? [];
  return kids.map((c) => flatten(c as renderer.ReactTestInstance | string)).join("");
}

describe("WeeklyFitnessCard v2", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders dual heroes with exact subtitles and seven rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          model={sampleModel}
          hasUser
          goalsHref={WEEKLY_FITNESS_ROUTES.goalsEditor}
        />,
      );
    });
    const text = flatten(tree.root);
    expect(text).toContain("Weekly Fitness");
    expect(text).toContain("My goal");
    expect(text).toContain("Weekly Progress");
    expect(text).toContain("Body Composition Score");
    expect(text).toContain("62%");
    expect(text).toContain("81");
    expect(text).not.toMatch(/81%/);
    expect(text).toContain("This week’s results");
    expect(text).not.toContain("steps remaining");
    expect(text).not.toContain("Goal: 10,000");
    expect(text).not.toContain("workouts remaining");

    expect(tree.root.findAllByProps({ testID: "weekly-fitness-hero-circles" }).length).toBe(1);
    const order = [
      "sleep",
      "readiness",
      "activity",
      "strength",
      "cardio",
      "nutrition",
      "stress",
    ];
    for (const key of order) {
      expect(tree.root.findAllByProps({ testID: `weekly-fitness-row-${key}` }).length).toBe(1);
    }
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-progress-to-goal-block" }).length).toBe(
      0,
    );
  });

  it("navigates My goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          model={sampleModel}
          hasUser
          goalsHref={WEEKLY_FITNESS_ROUTES.goalsEditor}
        />,
      );
    });
    const btn = tree.root.findByProps({ testID: "weekly-fitness-my-goal" });
    act(() => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith(WEEKLY_FITNESS_ROUTES.goalsEditor);
  });
});
