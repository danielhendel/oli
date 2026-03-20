import React from "react";
import renderer, { act } from "react-test-renderer";
import { WeeklyStrip } from "@/lib/ui/calendar/WeeklyStrip";
import type { CalendarDay, WorkoutDayMarker } from "@/lib/ui/calendar/types";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";

describe("WeeklyStrip", () => {
  it("renders neon ring for days with workouts", () => {
    const days: CalendarDay<WorkoutDayMarker>[] = [
      {
        day: "2026-03-01",
        meta: { hasWorkouts: false, hasStrength: false, hasCardio: false, workoutCount: 0, workouts: [] },
      },
      {
        day: "2026-03-02",
        meta: { hasWorkouts: true, hasStrength: true, hasCardio: false, workoutCount: 1, workouts: [] },
      },
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
    const strengthOuter = root.findByProps({ testID: "weekly-outer-ring-2026-03-02" });
    expect(strengthOuter).toBeTruthy();
  });

  it("renders dual-ring marker for mixed workout days", () => {
    const days: CalendarDay<WorkoutDayMarker>[] = [
      {
        day: "2026-03-03",
        meta: { hasWorkouts: true, hasStrength: true, hasCardio: true, workoutCount: 2, workouts: [] },
      },
    ];

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <WeeklyStrip
          days={days}
          selectedDay="2026-03-03"
          onDayPress={jest.fn()}
        />,
      );
    });

    const root = test.root;
    const mixedRing = root.findByProps({ testID: "weekly-cardio-inner-ring-2026-03-03" });
    expect(mixedRing).toBeTruthy();
  });
});

describe("MonthGrid", () => {
  it("renders markers for days with workouts", () => {
    const markerForDay = (day: string) =>
      day === "2026-03-10"
        ? { hasStrength: true, hasCardio: false }
        : day === "2026-03-15"
          ? { hasStrength: true, hasCardio: true }
          : null;

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <MonthGrid
          monthYear={{ year: 2026, month: 3 }}
          markerForDay={markerForDay}
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
    const strengthOuter = root.findByProps({ testID: "month-outer-ring-2026-03-10" });
    expect(strengthOuter).toBeTruthy();
  });

  it("renders inner cardio ring for mixed marker days", () => {
    const markerForDay = (day: string) =>
      day === "2026-03-20" ? { hasStrength: true, hasCardio: true } : null;

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <MonthGrid
          monthYear={{ year: 2026, month: 3 }}
          markerForDay={markerForDay}
          onDayPress={jest.fn()}
        />,
      );
    });

    const root = test.root;
    const mixedRing = root.findByProps({ testID: "month-cardio-inner-ring-2026-03-20" });
    expect(mixedRing).toBeTruthy();
  });
});

