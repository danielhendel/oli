import React from "react";
import renderer, { act } from "react-test-renderer";

const mockUseWorkoutDayDetail = jest.fn();
const mockUseWorkoutOverrides = jest.fn();
const mockListManualWorkoutDaySummaries = jest.fn(async () => []);
const mockSetOptions = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ day: "2026-03-18" }),
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutDayDetail: (...args: unknown[]) => mockUseWorkoutDayDetail(...args),
}));
jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: (...args: unknown[]) => mockUseWorkoutOverrides(...args),
}));
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));
jest.mock("@/lib/workouts/journal/manualWorkoutSummary", () => ({
  listManualWorkoutDaySummaries: (...args: unknown[]) => mockListManualWorkoutDaySummaries(...args),
}));

import WorkoutDayScreen from "../day/[day]";
import { formatWeightLbs } from "../day/[day]";

describe("WorkoutDayScreen display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListManualWorkoutDaySummaries.mockResolvedValue([]);
    mockUseWorkoutOverrides.mockReturnValue({
      loaded: true,
      overridesByWorkoutId: {},
      saveOverride: jest.fn(),
    });
  });

  it("renders workout cards with formatted names and key fields", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "apple_health",
          title: "TraditionalStrengthTraining",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 40,
          calories: 320,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Strength Training");
    expect(json).toContain("Duration");
    expect(json).toContain("40 min");
    expect(json).toContain("Calories");
    expect(json).toContain("320 kcal");
    expect(json).toContain("Total Volume");
    expect(json).toContain("Avg Intensity");
    expect(json).not.toContain("Apple Health");
    expect(json).not.toContain("\"Workouts\"");
  });

  it("renders multiple workouts and handles missing optional fields", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Chest Day",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: null,
          calories: null,
        },
        {
          id: "w2",
          observedAt: "2026-03-18T18:00:00.000Z",
          sourceId: "apple_health",
          title: "IndoorCycle",
          start: "2026-03-18T18:00:00.000Z",
          end: null,
          durationMinutes: 30,
          calories: null,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Chest Day");
    expect(json).toContain("Indoor Cycling");
    expect(json).toContain("Distance");
    expect(json).toContain("Avg Pace");
    expect(json).toContain("—");
    expect(json).not.toContain("Manual");
  });

  it("renders no-workout empty state and calls overrides hook with empty ids", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [],
      dailyFacts: null,
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("No workouts for this day");
    expect(mockUseWorkoutOverrides).toHaveBeenCalledWith([]);
  });

  it("keeps hook order stable when transitioning from workouts day to empty day", () => {
    mockUseWorkoutDayDetail
      .mockReturnValueOnce({
        status: "ready",
        day: "2026-03-18",
        workouts: [
          {
            id: "w1",
            observedAt: "2026-03-18T08:00:00.000Z",
            sourceId: "manual",
            title: "Workout",
            start: "2026-03-18T08:00:00.000Z",
            end: null,
            durationMinutes: 20,
            calories: null,
            workoutType: "strength",
          },
        ],
      })
      .mockReturnValueOnce({
        status: "ready",
        day: "2026-03-18",
        workouts: [],
        dailyFacts: null,
      });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });
    act(() => {
      test.update(<WorkoutDayScreen />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("No workouts for this day");
    expect(mockUseWorkoutOverrides.mock.calls[0][0]).toEqual(["w1"]);
    expect(mockUseWorkoutOverrides.mock.calls[1][0]).toEqual([]);
  });

  it("renders override title and duration from shared resolver path", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Running",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "cardio",
        },
      ],
    });
    mockUseWorkoutOverrides.mockReturnValue({
      loaded: true,
      overridesByWorkoutId: {
        w1: {
          workoutId: "w1",
          customTitle: "Leg Day",
          correctedDurationMinutes: 48,
          correctedWorkoutType: "strength",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
      },
      saveOverride: jest.fn(),
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Leg Day");
    expect(json).toContain("48 min");
    expect(json).toContain("Total Volume");
  });

  it("formats exercise weight from kg to rounded lb", () => {
    expect(formatWeightLbs(60)).toBe("132");
    expect(formatWeightLbs(null)).toBe("—");
  });

  it("sets native header title and exposes workout actions menu", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Running",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "cardio",
        },
      ],
    });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen />);
    });

    const options = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]?.[0];
    expect(options?.title).toBe("Wed Mar 18, 2026");

    let headerTree!: renderer.ReactTestRenderer;
    act(() => {
      headerTree = renderer.create(options.headerRight());
    });
    const btn = headerTree.root.findByProps({ accessibilityLabel: "Workout day actions" });
    act(() => {
      btn.props.onPress();
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("View details");
    expect(json).toContain("Edit duration");
    expect(json).not.toContain("Workout Day");
  });

  it("renders exercises card container", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Workout",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "strength",
        },
      ],
    });
    mockListManualWorkoutDaySummaries.mockResolvedValue([
      {
        sessionId: "s1",
        day: "2026-03-18",
        startedAt: "2026-03-18T08:00:00.000Z",
        customName: "Chest & Arms",
        totalVolume: 12450,
        avgIntensity: 8.5,
        exercises: [
          { name: "bench press", sets: [{ setNumber: 1, reps: 10, weightKg: 60, intensity: 8 }] },
        ],
      },
    ]);
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<WorkoutDayScreen />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Exercises");
    expect(json).toContain("No logged exercises");
  });

  it("renders each exercise in its own card", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Workout",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "strength",
        },
      ],
    });
    mockListManualWorkoutDaySummaries.mockResolvedValue([
      {
        sessionId: "s1",
        day: "2026-03-18",
        startedAt: "2026-03-18T08:00:00.000Z",
        customName: "Chest & Arms",
        totalVolume: 12450,
        avgIntensity: 8.5,
        exercises: [
          { name: "tricep pushdown", sets: [{ setNumber: 1, reps: 10, weightKg: 20, intensity: 8 }] },
          { name: "cable bicep curl", sets: [{ setNumber: 1, reps: 12, weightKg: 12, intensity: 7 }] },
        ],
      },
    ]);

    const prevJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    let test!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        test = renderer.create(<WorkoutDayScreen />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }

    expect(
      test.root.find((n) => n.props?.testID === "exercise-card-tricep pushdown"),
    ).toBeTruthy();
    expect(
      test.root.find((n) => n.props?.testID === "exercise-card-cable bicep curl"),
    ).toBeTruthy();
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Tricep Pushdown");
    expect(json).toContain("Cable Bicep Curl");
    expect(json).toContain("History");
  });

  it("exercise history action reuses logger route pattern", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Workout",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "strength",
        },
      ],
    });
    mockListManualWorkoutDaySummaries.mockResolvedValue([
      {
        sessionId: "s1",
        day: "2026-03-18",
        startedAt: "2026-03-18T08:00:00.000Z",
        customName: "Chest & Arms",
        totalVolume: 12450,
        avgIntensity: 8.5,
        exercises: [{ name: "bench press", sets: [{ setNumber: 1, reps: 10, weightKg: 60, intensity: 8 }] }],
      },
    ]);

    const prevJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;
    let test!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        test = renderer.create(<WorkoutDayScreen />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }

    const historyBtn = test.root.findByProps({ accessibilityLabel: "Exercise history for bench press" });
    act(() => {
      historyBtn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/exercise-history",
      params: { exerciseId: "bench_press" },
    });
  });
});
