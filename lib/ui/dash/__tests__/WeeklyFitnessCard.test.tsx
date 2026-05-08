import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import type {
  UseWeeklyFitnessCardResult,
  WeeklyFitnessRow,
} from "@/lib/data/dash/useWeeklyFitnessCard";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import { WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME } from "@/lib/data/energy/energyMetricExplainerRoutes";
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

const sampleRows: WeeklyFitnessRow[] = [
  {
    key: "activity",
    label: "Activity",
    valueLabel: "9,992 steps",
    accessibilityValueLabel: "9,992 average steps, goal 10,000 steps per day",
    progress: 1,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "complete",
    statusLabel: "Complete",
  },
  {
    key: "strength",
    label: "Strength",
    valueLabel: "3 workouts",
    accessibilityValueLabel: "3 workouts, goal 5 workouts",
    progress: 0.6,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "onTrack",
    statusLabel: "On track",
  },
  {
    key: "cardio",
    label: "Cardio",
    valueLabel: "2.6 miles",
    accessibilityValueLabel: "2.6 miles, goal 10 miles",
    progress: 0.26,
    hasGoal: true,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    status: "behind",
    statusLabel: "Behind",
  },
];

const goalsHref = "/(app)/fitness-goals";
const sampleCombined: UseWeeklyFitnessCardResult["combined"] = {
  progress: (1 + 0.6 + 0.26) / 3,
  percent: 62,
  enabledCategoryCount: 3,
};

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

function findBarFillView(
  tree: renderer.ReactTestRenderer,
  rowKey: string,
): renderer.ReactTestInstance | undefined {
  const bar = tree.root.findByProps({ testID: `weekly-fitness-bar-${rowKey}` });
  return bar.findAllByType("View").find((v) => {
    const style = (v.props as { style?: unknown }).style;
    const arr = Array.isArray(style) ? style : [style];
    return arr.some(
      (s) => s && typeof s === "object" && "width" in (s as Record<string, unknown>),
    );
  });
}

function findBarFillStyle(
  tree: renderer.ReactTestRenderer,
  rowKey: string,
): { width: string; backgroundColor: string } | undefined {
  const innerView = findBarFillView(tree, rowKey);
  if (!innerView) return undefined;
  const styleArr = Array.isArray(innerView.props.style)
    ? innerView.props.style
    : [innerView.props.style];
  const merged: Record<string, unknown> = {};
  for (const s of styleArr) {
    if (s && typeof s === "object") Object.assign(merged, s);
  }
  return { width: String(merged.width ?? ""), backgroundColor: String(merged.backgroundColor ?? "") };
}

function findBarFillWidth(tree: renderer.ReactTestRenderer, rowKey: string): string {
  return findBarFillStyle(tree, rowKey)?.width ?? "";
}

