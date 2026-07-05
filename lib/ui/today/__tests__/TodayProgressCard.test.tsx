import React, { act } from "react";
import renderer from "react-test-renderer";

import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import { TodayProgressCard } from "@/lib/ui/today/TodayProgressCard";
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
  sleepView: null,
  readinessView: null,
  ouraConnected: true,
  lastUpdatedAt: null,
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
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
    expect(text).toContain("Workout");
    expect(text).toContain("Cardio");
    expect(text).toContain("Calories");
    expect(text).toContain("Protein");
    expect(text).toContain("Sleep");
    expect(text).toContain("Readiness");

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
