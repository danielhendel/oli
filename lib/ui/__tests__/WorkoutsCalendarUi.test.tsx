import React from "react";
import renderer, { act } from "react-test-renderer";
import { WeeklyStrip } from "@/lib/ui/calendar/WeeklyStrip";
import type { CalendarDay, WorkoutDayMarker } from "@/lib/ui/calendar/types";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";

describe("WeeklyStrip", () => {
  it("renders neon ring for days with workouts", () => {
    const days: CalendarDay<WorkoutDayMarker>[] = [
      { day: "2026-03-01", meta: { hasWorkouts: false, workoutCount: 0, workouts: [] } },
      { day: "2026-03-02", meta: { hasWorkouts: true, workoutCount: 1, workouts: [] } },
    ];

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <WeeklyStrip
          days={days}
          selectedDay="2026-03-01"
          onDayPress={jest.fn()}
        />,
      );
    });

    const root = test.root;
    const hasWorkoutsNode = root.find(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel === "2026-03-02, has workouts",
    );
    const noWorkoutsNode = root.find(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel === "2026-03-01, no workouts",
    );

    expect(hasWorkoutsNode).toBeTruthy();
    expect(noWorkoutsNode).toBeTruthy();
  });
});

describe("MonthGrid", () => {
  it("renders markers for days with workouts", () => {
    const hasMarker = (day: string) => day === "2026-03-10" || day === "2026-03-15";

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <MonthGrid
          monthYear={{ year: 2026, month: 3 }}
          hasMarker={hasMarker}
          onDayPress={jest.fn()}
        />,
      );
    });

    const root = test.root;
    const d1 = root.find(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel === "2026-03-10, has workouts",
    );
    const d2 = root.find(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel === "2026-03-15, has workouts",
    );

    expect(d1).toBeTruthy();
    expect(d2).toBeTruthy();
  });
});