describe("WeeklyFitnessCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders combined percent prominently under 'Weekly Fitness'", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const percent = tree.root.findByProps({ testID: "weekly-fitness-combined-percent" });
    const text = (percent.children as (string | number)[])
      .filter((c) => typeof c === "string" || typeof c === "number")
      .join("");
    expect(text).toBe("62%");

    const allText = collectAllText(tree);
    expect(allText).toContain("Weekly Fitness");
    expect(allText).toContain("My goal");
    expect(allText).toContain("This week’s results");
    expect(allText).toContain("62%");
  });

  it("rows show actual-only values (no 'avg' word, no '/ goal' pairs)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const text = collectAllText(tree);
    expect(text).toContain("9,992 steps");
    expect(text).toContain("3 workouts");
    expect(text).toContain("2.6 miles");
    expect(text).not.toContain("avg steps");
    expect(text).not.toContain(" / 10,000");
    expect(text).not.toContain("/ 5 workouts");
    expect(text).not.toContain(" / 10 mi");
  });

  it("uses the same green fill color for Activity / Strength / Cardio progress bars", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const colors = ["activity", "strength", "cardio"].map(
      (k) => findBarFillStyle(tree, k)?.backgroundColor,
    );
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).toBe(WEEKLY_FITNESS_BAR_FILL_COLOR);
  });

  it("renders a decorative chevron after each row's value (hidden from screen readers)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    for (const k of ["activity", "strength", "cardio"]) {
      const chevron = tree.root.findByProps({ testID: `weekly-fitness-row-chevron-${k}` });
      const text = (chevron.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join("");
      expect(text).toBe("\u203A");
      expect(chevron.props.accessibilityElementsHidden).toBe(true);
      expect(chevron.props.importantForAccessibility).toBe("no");
    }
    // Chevron is decorative — it must not bleed into row a11y label.
    const activity = tree.root.findByProps({ testID: "weekly-fitness-row-activity" });
    expect(activity.props.accessibilityLabel).not.toContain("\u203A");
  });

  it("progress bars still use goal completion (100% / 60% / 26%)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(findBarFillWidth(tree, "activity")).toBe("100%");
    expect(findBarFillWidth(tree, "strength")).toBe("60%");
    expect(findBarFillWidth(tree, "cardio")).toBe("26%");
  });

  it("accessibility labels include goals and percent of goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    const activity = tree.root.findByProps({ testID: "weekly-fitness-row-activity" });
    expect(activity.props.accessibilityLabel).toBe(
      "Activity, 9,992 average steps, goal 10,000 steps per day, 100 percent of goal. Opens explanation",
    );

    const strength = tree.root.findByProps({ testID: "weekly-fitness-row-strength" });
    expect(strength.props.accessibilityLabel).toBe(
      "Strength, 3 workouts, goal 5 workouts, 60 percent of goal. Opens explanation",
    );

    const cardio = tree.root.findByProps({ testID: "weekly-fitness-row-cardio" });
    expect(cardio.props.accessibilityLabel).toBe(
      "Cardio, 2.6 miles, goal 10 miles, 26 percent of goal. Opens explanation",
    );

    const percent = tree.root.findByProps({ testID: "weekly-fitness-combined-percent" });
    expect(percent.props.accessibilityLabel).toBe(
      "62 percent of weekly fitness goals completed",
    );
  });

  it("zero-goal row shows 'No goal set' and an empty bar fill", () => {
    const noGoalRows: WeeklyFitnessRow[] = [
      {
        key: "cardio",
        label: "Cardio",
        valueLabel: "No goal set",
        accessibilityValueLabel: "0.0 miles, no goal set",
        progress: 0,
        hasGoal: false,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: "behind",
        statusLabel: "Behind",
      },
    ];
    const combinedNoCardio: UseWeeklyFitnessCardResult["combined"] = {
      progress: 0.5,
      percent: 50,
      enabledCategoryCount: 2,
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={noGoalRows}
          combined={combinedNoCardio}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(tree)).toContain("No goal set");
    expect(findBarFillWidth(tree, "cardio")).toBe("0%");

    const cardio = tree.root.findByProps({ testID: "weekly-fitness-row-cardio" });
    expect(cardio.props.accessibilityLabel).toBe("Cardio, 0.0 miles, no goal set. Opens explanation");
    expect(cardio.props.accessibilityLabel).not.toContain("percent of goal");
  });

  it("hides combined percent when no category has a goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "weekly-fitness-combined-percent" }).length).toBe(0);
  });

  it("clamps over-goal visual progress to 100%", () => {
    const overRow: WeeklyFitnessRow = {
      key: "activity",
      label: "Activity",
      valueLabel: "20,000 steps",
      accessibilityValueLabel: "20,000 average steps, goal 10,000 steps per day",
      progress: 2,
      hasGoal: true,
      barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
      status: "complete",
      statusLabel: "Complete",
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[overRow]}
          combined={{ progress: 1, percent: 100, enabledCategoryCount: 1 }}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(findBarFillWidth(tree, "activity")).toBe("100%");
    const bar = tree.root.findByProps({ testID: "weekly-fitness-bar-activity" });
    expect((bar.props as { accessibilityValue?: { now?: number } }).accessibilityValue?.now).toBe(100);
  });

  it("opens Weekly Fitness explainers on row press and goals editor on My goal", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-activity" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME,
      params: { row: "activity" },
    });

    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-strength" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME,
      params: { row: "strength" },
    });

    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-row-cardio" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: WEEKLY_FITNESS_METRIC_EXPLAINER_PATHNAME,
      params: { row: "cardio" },
    });
    act(() => {
      tree.root.findByProps({ testID: "weekly-fitness-my-goal" }).props.onPress();
    });
    expect(mockPush).toHaveBeenLastCalledWith(goalsHref);
  });

  it("shows loading / error / signed-out states without the percent number", () => {
    let loadingTree!: renderer.ReactTestRenderer;
    act(() => {
      loadingTree = renderer.create(
        <WeeklyFitnessCard
          loading
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(loadingTree)).toContain("Loading this week’s results");
    expect(loadingTree.root.findAllByProps({ testID: "weekly-fitness-combined-percent" }).length).toBe(0);

    let errorTree!: renderer.ReactTestRenderer;
    act(() => {
      errorTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error="Network failed"
          rows={sampleRows}
          combined={sampleCombined}
          goalsHref={goalsHref}
          hasUser
        />,
      );
    });
    expect(collectAllText(errorTree)).toContain("Network failed");
    expect(errorTree.root.findAllByProps({ testID: "weekly-fitness-combined-percent" }).length).toBe(0);

    let signedOutTree!: renderer.ReactTestRenderer;
    act(() => {
      signedOutTree = renderer.create(
        <WeeklyFitnessCard
          loading={false}
          error={null}
          rows={[]}
          combined={{ progress: 0, percent: 0, enabledCategoryCount: 0 }}
          goalsHref={goalsHref}
          hasUser={false}
        />,
      );
    });
    expect(collectAllText(signedOutTree)).toContain("Sign in");
    expect(signedOutTree.root.findAllByProps({ testID: "weekly-fitness-combined-percent" }).length).toBe(0);
  });
});
