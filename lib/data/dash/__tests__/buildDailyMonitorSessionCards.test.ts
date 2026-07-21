import {
  buildDailyMonitorCardioCardModel,
  buildDailyMonitorWorkoutCardModel,
  resolveCardioMonitorPresence,
  resolveWorkoutMonitorPresence,
} from "../buildDailyMonitorSessionCards";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";

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

const legDayExercises: ManualWorkoutExerciseSummary[] = [
  {
    exerciseId: "squat",
    name: "Squat",
    sets: [
      { setNumber: 1, reps: 8, weightKg: 100, intensity: 7 },
      { setNumber: 2, reps: 8, weightKg: 100, intensity: 8 },
    ],
  },
];

describe("Daily Monitor session cards", () => {
  it("creates compact Workout with ordered rows and intensity from RPE", () => {
    const model = buildDailyMonitorWorkoutCardModel({
      requestedDay: day,
      calendarDays: [
        {
          day,
          workouts: [
            {
              ...strengthItem("s1", "Leg Day A"),
              strengthVolumeKg: 1600,
              strengthIngestExercises: legDayExercises,
              averageHeartRateBpm: 128,
            },
          ],
        },
      ],
      energy: {
        day,
        estimatedKcal: { low: 1800, high: 2200, midpoint: 2000 },
        confidence: "high",
        variancePct: 0.1,
        factors: {
          strength: { low: 120, high: 180, midpoint: 150 },
        },
      } as never,
    });
    expect(model).not.toBeNull();
    expect(model!.primaryTitle).toMatch(/Leg Day A/i);
    expect(model!.intensityLabel).toBe("High");
    expect(model!.rows.map((r) => r.label)).toEqual([
      "Duration",
      "Total Volume",
      "Estimated Calorie Burn",
      "Average Heart Rate",
    ]);
    expect(model!.rows[1]?.valueLabel).toMatch(/lb|kg/);
    expect(model!.rows[1]?.isAvailable).toBe(true);
    expect(model!.rows[3]?.valueLabel).toBe("128 bpm");
    expect(model!.accessibilityLabel).toMatch(/Opens Workouts/);
    expect(model!.accessibilityLabel).toMatch(/Workout intensity High/);
    expect(JSON.stringify(model)).not.toMatch(/1RM|Health State|Quads focused|14 sets/);
    expect(resolveWorkoutMonitorPresence({ loading: false, error: null, model })).toMatch(
      /^present_/,
    );
  });

  it("formats Total Volume in the preferred mass unit", () => {
    const base = {
      requestedDay: day,
      calendarDays: [
        {
          day,
          workouts: [
            {
              ...strengthItem("s1", "Leg Day A"),
              strengthVolumeKg: 100,
              strengthIngestExercises: legDayExercises,
            },
          ],
        },
      ],
    } as const;
    const lb = buildDailyMonitorWorkoutCardModel({ ...base, massUnit: "lb" });
    const kg = buildDailyMonitorWorkoutCardModel({ ...base, massUnit: "kg" });
    expect(lb!.rows.find((r) => r.key === "total_volume")?.valueLabel).toMatch(/lb/);
    expect(kg!.rows.find((r) => r.key === "total_volume")?.valueLabel).toBe("100 kg");
  });

  it("does not infer intensity from heart rate alone", () => {
    const model = buildDailyMonitorWorkoutCardModel({
      requestedDay: day,
      calendarDays: [
        {
          day,
          workouts: [
            {
              ...strengthItem("s1", "Push"),
              averageHeartRateBpm: 155,
              // no ingest intensity / RPE
            },
          ],
        },
      ],
    });
    expect(model!.intensityLabel).toBeNull();
    expect(model!.rows.find((r) => r.key === "average_heart_rate")?.valueLabel).toBe("155 bpm");
  });

  it("keeps missing calorie and HR as Unavailable, not zero", () => {
    const model = buildDailyMonitorWorkoutCardModel({
      requestedDay: day,
      calendarDays: [{ day, workouts: [strengthItem("s1", "Push")] }],
    });
    expect(model).not.toBeNull();
    const cal = model!.rows.find((r) => r.key === "estimated_calorie_burn");
    const hr = model!.rows.find((r) => r.key === "average_heart_rate");
    expect(cal?.valueLabel).toBe("Unavailable");
    expect(hr?.valueLabel).toBe("Unavailable");
    expect(cal?.isAvailable).toBe(false);
    expect(model!.intensityLabel).toBeNull();
  });

  it("summarizes multiple strength sessions without inventing capacity", () => {
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
    expect(model!.sessionCount).toBeGreaterThanOrEqual(1);
    if (model!.sessionCount > 1) {
      expect(model!.primaryTitle).toMatch(/workouts/i);
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
