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
jest.mock("@/lib/workouts/journal/manualWorkoutSummary", () => {
  const actual = jest.requireActual<typeof import("@/lib/workouts/journal/manualWorkoutSummary")>(
    "@/lib/workouts/journal/manualWorkoutSummary",
  );
  return {
    ...actual,
    listManualWorkoutDaySummaries: (...args: unknown[]) => mockListManualWorkoutDaySummaries(...args),
  };
});

import { WorkoutDayScreen } from "../day/[day]";
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
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
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

  it("renders multiple strength sessions on the strength day route", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Chest Day",
          workoutType: "strength" as const,
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: null,
          calories: null,
        },
        {
          id: "w2",
          observedAt: "2026-03-18T18:00:00.000Z",
          sourceId: "manual",
          title: "Evening Pull",
          workoutType: "strength" as const,
          start: "2026-03-18T18:00:00.000Z",
          end: null,
          durationMinutes: 30,
          calories: null,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Chest Day");
    expect(json).toContain("Evening Pull");
    expect(json).toContain("—");
    expect(json).not.toContain("Manual");
  });

  it("renders cardio session fields on the cardio day route", () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Chest Day",
          workoutType: "strength" as const,
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 40,
          calories: null,
        },
        {
          id: "w2",
          observedAt: "2026-03-18T18:00:00.000Z",
          sourceId: "apple_health",
          title: "IndoorCycle",
          workoutType: "cardio" as const,
          start: "2026-03-18T18:00:00.000Z",
          end: null,
          durationMinutes: 30,
          calories: null,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="cardio" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Indoor Cycling");
    expect(json).toContain("Distance");
    expect(json).toContain("Avg Pace");
    expect(json).not.toContain("Chest Day");
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
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("No data for this day");
    expect(mockUseWorkoutOverrides).toHaveBeenCalledWith([]);
  });

  it("does not render Daily metrics card when dailyFacts has no meaningful metrics", () => {
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
          workoutType: "strength" as const,
        },
      ],
      dailyFacts: {
        activity: { steps: 0, trainingLoad: 0 },
        strength: { workoutsCount: 0, totalSets: 0, totalReps: 0 },
      },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).not.toContain("Daily metrics");
  });

  it("renders Daily metrics card when dailyFacts has meaningful metrics", () => {
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
          workoutType: "strength" as const,
        },
      ],
      dailyFacts: {
        activity: { steps: 1234, trainingLoad: 0 },
        strength: { workoutsCount: 0, totalSets: 0, totalReps: 0 },
      },
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Daily metrics");
    expect(json).toContain("Steps");
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
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
    });
    act(() => {
      test.update(<WorkoutDayScreen domain="strength" />);
    });

    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("No data for this day");
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
          title: "Morning lift",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 20,
          calories: null,
          workoutType: "strength",
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
      test = renderer.create(<WorkoutDayScreen domain="strength" />);
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
      test = renderer.create(<WorkoutDayScreen domain="cardio" />);
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

  it("renders premium empty exercise state with log CTA when journal has no sets", async () => {
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
        totalVolume: null,
        avgIntensity: null,
        exercises: [],
      },
    ]);
    const prevJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;
    let test!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        test = renderer.create(<WorkoutDayScreen domain="strength" />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("No exercises logged yet");
    expect(json).toContain("Add exercises");
    expect(test.root.findByProps({ testID: "add-exercises-cta" })).toBeTruthy();
  });

  it("Apple-only single strength session uses premium shell and log CTA navigates with enrichDay", async () => {
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
    mockListManualWorkoutDaySummaries.mockResolvedValue([]);
    const prevJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;
    let test!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        test = renderer.create(<WorkoutDayScreen domain="strength" />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Total Volume");
    expect(json).toContain("Add exercises");
    const cta = test.root.findByProps({ testID: "add-exercises-cta" });
    act(() => {
      cta.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/enrich",
      params: {
        enrichDay: "2026-03-18",
        enrichTargetId: "2026-03-18:session:0:w1",
        sessionAnchorIso: "2026-03-18T08:00:00.000Z",
      },
    });
  });

  it("renders each exercise as a premium performance row when one strength session and journal summary exist", async () => {
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
        test = renderer.create(<WorkoutDayScreen domain="strength" />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }

    expect(test.root.find((n) => n.props?.testID === "exercise-performance-row-0")).toBeTruthy();
    expect(test.root.find((n) => n.props?.testID === "exercise-performance-row-1")).toBeTruthy();
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Tricep Pushdown");
    expect(json).toContain("Cable Bicep Curl");
    expect(json).toContain("History");
  });

  it("keeps legacy exercise cards when two strength sessions exist the same day (no per-session journal attribution)", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "w1",
          observedAt: "2026-03-18T08:00:00.000Z",
          sourceId: "manual",
          title: "Morning",
          start: "2026-03-18T08:00:00.000Z",
          end: null,
          durationMinutes: 45,
          calories: null,
          workoutType: "strength",
        },
        {
          id: "w2",
          observedAt: "2026-03-18T18:00:00.000Z",
          sourceId: "manual",
          title: "Evening",
          start: "2026-03-18T18:00:00.000Z",
          end: null,
          durationMinutes: 40,
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
        customName: "Double day",
        totalVolume: 5000,
        avgIntensity: 8,
        exercises: [{ name: "squat", sets: [{ setNumber: 1, reps: 5, weightKg: 100, intensity: 8 }] }],
      },
    ]);

    const prevJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    let test!: renderer.ReactTestRenderer;
    try {
      await act(async () => {
        test = renderer.create(<WorkoutDayScreen domain="strength" />);
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      process.env.JEST_WORKER_ID = prevJestWorkerId;
    }

    const perfRows = test.root.findAll(
      (n) => typeof n.props?.testID === "string" && n.props.testID.startsWith("exercise-performance-row"),
    );
    expect(perfRows.length).toBe(0);
    expect(test.root.find((n) => n.props?.testID === "exercise-card-squat")).toBeTruthy();
    expect(JSON.stringify(test.toJSON())).toContain("Exercises");
  });

  it("renders premium cardio card for a single cardio session with overview-style zones section", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "c1",
          observedAt: "2026-03-18T12:00:00.000Z",
          sourceId: "apple_health",
          title: "Running",
          start: "2026-03-18T12:00:00.000Z",
          end: "2026-03-18T13:00:00.000Z",
          durationMinutes: 60,
          calories: 400,
          workoutType: "cardio" as const,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="cardio" />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Running");
    expect(json).toContain("Distance");
    expect(json).toContain("Avg Pace");
    expect(json).toContain("Heart rate zones");
    expect(json).toContain("Heart rate zones are not available for this workout.");
    expect(json).not.toContain("Exercises");
  });

  it("renders zone rows when heartRateZoneMinutes is present on the workout", async () => {
    mockUseWorkoutDayDetail.mockReturnValue({
      status: "ready",
      day: "2026-03-18",
      workouts: [
        {
          id: "c1",
          observedAt: "2026-03-18T12:00:00.000Z",
          sourceId: "apple_health",
          title: "Running",
          start: "2026-03-18T12:00:00.000Z",
          end: "2026-03-18T13:00:00.000Z",
          durationMinutes: 60,
          calories: 400,
          workoutType: "cardio" as const,
          heartRateZoneMinutes: [5, 10, 20, 8, 2] as const,
        },
      ],
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<WorkoutDayScreen domain="cardio" />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("Zone 1");
    expect(json).toContain("Zone 5");
    expect(json).toContain("20 min");
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
        test = renderer.create(<WorkoutDayScreen domain="strength" />);
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
