import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { buildWeeklyWorkingSetVolumeRows } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import type {
  ManualWorkoutDaySummary,
  ManualWorkoutExerciseSummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";

function daySummary(
  day: string,
  exercises: ManualWorkoutExerciseSummary[],
): ManualWorkoutDaySummary {
  return {
    day,
    sessionId: `session-${day}`,
    startedAt: null,
    customName: null,
    totalVolume: null,
    avgIntensity: null,
    exercises,
  };
}

function benchSets(intensities: (number | null)[]): ManualWorkoutExerciseSummary {
  return {
    exerciseId: "bench_press",
    name: "Bench Press",
    sets: intensities.map((intensity, i) => ({
      setNumber: i + 1,
      reps: 10,
      weightKg: 100,
      intensity,
    })),
  };
}

describe("buildWeeklyWorkingSetVolumeRows", () => {
  const weekStart = "2026-03-09" as const;
  const weekEnd = "2026-03-15" as const;

  it("returns no rows when no working volume exists in the week", () => {
    const summaries = [
      daySummary("2026-03-12", [benchSets([5, null, 6])]),
    ];
    expect(buildWeeklyWorkingSetVolumeRows(summaries, { weekStartDay: weekStart, weekEndDay: weekEnd })).toEqual(
      [],
    );
  });

  it("counts RPE 7–10 sets by primary muscle", () => {
    const summaries = [
      daySummary("2026-03-12", [benchSets([8, 7, 10])]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.muscleGroup).toBe("chest");
    expect(rows[0]?.setCount).toBe(3);
  });

  it("excludes RPE <= 6 and missing RPE", () => {
    const summaries = [
      daySummary("2026-03-12", [benchSets([8, 6, 5, null])]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows[0]?.setCount).toBe(1);
  });

  it("aggregates working sets across multiple workouts in the same week", () => {
    const summaries = [
      daySummary("2026-03-10", [benchSets([8])]),
      daySummary("2026-03-14", [benchSets([9, 7])]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows[0]?.setCount).toBe(3);
  });

  it("ignores workouts outside the calendar week window", () => {
    const summaries = [
      daySummary("2026-03-08", [benchSets([10])]),
      daySummary("2026-03-12", [benchSets([8])]),
      daySummary("2026-03-16", [benchSets([9])]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows[0]?.setCount).toBe(1);
  });

  it("attributes working sets to primary muscle only (not secondary)", () => {
    const summaries = [daySummary("2026-03-12", [benchSets([8])])];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows).toEqual([{ muscleGroup: "chest", setCount: 1 }]);
    expect(rows.some((row) => row.muscleGroup === "triceps")).toBe(false);
  });

  it("excludes unmapped exercises without throwing", () => {
    const summaries = [
      daySummary("2026-03-12", [
        {
          exerciseId: "custom_unknown_move",
          name: "Mystery Move",
          sets: [{ setNumber: 1, reps: 10, weightKg: 20, intensity: 8 }],
        },
        benchSets([8]),
      ]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.muscleGroup).toBe("chest");
    expect(rows[0]?.setCount).toBe(1);
  });

  it("maps custom exercises via customExerciseById analytics context", () => {
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
    const summaries = [
      daySummary("2026-03-12", [
        {
          exerciseId: "custom_u1_weird",
          name: "Zebra Curl Ultra",
          sets: [
            { setNumber: 1, reps: 10, weightKg: 20, intensity: 8 },
            { setNumber: 2, reps: 10, weightKg: 20, intensity: 6 },
          ],
        },
      ]),
    ];
    const rows = buildWeeklyWorkingSetVolumeRows(summaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      analyticsCtx: ctx,
    });
    expect(rows[0]?.muscleGroup).toBe("biceps");
    expect(rows[0]?.setCount).toBe(1);
  });
});
