// services/functions/src/dailyFacts/__tests__/buildActivityStepsAllocationV1.test.ts

import { describe, it, expect } from "@jest/globals";
import type { WorkoutCanonicalEvent } from "../../types/health";
import { buildActivityStepsAllocationV1 } from "../buildActivityStepsAllocationV1";

const baseMeta = {
  userId: "user_123",
  sourceId: "source_manual_1",
  day: "2025-01-01",
  timezone: "America/New_York",
  createdAt: "2025-01-02T03:00:00.000Z",
  updatedAt: "2025-01-02T03:00:00.000Z",
  schemaVersion: 1 as const,
};

const makeWorkout = (overrides: Partial<WorkoutCanonicalEvent> = {}): WorkoutCanonicalEvent => ({
  id: "w_default",
  kind: "workout",
  start: "2025-01-01T18:00:00.000Z",
  end: "2025-01-01T19:00:00.000Z",
  sport: "running",
  durationMinutes: 60,
  trainingLoad: 50,
  ...baseMeta,
  ...overrides,
});

describe("buildActivityStepsAllocationV1", () => {
  it("returns undefined when totalSteps is missing", () => {
    expect(
      buildActivityStepsAllocationV1({ totalSteps: undefined, workoutEvents: [] }),
    ).toBeUndefined();
  });

  it("returns undefined when totalSteps is non-finite", () => {
    expect(
      buildActivityStepsAllocationV1({
        totalSteps: Number.NaN,
        workoutEvents: [],
      }),
    ).toBeUndefined();
    expect(
      buildActivityStepsAllocationV1({
        totalSteps: Number.POSITIVE_INFINITY,
        workoutEvents: [],
      }),
    ).toBeUndefined();
  });

  it("returns undefined when totalSteps is negative", () => {
    expect(
      buildActivityStepsAllocationV1({ totalSteps: -1, workoutEvents: [] }),
    ).toBeUndefined();
  });

  it("returns all-NEAT allocation when no classified workouts exist", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [],
    });
    expect(result).toEqual({
      modelVersion: "activity_steps_allocation_v1",
      neatSteps: 9000,
      strengthSteps: 0,
      cardioSteps: 0,
      inputsUsed: ["activity.steps"],
      inputsMissing: [],
    });
  });

  it("returns all-NEAT when only excluded (non-cardio/non-strength) workouts exist", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [
        makeWorkout({ id: "w_yoga", sport: "yoga", steps: 500 }),
      ],
    });
    expect(result).toEqual({
      modelVersion: "activity_steps_allocation_v1",
      neatSteps: 9000,
      strengthSteps: 0,
      cardioSteps: 0,
      inputsUsed: ["activity.steps"],
      inputsMissing: [],
    });
  });

  it("fail-closed: classified workouts exist but none carry real step data", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running" }),
        makeWorkout({
          id: "w_lift",
          sport: "Traditional Strength Training",
          start: "2025-01-01T19:30:00.000Z",
          end: "2025-01-01T20:00:00.000Z",
        }),
      ],
    });
    expect(result).toBeUndefined();
  });

  it("fail-closed: classified workouts have steps=null only", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running", steps: null }),
      ],
    });
    expect(result).toBeUndefined();
  });

  it("allocates cardio workout steps to cardioSteps", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 10000,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running", steps: 4500 }),
      ],
    });
    expect(result).toEqual({
      modelVersion: "activity_steps_allocation_v1",
      neatSteps: 5500,
      strengthSteps: 0,
      cardioSteps: 4500,
      inputsUsed: ["activity.steps", "workout.steps", "workout.classifiedCardio"],
      inputsMissing: [],
    });
  });

  it("allocates strength-classified workout steps to strengthSteps", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [
        makeWorkout({
          id: "w_lift",
          sport: "Traditional Strength Training",
          steps: 800,
        }),
      ],
    });
    expect(result).toEqual({
      modelVersion: "activity_steps_allocation_v1",
      neatSteps: 8200,
      strengthSteps: 800,
      cardioSteps: 0,
      inputsUsed: ["activity.steps", "workout.steps", "workout.classifiedStrength"],
      inputsMissing: [],
    });
  });

  it("derives neatSteps as residual: total - cardio - strength", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 12000,
      workoutEvents: [
        makeWorkout({
          id: "w_run",
          sport: "running",
          start: "2025-01-01T07:00:00.000Z",
          end: "2025-01-01T08:00:00.000Z",
          steps: 3000,
        }),
        makeWorkout({
          id: "w_lift",
          sport: "Functional Strength Training",
          start: "2025-01-01T18:00:00.000Z",
          end: "2025-01-01T19:00:00.000Z",
          steps: 500,
        }),
      ],
    });
    expect(result).toBeDefined();
    expect(result!.cardioSteps).toBe(3000);
    expect(result!.strengthSteps).toBe(500);
    expect(result!.neatSteps).toBe(12000 - 3000 - 500);
    expect(result!.neatSteps + result!.strengthSteps + result!.cardioSteps).toBe(12000);
  });

  it("returns undefined when cardio + strength exceeds totalSteps", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 5000,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running", steps: 4000 }),
        makeWorkout({
          id: "w_lift",
          sport: "Traditional Strength Training",
          start: "2025-01-01T19:30:00.000Z",
          end: "2025-01-01T20:30:00.000Z",
          steps: 2000,
        }),
      ],
    });
    expect(result).toBeUndefined();
  });

  it("drops later-overlap workouts (earlier start wins)", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 10000,
      workoutEvents: [
        makeWorkout({
          id: "w_run_first",
          sport: "running",
          start: "2025-01-01T17:00:00.000Z",
          end: "2025-01-01T18:00:00.000Z",
          steps: 4000,
        }),
        makeWorkout({
          id: "w_lift_overlap",
          sport: "Traditional Strength Training",
          start: "2025-01-01T17:30:00.000Z",
          end: "2025-01-01T18:30:00.000Z",
          steps: 999,
        }),
      ],
    });
    expect(result).toBeDefined();
    expect(result!.cardioSteps).toBe(4000);
    expect(result!.strengthSteps).toBe(0);
    expect(result!.neatSteps).toBe(6000);
    expect(result!.inputsUsed).not.toContain("workout.classifiedStrength");
  });

  it("tie on start: lexicographic id wins", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 8000,
      workoutEvents: [
        makeWorkout({
          id: "z_run",
          sport: "running",
          start: "2025-01-01T17:00:00.000Z",
          end: "2025-01-01T18:00:00.000Z",
          steps: 1500,
        }),
        makeWorkout({
          id: "a_run",
          sport: "running",
          start: "2025-01-01T17:00:00.000Z",
          end: "2025-01-01T18:00:00.000Z",
          steps: 2500,
        }),
      ],
    });
    expect(result).toBeDefined();
    expect(result!.cardioSteps).toBe(2500);
    expect(result!.neatSteps).toBe(8000 - 2500);
  });

  it("excludes strength_workout-kind events (only WorkoutCanonicalEvent contributes)", () => {
    // Helper only accepts WorkoutCanonicalEvent[]; runtime check still guards on event.kind.
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9000,
      workoutEvents: [
        // @ts-expect-error — exercising defensive runtime guard with mis-typed input.
        { ...makeWorkout({ id: "sw", sport: "running" }), kind: "strength_workout" },
      ],
    });
    expect(result).toBeDefined();
    expect(result!.cardioSteps).toBe(0);
    expect(result!.strengthSteps).toBe(0);
    expect(result!.neatSteps).toBe(9000);
  });

  it("zero-step real workouts are valid contributions (still real data)", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 8000,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running", steps: 0 }),
      ],
    });
    expect(result).toEqual({
      modelVersion: "activity_steps_allocation_v1",
      neatSteps: 8000,
      strengthSteps: 0,
      cardioSteps: 0,
      inputsUsed: ["activity.steps", "workout.steps"],
      inputsMissing: [],
    });
  });

  it("rounds fractional totalSteps and fractional workout steps to integers", () => {
    const result = buildActivityStepsAllocationV1({
      totalSteps: 9999.6,
      workoutEvents: [
        makeWorkout({ id: "w_run", sport: "running", steps: 4500.4 }),
      ],
    });
    expect(result).toBeDefined();
    expect(result!.cardioSteps).toBe(4500);
    expect(result!.neatSteps).toBe(10000 - 4500);
    expect(Number.isInteger(result!.neatSteps)).toBe(true);
    expect(Number.isInteger(result!.cardioSteps)).toBe(true);
    expect(Number.isInteger(result!.strengthSteps)).toBe(true);
  });

  it("partition invariant holds across a randomized small fixture (always-on assertion)", () => {
    const cases: {
      totalSteps: number;
      workoutEvents: WorkoutCanonicalEvent[];
    }[] = [
      {
        totalSteps: 1000,
        workoutEvents: [
          makeWorkout({ id: "a", sport: "running", steps: 100 }),
        ],
      },
      {
        totalSteps: 12345,
        workoutEvents: [
          makeWorkout({ id: "b", sport: "Traditional Strength Training", steps: 333 }),
          makeWorkout({
            id: "c",
            sport: "cycling",
            start: "2025-01-01T20:00:00.000Z",
            end: "2025-01-01T21:00:00.000Z",
            steps: 1500,
          }),
        ],
      },
      {
        totalSteps: 0,
        workoutEvents: [],
      },
      {
        totalSteps: 7777,
        workoutEvents: [
          makeWorkout({ id: "d", sport: "walking", steps: 0 }),
        ],
      },
    ];
    for (const input of cases) {
      const result = buildActivityStepsAllocationV1(input);
      if (!result) continue;
      expect(result.neatSteps + result.strengthSteps + result.cardioSteps).toBe(
        Math.round(input.totalSteps),
      );
      expect(result.neatSteps).toBeGreaterThanOrEqual(0);
      expect(result.cardioSteps).toBeGreaterThanOrEqual(0);
      expect(result.strengthSteps).toBeGreaterThanOrEqual(0);
    }
  });
});
