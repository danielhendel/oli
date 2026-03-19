import React from "react";
import renderer, { act } from "react-test-renderer";

const mockUseWorkoutDayDetail = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ day: "2026-03-18" }),
}));

jest.mock("@/lib/data/workouts/useWorkoutsCalendar", () => ({
  useWorkoutDayDetail: (...args: unknown[]) => mockUseWorkoutDayDetail(...args),
}));

import WorkoutDayScreen from "../day/[day]";

describe("WorkoutDayScreen display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(json).toContain("Apple Health");
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
    expect(json).toContain("—");
    expect(json).toContain("Manual");
  });
});
