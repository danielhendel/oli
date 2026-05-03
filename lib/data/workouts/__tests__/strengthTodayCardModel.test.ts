import {
  buildStrengthTodayCardModel,
  buildStrengthTodayCompletedSummaryLine,
  pickLatestStrengthSessionToday,
  STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE,
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
