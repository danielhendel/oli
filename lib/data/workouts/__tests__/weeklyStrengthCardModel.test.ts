import { buildWeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

function summary(args: {
  sessionId: string;
  day: string;
  customName?: string | null;
  totalVolume: number | null;
  exercises: {
    exerciseId: string;
    name: string;
    sets: { reps: number; weightKg: number; isWarmup?: boolean }[];
  }[];
}): ManualWorkoutDaySummary {
  return {
    sessionId: args.sessionId,
    day: args.day,
    startedAt: `${args.day}T10:00:00.000Z`,
    customName: args.customName ?? null,
    totalVolume: args.totalVolume,
    avgIntensity: null,
    exercises: args.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sets: exercise.sets.map((set, idx) => ({
        setNumber: idx + 1,
        reps: set.reps,
        weightKg: set.weightKg,
        intensity: null,
        ...(set.isWarmup === true ? { isWarmup: true as const } : {}),
      })),
    })),
  };
}

describe("buildWeeklyStrengthCardModel", () => {
  it("builds weekly totals and sorts workout rows by completion order (earliest first)", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        customName: "Push Day",
        totalVolume: 1000,
        exercises: [{ exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 10, weightKg: 100 }] }],
      }),
      summary({
        sessionId: "s2",
        day: "2026-03-24",
        totalVolume: 500,
        exercises: [{ exerciseId: "squat", name: "Back Squat", sets: [{ reps: 5, weightKg: 100 }] }],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
      weekKey: "2026-03-23..2026-03-29",
    });

    expect(out.weekKey).toBe("2026-03-23..2026-03-29");
    expect(out.totalWorkouts).toBe(2);
    expect(out.totalVolume).toBe(1500);
    expect(out.workouts.map((row) => [row.workoutName, Math.round(row.totalVolume)])).toEqual([
      ["Push Day", 1000],
      ["Back Squat", 500],
    ]);
  });

  it("orders workouts by startedAt when volume order would differ", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s_heavy",
        day: "2026-03-25",
        customName: "Heavy",
        totalVolume: 9000,
        exercises: [{ exerciseId: "bench_press", name: "Bench", sets: [{ reps: 10, weightKg: 100 }] }],
      }),
      summary({
        sessionId: "s_light",
        day: "2026-03-24",
        customName: "Light",
        totalVolume: 500,
        exercises: [{ exerciseId: "squat", name: "Squat", sets: [{ reps: 5, weightKg: 50 }] }],
      }),
    ];
    rows[0]!.startedAt = "2026-03-25T18:00:00.000Z";
    rows[1]!.startedAt = "2026-03-24T07:00:00.000Z";

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });

    expect(out.workouts.map((w) => w.workoutId)).toEqual(["s_light", "s_heavy"]);
  });

  it("computes canonical muscle-group totals from contribution weights", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 1500,
        exercises: [
          { exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 10, weightKg: 100 }] },
          { exerciseId: "squat", name: "Back Squat", sets: [{ reps: 5, weightKg: 100 }] },
        ],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const byGroup = new Map(out.muscleGroups.map((row) => [row.muscleGroup, row.totalVolume]));

    expect(Math.round(byGroup.get("chest") ?? 0)).toBe(550);
    expect(Math.round(byGroup.get("triceps") ?? 0)).toBe(250);
    expect(Math.round(byGroup.get("shoulders") ?? 0)).toBe(200);
    expect(Math.round(byGroup.get("quads") ?? 0)).toBe(350);
    expect(Math.round(byGroup.get("glutes") ?? 0)).toBe(100);
    expect(Math.round(byGroup.get("core") ?? 0)).toBe(50);
  });

  it("omits muscle rollups for custom exercises with no resolvable primary group", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 750,
        exercises: [{ exerciseId: "custom_u1_press", name: "My Custom Lift", sets: [{ reps: 10, weightKg: 75 }] }],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });

    expect(out.totalWorkouts).toBe(1);
    expect(out.totalVolume).toBe(750);
    expect(out.muscleGroups).toEqual([]);
    expect(out.muscleGroupsSets).toEqual([]);
  });

  it("allocates full volume to primary muscle when no contribution map (classification-first)", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 1000,
        exercises: [{ exerciseId: "dumbbell_fly", name: "DB Fly", sets: [{ reps: 10, weightKg: 50 }] }],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const chest = out.muscleGroups.find((r) => r.muscleGroup === "chest");
    expect(chest?.totalVolume).toBe(500);
    const chestSets = out.muscleGroupsSets.find((r) => r.muscleGroup === "chest");
    expect(chestSets?.totalSets).toBe(1);
  });

  it("keeps RDL volume weighted and sets on hamstrings primary", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 1000,
        exercises: [{ exerciseId: "romanian_deadlift", name: "RDL", sets: [{ reps: 5, weightKg: 100 }] }],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const ham = out.muscleGroupsSets.find((r) => r.muscleGroup === "hamstrings");
    expect(ham?.totalSets).toBe(1);
    const byVol = new Map(out.muscleGroups.map((r) => [r.muscleGroup, r.totalVolume]));
    expect(byVol.get("hamstrings")).toBeGreaterThan(0);
    expect(byVol.get("glutes")).toBeGreaterThan(0);
    // spinal_erectors subgroup maps to `core` in taxonomy (not `back`).
    expect(byVol.get("core")).toBeGreaterThan(0);
    expect(
      Math.round(
        (byVol.get("hamstrings") ?? 0) + (byVol.get("glutes") ?? 0) + (byVol.get("core") ?? 0),
      ),
    ).toBe(500);
  });

  it("uses deterministic workout naming priority: customName then exercises then fallback", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        customName: "Leg Day",
        totalVolume: 300,
        exercises: [{ exerciseId: "squat", name: "Back Squat", sets: [{ reps: 3, weightKg: 100 }] }],
      }),
      summary({
        sessionId: "s2",
        day: "2026-03-24",
        totalVolume: 300,
        exercises: [
          { exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 3, weightKg: 100 }] },
          { exerciseId: "squat", name: "Back Squat", sets: [{ reps: 3, weightKg: 100 }] },
        ],
      }),
      summary({
        sessionId: "s3",
        day: "2026-03-25",
        totalVolume: null,
        exercises: [],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });

    const names = new Set(out.workouts.map((row) => row.workoutName));
    expect(names.has("Leg Day")).toBe(true);
    expect(names.has("Bench Press + Back Squat")).toBe(true);
    expect(names.has("Strength Training")).toBe(true);
  });

  it("uses session display title (detail parity) before exercise-derived fallback when custom name missing", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 400,
        exercises: [{ exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 4, weightKg: 100 }] }],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
      sessionDisplayHints: [
        {
          day: "2026-03-23",
          startAt: "2026-03-23T10:00:00.000Z",
          displayTitle: "Chest & Triceps",
        },
      ],
    });

    expect(out.workouts[0]?.workoutName).toBe("Chest & Triceps");
  });

  it("ignores generic reconciled title and falls back to exercise-derived label", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 400,
        exercises: [{ exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 4, weightKg: 100 }] }],
      }),
    ];

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
      sessionDisplayHints: [
        {
          day: "2026-03-23",
          startAt: "2026-03-23T10:00:00.000Z",
          displayTitle: "Strength Training",
        },
      ],
    });

    expect(out.workouts[0]?.workoutName).toBe("Bench Press");
  });

  it("matches same-day sessions by start minute to avoid cross-session title bleed", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 500,
        exercises: [{ exerciseId: "squat", name: "Back Squat", sets: [{ reps: 5, weightKg: 100 }] }],
      }),
      summary({
        sessionId: "s2",
        day: "2026-03-23",
        totalVolume: 400,
        exercises: [{ exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 4, weightKg: 100 }] }],
      }),
    ];
    rows[0]!.startedAt = "2026-03-23T10:00:15.000Z";
    rows[1]!.startedAt = "2026-03-23T18:00:30.000Z";

    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
      sessionDisplayHints: [
        { day: "2026-03-23", startAt: "2026-03-23T10:00:00.000Z", displayTitle: "Leg Day (Quads & Calves)" },
        { day: "2026-03-23", startAt: "2026-03-23T18:00:00.000Z", displayTitle: "Chest & Triceps" },
      ],
    });

    const byId = new Map(out.workouts.map((row) => [row.workoutId, row.workoutName]));
    expect(byId.get("s1")).toBe("Leg Day (Quads & Calves)");
    expect(byId.get("s2")).toBe("Chest & Triceps");
  });

  it("does not count warmup sets toward primary-muscle set totals", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 1000,
        exercises: [
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [
              { reps: 10, weightKg: 100, isWarmup: true },
              { reps: 10, weightKg: 100 },
            ],
          },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const chest = out.muscleGroupsSets.find((r) => r.muscleGroup === "chest");
    expect(chest?.totalSets).toBe(1);
  });

  it("counts non-warmup sets even when load is zero (sets tab is set-count based, not volume-based)", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: null,
        exercises: [
          {
            exerciseId: "bicep_curl",
            name: "Bicep Curl",
            sets: [
              { reps: 12, weightKg: 0 },
              { reps: 12, weightKg: 0 },
            ],
          },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const biceps = out.muscleGroupsSets.find((r) => r.muscleGroup === "biceps");
    expect(biceps?.totalSets).toBe(2);
  });

  it("attributes all exercise sets to primary muscle group only (full counts, not weighted)", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 4000,
        exercises: [
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [
              { reps: 10, weightKg: 100 },
              { reps: 10, weightKg: 100 },
              { reps: 10, weightKg: 100 },
              { reps: 10, weightKg: 100 },
            ],
          },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const chest = out.muscleGroupsSets.find((r) => r.muscleGroup === "chest");
    const triceps = out.muscleGroupsSets.find((r) => r.muscleGroup === "triceps");
    expect(chest?.totalSets).toBe(4);
    expect(triceps).toBeUndefined();
  });

  it("sums full sets per primary muscle across multiple exercises", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 5000,
        exercises: [
          {
            exerciseId: "bicep_curl",
            name: "DB Curl",
            sets: [
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
            ],
          },
          {
            exerciseId: "hammer_curl",
            name: "Hammer",
            sets: [
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
            ],
          },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    const biceps = out.muscleGroupsSets.find((r) => r.muscleGroup === "biceps");
    expect(biceps?.totalSets).toBe(9);
  });

  it("uses custom primary-group fallback map for unmapped custom exercise ids", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 500,
        exercises: [
          {
            exerciseId: "custom_u1_cable_bicep_curl",
            name: "Cable Bicep Curl",
            sets: [
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
              { reps: 10, weightKg: 20 },
            ],
          },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
      customPrimaryMuscleGroupByExerciseId: new Map([["custom_u1_cable_bicep_curl", "biceps"]]),
    });
    const biceps = out.muscleGroupsSets.find((r) => r.muscleGroup === "biceps");
    expect(biceps?.totalSets).toBe(3);
    const bicepsVol = out.muscleGroups.find((r) => r.muscleGroup === "biceps");
    expect(bicepsVol?.totalVolume).toBe(600);
  });

  it("derives session and weekly volume from canonical exercise volumes (not a stale totalVolume field)", () => {
    const rows: ManualWorkoutDaySummary[] = [
      summary({
        sessionId: "s1",
        day: "2026-03-23",
        totalVolume: 1000,
        exercises: [
          { exerciseId: "bench_press", name: "Bench Press", sets: [{ reps: 10, weightKg: 100 }] },
          { exerciseId: "squat", name: "Back Squat", sets: [{ reps: 10, weightKg: 100 }] },
        ],
      }),
    ];
    const out = buildWeeklyStrengthCardModel(rows, {
      weekStartDay: "2026-03-23",
      weekEndDay: "2026-03-29",
    });
    expect(out.workouts[0]?.totalVolume).toBe(2000);
    expect(out.totalVolume).toBe(2000);
  });
});
