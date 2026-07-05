import React, { act } from "react";
import renderer from "react-test-renderer";

import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import { TodayProgressCard } from "@/lib/ui/today/TodayProgressCard";
import { TodaySemiCircleProgress } from "@/lib/ui/today/TodaySemiCircleProgress";
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

describe("TodayProgressCard", () => {
  it("renders title and seven metric rows", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayProgressCard model={model} loading={false} />);
    });

    const text = root.root
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");

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
});

describe("TodaySemiCircleProgress", () => {
  it("shows percent without visible completion subtitle", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodaySemiCircleProgress completionPercent={8} loading={false} />);
    });

    const text = root.root
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");

    expect(text).toContain("8%");
    expect(text).not.toContain("of today's plan complete");

    const ring = root.root.findByProps({ testID: "today-completion-ring" });
    expect(ring.props.accessibilityLabel).toContain("8 percent of today's plan complete");
  });
});
