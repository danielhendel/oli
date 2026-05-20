import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import {
  aggregateWorkoutDetailMuscleSetVolume,
  buildWeeklyWorkingSetExerciseRowsByMuscle,
  buildWeeklyWorkingSetVolumeRows,
  buildWorkoutDetailMuscleVolumeRows,
  buildWorkoutDetailWorkingSetExerciseRowsByMuscle,
  buildWorkoutDetailWorkingSetVolumeRows,
  countWorkoutDetailTotalVolumeSetsForExercise,
  isWorkoutDetailWorkingSet,
  sumMuscleSetCountRows,
  sumWorkoutDetailTotalVolumeSets,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import type {
  ManualWorkoutDaySummary,
  ManualWorkoutExerciseSummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";

function customRecord(partial: Partial<CustomExerciseRecord> & Pick<CustomExerciseRecord, "exerciseId" | "name">): CustomExerciseRecord {
  return {
    equipment: "Cable",
    primary: "Biceps",
    loggingType: "weight_reps",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("workoutDetailMuscleVolume", () => {
  it("identifies working sets as RPE 7–10 only", () => {
    expect(isWorkoutDetailWorkingSet(null)).toBe(false);
    expect(isWorkoutDetailWorkingSet(6)).toBe(false);
    expect(isWorkoutDetailWorkingSet(7)).toBe(true);
    expect(isWorkoutDetailWorkingSet(10)).toBe(true);
    expect(isWorkoutDetailWorkingSet(11)).toBe(false);
  });

  it("counts all logged sets for Total Volume per exercise (includes warm-up and unrated)", () => {
    const exercise: ManualWorkoutExerciseSummary = {
      exerciseId: "bench_press",
      name: "Bench Press",
      sets: [
        { setNumber: 1, reps: 10, weightKg: 100, intensity: 8, isWarmup: true },
        { setNumber: 2, reps: 10, weightKg: 100, intensity: null },
        { setNumber: 3, reps: 10, weightKg: 100, intensity: 5 },
      ],
    };
    expect(countWorkoutDetailTotalVolumeSetsForExercise(exercise)).toBe(3);
    expect(sumWorkoutDetailTotalVolumeSets([exercise])).toBe(3);
  });

  it("attributes total sets to primary muscle only with mixed RPE and warm-up", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: 7 },
          { setNumber: 3, reps: 10, weightKg: 100, intensity: 5 },
          { setNumber: 4, reps: 10, weightKg: 100, intensity: null },
          { setNumber: 5, reps: 10, weightKg: 100, intensity: 4, isWarmup: true },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows).toHaveLength(1);
    expect(out.totalVolumeRows[0]?.muscleGroup).toBe("chest");
    expect(out.totalVolumeRows[0]?.setCount).toBe(5);
    expect(out.workingSetVolumeRows[0]?.setCount).toBe(2);
    expect(out.totalUnassignedSetCount).toBe(0);
  });

  it("counts only RPE 7–10 for working set volume and excludes <=6 and unrated", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: 7 },
          { setNumber: 3, reps: 10, weightKg: 100, intensity: 5 },
          { setNumber: 4, reps: 10, weightKg: 100, intensity: null },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows[0]?.setCount).toBe(4);
    expect(out.workingSetVolumeRows[0]?.setCount).toBe(2);
    expect(sumMuscleSetCountRows(out.totalVolumeRows)).toBe(4);
    expect(sumMuscleSetCountRows(out.workingSetVolumeRows)).toBe(2);
  });

  it("allows Total == Working when every set is RPE 7–10", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 10 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: 7 },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows[0]?.setCount).toBe(2);
    expect(out.workingSetVolumeRows[0]?.setCount).toBe(2);
  });

  it("reports unassigned sets when primary muscle cannot be resolved", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "custom_unknown_move",
        name: "Mystery Move",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 20, intensity: 7 },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows).toEqual([]);
    expect(out.totalUnassignedSetCount).toBe(2);
    expect(out.workingUnassignedSetCount).toBe(2);
  });

  it("maps custom exercises via customExerciseById analytics context", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_weird",
          customRecord({
            exerciseId: "custom_u1_weird",
            name: "Zebra Curl Ultra",
            primary: "Biceps",
          }),
        ],
      ]),
    };
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "custom_u1_weird",
        name: "Zebra Curl Ultra",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 20, intensity: 6 },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises, ctx);
    expect(out.totalVolumeRows[0]?.muscleGroup).toBe("biceps");
    expect(out.totalVolumeRows[0]?.setCount).toBe(2);
    expect(out.workingSetVolumeRows[0]?.setCount).toBe(1);
    expect(out.totalUnassignedSetCount).toBe(0);
  });

  it("resolves synthetic ingest ids via fallback exercise name", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "exercise:ingested:raw1:0",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 10, weightKg: 100, intensity: 8 }],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows[0]?.muscleGroup).toBe("chest");
    expect(out.totalVolumeRows[0]?.setCount).toBe(1);
  });

  it("resolves exercises with blank exerciseId via display name fallback", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 10, weightKg: 100, intensity: 8 }],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(out.totalVolumeRows[0]?.muscleGroup).toBe("chest");
    expect(out.totalUnassignedSetCount).toBe(0);
  });

  it("exercise row total set sum equals assigned muscle totals plus unassigned", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: null },
        ],
      },
      {
        exerciseId: "custom_unknown_move",
        name: "Mystery Move",
        sets: [{ setNumber: 1, reps: 10, weightKg: 20, intensity: 9 }],
      },
    ];
    const displayedSum = exercises.reduce(
      (sum, ex) => sum + countWorkoutDetailTotalVolumeSetsForExercise(ex),
      0,
    );
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(displayedSum).toBe(
      sumMuscleSetCountRows(out.totalVolumeRows) + out.totalUnassignedSetCount,
    );
  });

  describe("buildWorkoutDetailWorkingSetExerciseRowsByMuscle", () => {
    it("returns empty when no qualifying RPE 7–10 sets exist", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "bench_press",
          name: "Bench Press",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 100, intensity: 6 },
            { setNumber: 2, reps: 10, weightKg: 100, intensity: null },
          ],
        },
      ];
      expect(buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises)).toEqual({});
    });

    it("groups RPE 7–10 sets by primary muscle and per-exercise contribution", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "pull_up",
          name: "Pull Up",
          sets: [
            { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
            { setNumber: 2, reps: 8, weightKg: 0, intensity: 7 },
            { setNumber: 3, reps: 8, weightKg: 0, intensity: 9 },
            { setNumber: 4, reps: 8, weightKg: 0, intensity: 10 },
          ],
        },
        {
          exerciseId: "barbell_row",
          name: "Barbell Row",
          sets: [
            { setNumber: 1, reps: 8, weightKg: 80, intensity: 8 },
            { setNumber: 2, reps: 8, weightKg: 80, intensity: 7 },
            { setNumber: 3, reps: 8, weightKg: 80, intensity: 5 },
            { setNumber: 4, reps: 8, weightKg: 80, intensity: 9 },
          ],
        },
        {
          exerciseId: "lat_pulldown",
          name: "Lat Pulldown",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 50, intensity: 7 },
            { setNumber: 2, reps: 10, weightKg: 50, intensity: 8 },
          ],
        },
      ];
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises);
      expect(Object.keys(byMuscle)).toEqual(["back"]);
      expect(byMuscle.back).toEqual([
        { exerciseName: "Pull Up", setCount: 4 },
        { exerciseName: "Barbell Row", setCount: 3 },
        { exerciseName: "Lat Pulldown", setCount: 2 },
      ]);
    });

    it("per-muscle exercise sums equal the parent working volume rows", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "pull_up",
          name: "Pull Up",
          sets: [
            { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
            { setNumber: 2, reps: 8, weightKg: 0, intensity: 8 },
          ],
        },
        {
          exerciseId: "barbell_row",
          name: "Barbell Row",
          sets: [
            { setNumber: 1, reps: 8, weightKg: 80, intensity: 7 },
            { setNumber: 2, reps: 8, weightKg: 80, intensity: 5 },
          ],
        },
      ];
      const muscleRows = buildWorkoutDetailWorkingSetVolumeRows(exercises);
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises);
      for (const row of muscleRows) {
        const exerciseSum = (byMuscle[row.muscleGroup] ?? []).reduce((s, r) => s + r.setCount, 0);
        expect(exerciseSum).toBe(row.setCount);
      }
    });

    it("excludes RPE <= 6 and missing RPE from contributing exercises", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "bench_press",
          name: "Bench Press",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 100, intensity: 6 },
            { setNumber: 2, reps: 10, weightKg: 100, intensity: null },
            { setNumber: 3, reps: 10, weightKg: 100, intensity: 7 },
          ],
        },
      ];
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises);
      expect(byMuscle.chest).toEqual([{ exerciseName: "Bench Press", setCount: 1 }]);
    });

    it("attributes only to primary muscle (no secondary distribution)", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "bench_press",
          name: "Bench Press",
          sets: [{ setNumber: 1, reps: 10, weightKg: 100, intensity: 8 }],
        },
      ];
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises);
      expect(byMuscle.chest).toEqual([{ exerciseName: "Bench Press", setCount: 1 }]);
      expect(byMuscle.triceps).toBeUndefined();
      expect(byMuscle.shoulders).toBeUndefined();
    });

    it("maps custom exercises to primary muscle via analyticsCtx", () => {
      const ctx: ExerciseAnalyticsResolutionContext = {
        customExerciseById: new Map([
          [
            "custom_u1_weird",
            customRecord({
              exerciseId: "custom_u1_weird",
              name: "Zebra Curl Ultra",
              primary: "Biceps",
            }),
          ],
        ]),
      };
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "custom_u1_weird",
          name: "Zebra Curl Ultra",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
            { setNumber: 2, reps: 10, weightKg: 20, intensity: 7 },
          ],
        },
      ];
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises, ctx);
      expect(byMuscle.biceps).toEqual([{ exerciseName: "Zebra Curl Ultra", setCount: 2 }]);
    });

    it("drops sets with unresolvable primary muscle (no unassigned bucket exposed here)", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "custom_unknown_move",
          name: "Mystery Move",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
            { setNumber: 2, reps: 10, weightKg: 20, intensity: 7 },
          ],
        },
      ];
      expect(buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises)).toEqual({});
    });

    it("collapses duplicate journal rows for the same exercise into one row", () => {
      const exercises: ManualWorkoutExerciseSummary[] = [
        {
          exerciseId: "pull_up",
          name: "Pull Up",
          sets: [
            { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
            { setNumber: 2, reps: 8, weightKg: 0, intensity: 7 },
          ],
        },
        {
          exerciseId: "pull_up",
          name: "Pull Up",
          sets: [
            { setNumber: 3, reps: 8, weightKg: 0, intensity: 9 },
            { setNumber: 4, reps: 8, weightKg: 0, intensity: 10 },
          ],
        },
      ];
      const byMuscle = buildWorkoutDetailWorkingSetExerciseRowsByMuscle(exercises);
      expect(byMuscle.back).toEqual([{ exerciseName: "Pull Up", setCount: 4 }]);
    });
  });

  describe("buildWeeklyWorkingSetExerciseRowsByMuscle", () => {
    const weekStart = "2026-03-09" as const;
    const weekEnd = "2026-03-15" as const;

    function buildSummary(day: string, exercises: ManualWorkoutExerciseSummary[]): ManualWorkoutDaySummary {
      return {
        sessionId: `s-${day}`,
        day,
        startedAt: `${day}T10:00:00.000Z`,
        customName: null,
        totalVolume: null,
        avgIntensity: null,
        exercises,
      };
    }

    it("only includes summaries within the week window", () => {
      const summaries: ManualWorkoutDaySummary[] = [
        buildSummary("2026-03-02", [
          {
            exerciseId: "pull_up",
            name: "Pull Up",
            sets: [{ setNumber: 1, reps: 8, weightKg: 0, intensity: 8 }],
          },
        ]),
        buildSummary("2026-03-12", [
          {
            exerciseId: "barbell_row",
            name: "Barbell Row",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 80, intensity: 8 },
              { setNumber: 2, reps: 8, weightKg: 80, intensity: 7 },
            ],
          },
        ]),
      ];
      const byMuscle = buildWeeklyWorkingSetExerciseRowsByMuscle(summaries, {
        weekStartDay: weekStart,
        weekEndDay: weekEnd,
      });
      expect(byMuscle.back).toEqual([{ exerciseName: "Barbell Row", setCount: 2 }]);
    });

    it("sums duplicate exercise rows across days within the week window", () => {
      const summaries: ManualWorkoutDaySummary[] = [
        buildSummary("2026-03-10", [
          {
            exerciseId: "pull_up",
            name: "Pull Up",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
              { setNumber: 2, reps: 8, weightKg: 0, intensity: 9 },
            ],
          },
        ]),
        buildSummary("2026-03-13", [
          {
            exerciseId: "pull_up",
            name: "Pull Up",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 0, intensity: 7 },
              { setNumber: 2, reps: 8, weightKg: 0, intensity: 10 },
            ],
          },
        ]),
      ];
      const byMuscle = buildWeeklyWorkingSetExerciseRowsByMuscle(summaries, {
        weekStartDay: weekStart,
        weekEndDay: weekEnd,
      });
      expect(byMuscle.back).toEqual([{ exerciseName: "Pull Up", setCount: 4 }]);
    });

    it("matches buildWeeklyWorkingSetVolumeRows totals per muscle (no duplicate algorithm)", () => {
      const summaries: ManualWorkoutDaySummary[] = [
        buildSummary("2026-03-10", [
          {
            exerciseId: "pull_up",
            name: "Pull Up",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 0, intensity: 8 },
              { setNumber: 2, reps: 8, weightKg: 0, intensity: 8 },
            ],
          },
          {
            exerciseId: "barbell_row",
            name: "Barbell Row",
            sets: [
              { setNumber: 1, reps: 8, weightKg: 80, intensity: 7 },
              { setNumber: 2, reps: 8, weightKg: 80, intensity: 9 },
              { setNumber: 3, reps: 8, weightKg: 80, intensity: 5 },
            ],
          },
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [{ setNumber: 1, reps: 10, weightKg: 100, intensity: 8 }],
          },
        ]),
      ];
      const opts = { weekStartDay: weekStart, weekEndDay: weekEnd };
      const muscleRows = buildWeeklyWorkingSetVolumeRows(summaries, opts);
      const byMuscle = buildWeeklyWorkingSetExerciseRowsByMuscle(summaries, opts);
      for (const row of muscleRows) {
        const exerciseSum = (byMuscle[row.muscleGroup] ?? []).reduce((s, r) => s + r.setCount, 0);
        expect(exerciseSum).toBe(row.setCount);
      }
    });

    it("threads analyticsCtx through to custom exercise resolution", () => {
      const ctx: ExerciseAnalyticsResolutionContext = {
        customExerciseById: new Map([
          [
            "custom_zebra",
            customRecord({
              exerciseId: "custom_zebra",
              name: "Zebra Curl",
              primary: "Biceps",
            }),
          ],
        ]),
      };
      const summaries: ManualWorkoutDaySummary[] = [
        buildSummary("2026-03-11", [
          {
            exerciseId: "custom_zebra",
            name: "Zebra Curl",
            sets: [{ setNumber: 1, reps: 10, weightKg: 20, intensity: 8 }],
          },
        ]),
      ];
      const byMuscle = buildWeeklyWorkingSetExerciseRowsByMuscle(summaries, {
        weekStartDay: weekStart,
        weekEndDay: weekEnd,
        analyticsCtx: ctx,
      });
      expect(byMuscle.biceps).toEqual([{ exerciseName: "Zebra Curl", setCount: 1 }]);
    });
  });

  it("buildWorkoutDetailMuscleVolumeRows and buildWorkoutDetailWorkingSetVolumeRows match aggregate", () => {
    const exercises: ManualWorkoutExerciseSummary[] = [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: 5 },
        ],
      },
    ];
    const out = aggregateWorkoutDetailMuscleSetVolume(exercises);
    expect(buildWorkoutDetailMuscleVolumeRows(exercises)).toEqual(out.totalVolumeRows);
    expect(buildWorkoutDetailWorkingSetVolumeRows(exercises)).toEqual(out.workingSetVolumeRows);
  });
});
