import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickMetricsWorkoutForSession,
  pickStrengthDeleteTargetWorkout,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
  resolveStrengthSessionExerciseDisplay,
  resolveWorkoutSessionSurfaceTitle,
} from "@/lib/data/workouts/workoutSessionSurface";

function item(partial: Partial<WorkoutHistoryItem> & Pick<WorkoutHistoryItem, "id">): WorkoutHistoryItem {
  return {
    observedAt: "2026-03-11T12:00:00.000Z",
    sourceId: "unknown",
    title: "",
    start: null,
    end: null,
    durationMinutes: null,
    calories: null,
    ...partial,
  };
}

describe("workoutSessionSurface", () => {
  it("pickWorkoutForSessionActions prefers manual raw row", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    expect(session).toBeDefined();
    const picked = pickWorkoutForSessionActions(session!);
    expect(picked?.id).toBe("man1");
  });

  it("pickWorkoutOverrideForSession finds override on manual member when Apple sorts first", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const overrides: Record<string, WorkoutOverride | undefined> = {
      man1: {
        workoutId: "man1",
        customTitle: "Leg Day Rename",
        updatedAt: "2026-03-11T15:00:00.000Z",
      },
    };
    const o = pickWorkoutOverrideForSession(session!, overrides);
    expect(o?.customTitle).toBe("Leg Day Rename");
  });

  it("resolveWorkoutSessionSurfaceTitle uses reconciled manual-first title when Apple is representative", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const representative = session!.workouts[0]!;
    expect(representative.id).toBe("apple1");
    const action = pickWorkoutForSessionActions(session!) ?? representative;
    const title = resolveWorkoutSessionSurfaceTitle(
      session!,
      representative,
      action,
      {},
      undefined,
      "strength",
      undefined,
    );
    expect(title).toBe("Bench Press");
  });

  it("resolveWorkoutSessionSurfaceTitle applies AsyncStorage rename on manual id when Apple sorts first", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const representative = session!.workouts[0]!;
    const overrides: Record<string, WorkoutOverride | undefined> = {
      man1: {
        workoutId: "man1",
        customTitle: "Persisted Rename",
        updatedAt: "2026-03-11T16:00:00.000Z",
      },
    };
    const action = pickWorkoutForSessionActions(session!) ?? representative;
    const title = resolveWorkoutSessionSurfaceTitle(
      session!,
      representative,
      action,
      overrides,
      undefined,
      "strength",
      undefined,
    );
    expect(title).toBe("Persisted Rename");
  });

  it("resolveWorkoutSessionSurfaceTitle prefers durable override over AsyncStorage rename", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const representative = session!.workouts[0]!;
    const overrides: Record<string, WorkoutOverride | undefined> = {
      man1: {
        workoutId: "man1",
        customTitle: "Async Only",
        updatedAt: "2026-03-11T16:00:00.000Z",
      },
    };
    const action = pickWorkoutForSessionActions(session!) ?? representative;
    const title = resolveWorkoutSessionSurfaceTitle(session!, representative, action, overrides, {
      man1: "Server Title",
    }, "strength", undefined);
    expect(title).toBe("Server Title");
  });

  it("resolveWorkoutSessionSurfaceTitle prefers durable override over journal customName", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const representative = session!.workouts[0]!;
    const action = pickWorkoutForSessionActions(session!) ?? representative;
    const title = resolveWorkoutSessionSurfaceTitle(session!, representative, action, {}, { man1: "Renamed" }, "strength", "Journal Name");
    expect(title).toBe("Renamed");
  });

  it("overview and day detail share the same title when given the same durable map", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "man1",
        sourceId: "manual",
        title: "Original",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const durable = { man1: "Shared" };
    const a = buildWorkoutSessionSurfaceModel(session!, {}, "strength", undefined, durable);
    const b = buildWorkoutSessionSurfaceModel(session!, {}, "strength", undefined, durable);
    expect(a.displayTitle).toBe("Shared");
    expect(b.displayTitle).toBe("Shared");
  });

  it("pickMetricsWorkoutForSession returns Apple row when merged", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Lift",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const m = pickMetricsWorkoutForSession(session!);
    expect(m?.id).toBe("apple1");
  });

  it("pickJournalSummaryForStrengthSession picks journal closest to manual raw anchor when two share a day", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Lift",
        start: "2026-03-11T14:00:00.000Z",
        durationMinutes: 45,
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:08:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const sessions = reconcileWorkoutSessionsForDay(day, workouts);
    const session = sessions.find((s) => s.workouts.some((w) => w.id === "man1"));
    expect(session).toBeDefined();
    const summaries: ManualWorkoutDaySummary[] = [
      {
        sessionId: "morning",
        day,
        startedAt: "2026-03-11T08:00:00.000Z",
        customName: null,
        totalVolume: null,
        avgIntensity: null,
        exercises: [],
      },
      {
        sessionId: "noon",
        day,
        startedAt: "2026-03-11T14:10:00.000Z",
        customName: "Noon Push",
        totalVolume: 100,
        avgIntensity: 7,
        exercises: [{ exerciseId: "x", name: "Press", sets: [{ setNumber: 1, reps: 5, weightKg: 20, intensity: 7 }] }],
      },
    ];
    const picked = pickJournalSummaryForStrengthSession(day, session!, summaries);
    expect(picked?.sessionId).toBe("noon");
  });

  it("buildWorkoutSessionSurfaceModel uses journal custom name over session.title when Apple is representative", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const surface = buildWorkoutSessionSurfaceModel(session!, {}, "strength", {
      sessionId: "j1",
      day,
      startedAt: "2026-03-11T14:05:00.000Z",
      customName: "Custom Journal",
      totalVolume: null,
      avgIntensity: null,
      exercises: [],
    });
    expect(surface.displayTitle).toBe("Custom Journal");
    expect(surface.actionWorkout.id).toBe("man1");
    expect(surface.metricsWorkout.id).toBe("apple1");
  });

  it("resolveWorkoutSessionSurfaceTitle prefers journal custom name on strength when merged with Apple", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
        rawKind: "workout",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
        rawKind: "strength_workout",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    const representative = session!.workouts[0]!;
    const action = pickWorkoutForSessionActions(session!) ?? representative;
    const title = resolveWorkoutSessionSurfaceTitle(
      session!,
      representative,
      action,
      {},
      undefined,
      "strength",
      "Morning Push",
    );
    expect(title).toBe("Morning Push");
  });

  it("resolveStrengthSessionExerciseDisplay falls back to strengthIngestExercises when journal is empty", () => {
    const action = item({
      id: "man1",
      sourceId: "manual",
      title: "Bench Press",
      rawKind: "strength_workout",
      strengthIngestExercises: [
        {
          exerciseId: "exercise:ingested:man1:0",
          name: "Bench Press",
          sets: [{ setNumber: 1, reps: 10, weightKg: 60, intensity: 8, isWarmup: false }],
        },
      ],
    });
    const out = resolveStrengthSessionExerciseDisplay(null, action);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0]!.name).toBe("Bench Press");
    expect(out.totalVolume).toBeGreaterThan(0);
    expect(out.avgIntensity).toBe(8);
  });

  it("resolveStrengthSessionExerciseDisplay prefers journal exercises over ingest", () => {
    const journal: ManualWorkoutDaySummary = {
      sessionId: "sess-1",
      day: "2026-04-03",
      startedAt: "2026-04-03T10:00:00.000Z",
      customName: "Push Day",
      totalVolume: 100,
      avgIntensity: 7,
      exercises: [
        {
          exerciseId: "ex-1",
          name: "Squat",
          sets: [{ setNumber: 1, reps: 5, weightKg: 100, intensity: 7 }],
        },
      ],
    };
    const action = item({
      id: "man1",
      sourceId: "manual",
      title: "Other",
      strengthIngestExercises: [
        {
          exerciseId: "exercise:ingested:man1:0",
          name: "Deadlift",
          sets: [{ setNumber: 1, reps: 1, weightKg: 200, intensity: 9 }],
        },
      ],
    });
    const out = resolveStrengthSessionExerciseDisplay(journal, action);
    expect(out.exercises[0]!.name).toBe("Squat");
    expect(out.totalVolume).toBe(100);
    expect(out.avgIntensity).toBe(7);
  });
});

