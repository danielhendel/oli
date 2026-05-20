import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import {
  buildStrengthTodayCardModel,
  buildStrengthTodayCompletedSummaryLine,
  pickLatestStrengthSessionToday,
  STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE,
  STRENGTH_TODAY_WORKING_VOLUME_TITLE,
} from "../strengthTodayCardModel";
import { reconcileWorkoutSessionsForDay } from "../workoutSessionReconciliation";
import { sessionMatchesOverviewStrengthTab } from "../workoutsCalendarModel";

const emptyOv = {};
const emptyTitles = {};

describe("pickLatestStrengthSessionToday", () => {
  it("returns null when no sessions", () => {
    expect(pickLatestStrengthSessionToday([])).toBeNull();
  });

  it("picks the newest strength-tab session by start time", () => {
    const day = "2026-03-12" as const;
    const strength = reconcileWorkoutSessionsForDay(day, [
      {
        id: "a",
        observedAt: `${day}T08:00:00.000Z`,
        sourceId: "apple_health",
        title: "Morning",
        workoutType: "strength" as const,
        start: `${day}T08:00:00.000Z`,
        end: `${day}T08:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
      },
      {
        id: "b",
        observedAt: `${day}T18:00:00.000Z`,
        sourceId: "apple_health",
        title: "Evening",
        workoutType: "strength" as const,
        start: `${day}T18:00:00.000Z`,
        end: `${day}T19:00:00.000Z`,
        durationMinutes: 60,
        calories: null,
      },
    ]).filter(sessionMatchesOverviewStrengthTab);
    const picked = pickLatestStrengthSessionToday(strength);
    expect(picked?.title).toBe("Evening");
  });
});

describe("buildStrengthTodayCardModel", () => {
  const today = "2026-03-12" as const;

  it("rest state when no strength session on today", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: [{ day: today, workouts: [] }],
      todayDayKey: today,
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m).toEqual({
      kind: "rest",
      pill: "Rest",
      primaryTitle: "No workout today",
      durationLabel: "",
      subtitle: "Log a session when you train",
    });
  });

  it("does not fabricate a scheduled state (repo has no schedule model in calendar hydrate)", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: [{ day: today, workouts: [] }],
      todayDayKey: today,
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("rest");
  });

  it("builds session summary with set count and primary muscle when journal exercises exist", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: [
        {
          day: today,
          workouts: [
            {
              id: "w1",
              observedAt: `${today}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Lift",
              workoutType: "strength" as const,
              start: `${today}T10:00:00.000Z`,
              end: `${today}T10:45:00.000Z`,
              durationMinutes: 45,
              calories: null,
            },
          ],
        },
      ],
      todayDayKey: today,
      manualJournalSummaryForToday: {
        sessionId: "s1",
        day: today,
        startedAt: `${today}T10:00:00.000Z`,
        customName: null,
        totalVolume: 4000,
        avgIntensity: null,
        exercises: [
          {
            exerciseId: "bench_press",
            name: "Bench",
            sets: [
              { setNumber: 1, reps: 10, weightKg: 100, intensity: null },
              { setNumber: 2, reps: 10, weightKg: 100, intensity: null },
            ],
          },
        ],
      },
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.subtitle).toBe("2 sets · Chest focused");
      expect(m.workingVolume).toBeNull();
    }
  });

  it("uses override custom title and fallback subtitle when no journal/ingest exercises (Back Day / Apple-only)", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: [
        {
          day: today,
          workouts: [
            {
              id: "w1",
              observedAt: `${today}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "traditionalstrengthtraining",
              workoutType: "strength" as const,
              start: `${today}T10:00:00.000Z`,
              end: `${today}T10:45:00.000Z`,
              durationMinutes: 45,
              calories: null,
            },
          ],
        },
      ],
      todayDayKey: today,
      overridesByWorkoutId: {
        w1: { workoutId: "w1", customTitle: "Back Day", updatedAt: "2026-01-01T00:00:00.000Z" },
      },
      durableTitlesByWorkoutId: {},
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.pill).toBe("Completed");
      expect(m.primaryTitle).toBe("Back Day");
      expect(m.durationLabel).toBe("45 min");
      expect(m.subtitle).toBe(STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE);
      expect(m.workingVolume).toBeNull();
    }
  });

  const todayWorkoutCalendar = [
    {
      day: today,
      workouts: [
        {
          id: "w1",
          observedAt: `${today}T10:00:00.000Z`,
          sourceId: "manual",
          title: "Push",
          workoutType: "strength" as const,
          start: `${today}T10:00:00.000Z`,
          end: `${today}T11:00:00.000Z`,
          durationMinutes: 60,
          calories: null,
        },
      ],
    },
  ];

  function benchJournal(intensities: (number | null)[]) {
    return {
      sessionId: "s1",
      day: today,
      startedAt: `${today}T10:00:00.000Z`,
      customName: null,
      totalVolume: null,
      avgIntensity: null,
      exercises: [
        {
          exerciseId: "bench_press",
          name: "Bench Press",
          sets: intensities.map((intensity, i) => ({
            setNumber: i + 1,
            reps: 10,
            weightKg: 100,
            intensity,
          })),
        },
      ],
    };
  }

  it("workingVolume is null on rest state", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: [{ day: today, workouts: [] }],
      todayDayKey: today,
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("rest");
    if (m.kind === "rest") {
      expect("workingVolume" in m).toBe(false);
    }
  });

  it("workingVolume is null when no qualifying RPE 7–10 sets", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: benchJournal([5, null, 6]),
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.workingVolume).toBeNull();
    }
  });

  it("workingVolume lists RPE 7–10 sets by primary muscle only", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: benchJournal([8, 7, 10]),
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.workingVolume?.title).toBe(STRENGTH_TODAY_WORKING_VOLUME_TITLE);
      expect(m.workingVolume?.rows).toEqual([{ muscleGroup: "chest", setCount: 3 }]);
      expect(m.workingVolume?.exercisesByMuscleGroup.chest).toEqual([
        { exerciseName: "Bench Press", setCount: 3 },
      ]);
    }
  });

  it("workingVolume.exercisesByMuscleGroup sum equals the per-muscle row setCount", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: {
        sessionId: "s1",
        day: today,
        startedAt: `${today}T10:00:00.000Z`,
        customName: null,
        totalVolume: null,
        avgIntensity: null,
        exercises: [
          {
            exerciseId: "pull_up",
            name: "Pull Up",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
              { setNumber: 2, reps: 8, weightKg: 0, intensity: 9 },
            ],
          },
          {
            exerciseId: "barbell_row",
            name: "Barbell Row",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 80, intensity: 8 },
              { setNumber: 2, reps: 8, weightKg: 80, intensity: 7 },
              { setNumber: 3, reps: 8, weightKg: 80, intensity: 9 },
            ],
          },
        ],
      },
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      const backRow = m.workingVolume?.rows.find((r) => r.muscleGroup === "back");
      const backExercises = m.workingVolume?.exercisesByMuscleGroup.back ?? [];
      expect(backRow?.setCount).toBe(5);
      expect(backExercises).toEqual([
        { exerciseName: "Barbell Row", setCount: 3 },
        { exerciseName: "Pull Up", setCount: 2 },
      ]);
      expect(backExercises.reduce((s, r) => s + r.setCount, 0)).toBe(backRow?.setCount);
    }
  });

  it("workingVolume excludes RPE <= 6 and missing RPE from mixed sets", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: benchJournal([8, 6, null, 7]),
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.workingVolume?.rows[0]?.setCount).toBe(2);
    }
  });

  it("workingVolume does not attribute to secondary muscles", () => {
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: benchJournal([8]),
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.workingVolume?.rows.some((r) => r.muscleGroup === "triceps")).toBe(false);
    }
  });

  it("maps custom exercise primary muscle via analyticsCtx for workingVolume and subtitle", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map<string, CustomExerciseRecord>([
        [
          "custom_u1_weird",
          {
            exerciseId: "custom_u1_weird",
            name: "Zebra Curl Ultra",
            equipment: "Cable",
            primary: "Biceps",
            loggingType: "weight_reps",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      ]),
    };
    const m = buildStrengthTodayCardModel({
      strengthCalendarDays: todayWorkoutCalendar,
      todayDayKey: today,
      manualJournalSummaryForToday: {
        sessionId: "s1",
        day: today,
        startedAt: `${today}T10:00:00.000Z`,
        customName: null,
        totalVolume: null,
        avgIntensity: null,
        exercises: [
          {
            exerciseId: "custom_u1_weird",
            name: "Zebra Curl Ultra",
            sets: [
              { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
              { setNumber: 2, reps: 10, weightKg: 20, intensity: 6 },
            ],
          },
        ],
      },
      overridesByWorkoutId: emptyOv,
      durableTitlesByWorkoutId: emptyTitles,
      analyticsCtx: ctx,
    });
    expect(m.kind).toBe("completed");
    if (m.kind === "completed") {
      expect(m.subtitle).toContain("Biceps focused");
      expect(m.workingVolume?.rows).toEqual([{ muscleGroup: "biceps", setCount: 1 }]);
      expect(m.workingVolume?.exercisesByMuscleGroup.biceps).toEqual([
        { exerciseName: "Zebra Curl Ultra", setCount: 1 },
      ]);
    }
  });

  it("buildStrengthTodayCompletedSummaryLine returns empty when no exercises on session", () => {
    const line = buildStrengthTodayCompletedSummaryLine(null, {
      id: "w1",
      observedAt: "2026-03-12T10:00:00.000Z",
      sourceId: "apple_health",
      title: "Lift",
      workoutType: "strength",
      start: "2026-03-12T10:00:00.000Z",
      end: "2026-03-12T10:30:00.000Z",
      durationMinutes: 30,
      calories: null,
    });
    expect(line).toBe("");
  });
});
