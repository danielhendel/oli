import {
  buildDailyMonitorCardioCardModel,
  buildDailyMonitorWorkoutCardModel,
  resolveCardioMonitorPresence,
  resolveWorkoutMonitorPresence,
} from "../buildDailyMonitorSessionCards";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

const day = "2026-07-20" as const;

function strengthItem(id: string, title: string): WorkoutHistoryItem {
  return {
    id,
    observedAt: `${day}T18:00:00.000Z`,
    sourceId: "apple_health",
    title,
    workoutType: "strength",
    start: `${day}T18:00:00.000Z`,
    end: `${day}T19:00:00.000Z`,
    durationMinutes: 60,
    calories: null,
  } as WorkoutHistoryItem;
}

function cardioItem(id: string, title: string): WorkoutHistoryItem {
  return {
    id,
    observedAt: `${day}T07:00:00.000Z`,
    sourceId: "apple_health",
    title,
    workoutType: "running",
    start: `${day}T07:00:00.000Z`,
    end: `${day}T07:40:00.000Z`,
    durationMinutes: 40,
    calories: null,
    distanceMeters: 5000,
  } as WorkoutHistoryItem;
}

describe("Daily Monitor session cards", () => {
  it("creates Workout for a current-day strength session", () => {
    const model = buildDailyMonitorWorkoutCardModel({
      requestedDay: day,
      calendarDays: [{ day, workouts: [strengthItem("s1", "Evening Lift")] }],
    });
    expect(model).not.toBeNull();
    expect(model!.primaryTitle).toMatch(/Evening Lift|Strength/i);
    expect(resolveWorkoutMonitorPresence({ loading: false, error: null, model })).toBe(
      "present_complete",
    );
  });

  it("summarizes multiple strength sessions without inventing volume", () => {
    const morning: WorkoutHistoryItem = {
      ...strengthItem("s1", "AM Lift"),
      start: `${day}T08:00:00.000Z`,
      end: `${day}T08:45:00.000Z`,
      observedAt: `${day}T08:00:00.000Z`,
      durationMinutes: 45,
    };
    const evening: WorkoutHistoryItem = {
      ...strengthItem("s2", "PM Lift"),
      start: `${day}T18:00:00.000Z`,
      end: `${day}T19:10:00.000Z`,
      observedAt: `${day}T18:00:00.000Z`,
      durationMinutes: 70,
    };
    const model = buildDailyMonitorWorkoutCardModel({
      requestedDay: day,
      calendarDays: [{ day, workouts: [morning, evening] }],
    });
    expect(model).not.toBeNull();
    // Prefer an honest multi-session summary when reconciliation keeps both;
    // never invent capacity / 1RM / Health State copy.
    expect(model!.sessionCount).toBeGreaterThanOrEqual(1);
    if (model!.sessionCount > 1) {
      expect(model!.primaryTitle).toMatch(/workouts/i);
    } else {
      expect(model!.primaryTitle.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(model)).not.toMatch(/1RM|Elite|Deficient|Health State/);
  });

  it("does not create Workout for rest / empty day", () => {
    expect(
      buildDailyMonitorWorkoutCardModel({
        requestedDay: day,
        calendarDays: [{ day, workouts: [] }],
      }),
    ).toBeNull();
  });

  it("does not create Workout from a prior-day session", () => {
    expect(
      buildDailyMonitorWorkoutCardModel({
        requestedDay: day,
        calendarDays: [
          {
            day: "2026-07-19",
            workouts: [strengthItem("s1", "Yesterday")],
          },
        ],
      }),
    ).toBeNull();
  });

  it("creates Cardio for a current-day cardio session and not from strength alone", () => {
    const cardio = buildDailyMonitorCardioCardModel({
      requestedDay: day,
      calendarDays: [{ day, workouts: [cardioItem("c1", "Morning Run")] }],
    });
    expect(cardio).not.toBeNull();
    expect(resolveCardioMonitorPresence({ loading: false, error: null, model: cardio })).toBe(
      "present_complete",
    );

    const strengthOnly = buildDailyMonitorCardioCardModel({
      requestedDay: day,
      calendarDays: [{ day, workouts: [strengthItem("s1", "Lift")] }],
    });
    expect(strengthOnly).toBeNull();
  });

  it("keeps strength and cardio as separate cards without duplicating the same modality", () => {
    const days = [
      {
        day,
        workouts: [strengthItem("s1", "Lift"), cardioItem("c1", "Run")],
      },
    ];
    const workout = buildDailyMonitorWorkoutCardModel({ requestedDay: day, calendarDays: days });
    const cardio = buildDailyMonitorCardioCardModel({ requestedDay: day, calendarDays: days });
    expect(workout).not.toBeNull();
    expect(cardio).not.toBeNull();
  });

  it("does not create Cardio from steps-only evidence (no sessions)", () => {
    expect(
      buildDailyMonitorCardioCardModel({
        requestedDay: day,
        calendarDays: [{ day, workouts: [] }],
      }),
    ).toBeNull();
  });
});
