import React, { act } from "react";
import renderer from "react-test-renderer";

import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import { TodayCommandSection } from "@/lib/ui/today/TodayCommandSection";
import { TodayProgressCard } from "@/lib/ui/today/TodayProgressCard";
import { TodaySemiCircleProgress } from "@/lib/ui/today/TodaySemiCircleProgress";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { buildTodayProgressCardRows } from "@/lib/today/buildTodayProgressCardRows";
import { sleepNightViewForDay } from "@/lib/today/testFixtures/sleepNightViewFixtures";
import { WEEKLY_FITNESS_GOAL_DEFAULTS } from "@oli/contracts";

const model = buildTodayCommandModel({
  day: "2026-07-05",
  timezone: "America/New_York",
  todayFacts: {
    schemaVersion: 1,
    userId: "u1",
    date: "2026-07-05",
    computedAt: "2026-07-05T12:00:00.000Z",
    activity: { steps: 2877 },
  },
  priorDayFacts: null,
  todayStepsOverride: null,
  goals: {
    activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
    strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
    cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
    sleepHoursPerNightGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
    isDefault: true,
  },
  calorieTargetKcal: 2000,
  proteinTargetG: 150,
  nutritionTargetsAreDefault: true,
  sleepNightView: null,
  readinessView: null,
  ouraConnected: true,
  lastUpdatedAt: null,
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

function flattenText(root: renderer.ReactTestRenderer): string {
  return root.root
    .findAllByType("Text")
    .map((n) =>
      (n.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    )
    .join(" ");
}

function orderedHeroTestIds(root: renderer.ReactTestRenderer): string[] {
  const order = ["today-semi-circle-progress", "today-readiness-summary", "today-progress-card"];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const node of root.root.findAll(
    (n) => typeof n.props.testID === "string" && order.includes(n.props.testID as string),
  )) {
    const id = node.props.testID as string;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

describe("TodayProgressCard", () => {
  it("renders title and seven metric rows", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayProgressCard model={model} loading={false} />);
    });

    const text = flattenText(root);

    expect(text).toContain("Today's Progress");
    expect(text).toContain("Activity");
    expect(text).toContain("2,877 steps");
    expect(text).not.toContain("/ 10,000");

    const rowIds = new Set(
      root.root
        .findAll(
          (n) => typeof n.props.testID === "string" && n.props.testID.startsWith("today-progress-row-"),
        )
        .map((n) => n.props.testID as string),
    );
    expect(rowIds.size).toBe(7);
  });

  it("renders blue progress bars for all seven rows", () => {
    const barModel = buildTodayCommandModel({
      day: "2026-07-05",
      timezone: "America/New_York",
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 3192 },
        nutrition: { totalKcal: 640, proteinG: 82 },
      },
      priorDayFacts: null,
      todayStepsOverride: null,
      goals: {
        activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
        strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
        cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
        sleepHoursPerNightGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
        isDefault: true,
      },
      calorieTargetKcal: 2000,
      proteinTargetG: 150,
      nutritionTargetsAreDefault: true,
      sleepNightView: sleepNightViewForDay("2026-07-05", 84),
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 91,
      },
      ouraConnected: true,
      lastUpdatedAt: null,
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayProgressCard model={barModel} loading={false} />);
    });

    for (const id of buildTodayProgressCardRows(barModel).map((r) => r.id)) {
      root.root.findByProps({ testID: `today-progress-bar-${id}` });
      const fill = root.root.findByProps({ testID: `today-progress-bar-fill-${id}` });
      expect(flattenBackgroundColor(fill.props.style)).toBe(ENERGY_BASELINE_FILL_COLOR);
    }
  });
});

describe("TodaySemiCircleProgress", () => {
  it("shows percent without visible completion subtitle", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <TodaySemiCircleProgress completionPercent={8} dateLine="Today Sunday, July 5" loading={false} />,
      );
    });

    const text = flattenText(root);

    expect(text).toContain("8%");
    expect(text).toContain("Today Sunday, July 5");
    expect(text).not.toContain("of today's plan complete");

    const ring = root.root.findByProps({ testID: "today-completion-ring" });
    expect(ring.props.accessibilityLabel).toContain("8 percent of today's plan complete");
  });

  it("uses workout blue progress color and thicker stroke", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodaySemiCircleProgress completionPercent={8} loading={false} />);
    });

    const ring = root.root.findByProps({ testID: "today-completion-ring" });
    expect(ring.props.progressColor).toBe(ENERGY_BASELINE_FILL_COLOR);
    expect(ring.props.strokeWidth).toBeGreaterThanOrEqual(12);
  });

  it("renders date line below percent in hierarchy", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <TodaySemiCircleProgress completionPercent={8} dateLine="Today Sunday, July 5" loading={false} />,
      );
    });

    const labels = root.root.findAllByType("Text").map((n) =>
      (n.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    );
    const percentIndex = labels.indexOf("8%");
    const dateIndex = labels.indexOf("Today Sunday, July 5");
    expect(percentIndex).toBeGreaterThanOrEqual(0);
    expect(dateIndex).toBeGreaterThan(percentIndex);
  });
});

describe("TodayCommandSection hero order", () => {
  it("orders semi-circle, readiness, and progress card", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <TodayCommandSection
          model={model}
          loading={false}
          error={null}
          dateLine="Today Sunday, July 5"
        />,
      );
    });

    const ids = orderedHeroTestIds(root);
    expect(ids).toEqual([
      "today-semi-circle-progress",
      "today-readiness-summary",
      "today-progress-card",
    ]);
  });
});

function flattenBackgroundColor(style: unknown): string | undefined {
  if (style == null) return undefined;
  if (Array.isArray(style)) {
    for (const part of style) {
      const color = flattenBackgroundColor(part);
      if (color) return color;
    }
    return undefined;
  }
  if (typeof style === "object" && style !== null && "backgroundColor" in style) {
    return (style as { backgroundColor?: string }).backgroundColor;
  }
  return undefined;
}