describe("pickStrengthDeleteTargetWorkout", () => {
  it("prefers hydrate-backed manual over hydrate-backed apple", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        rawKind: "workout",
        isDeletableRawEvent: true,
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        rawKind: "strength_workout",
        isDeletableRawEvent: true,
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    expect(pickStrengthDeleteTargetWorkout(session!)?.id).toBe("man1");
  });

  it("skips manual without hydrate flag and picks apple when only apple is deletable", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "apple1",
        sourceId: "apple_health",
        rawKind: "workout",
        isDeletableRawEvent: true,
        title: "Traditional Strength Training",
        start: "2026-03-11T14:00:00.000Z",
        workoutType: "strength",
      }),
      item({
        id: "man1",
        sourceId: "manual",
        rawKind: "strength_workout",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    expect(pickStrengthDeleteTargetWorkout(session!)?.id).toBe("apple1");
  });

  it("returns null when no session member is hydrate-backed deletable", () => {
    const day = "2026-03-11";
    const workouts = [
      item({
        id: "man1",
        sourceId: "manual",
        rawKind: "strength_workout",
        title: "Bench Press",
        start: "2026-03-11T14:05:00.000Z",
        workoutType: "strength",
      }),
    ];
    const [session] = reconcileWorkoutSessionsForDay(day, workouts);
    expect(pickStrengthDeleteTargetWorkout(session!)).toBeNull();
  });
});
