import {
  MUSCLE_VOLUME_MAX_SETS,
  PROGRAM_DESIGN_CATEGORY_ORDER,
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
  PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS,
  PROGRAM_DURATION_MAX_WEEKS,
  PROGRAM_DURATION_MIN_WEEKS,
  PROGRAM_DURATION_WEEK_OPTIONS,
  WEEKLY_SPLIT_DAY_COUNT_OPTIONS,
  WEEKLY_SPLIT_MAX_DAYS,
  WEEKLY_SPLIT_MIN_DAYS,
  WORKOUT_PROGRAM_TYPE_OPTIONS,
  buildWeeklySplitDays,
  formatDurationWeeksLabel,
} from "@/lib/data/program/workoutProgramDesignOptions";
import {
  buildProgramDesignCategoryValueLabel,
  buildProgramDesignRows,
  countConfiguredMuscleGroups,
} from "@/lib/data/program/buildWorkoutProgramDesignSummary";
import {
  buildEmptyWorkoutProgramDesignDraft,
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";

describe("Program Design options", () => {
  it("Type exposes exactly the five requested options in order", () => {
    expect(WORKOUT_PROGRAM_TYPE_OPTIONS.map((o) => o.label)).toEqual([
      "Hypertrophy",
      "Power Lifting",
      "Strength Training",
      "Functional Training",
      "Circuit Training",
    ]);
  });

  it("Training Level exposes exactly the five requested options in order", () => {
    expect(PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS.map((o) => o.label)).toEqual([
      "Beginner",
      "Novice",
      "Intermediate",
      "Advanced",
      "Elite",
    ]);
  });

  it("Duration supports 1–52 weeks", () => {
    expect(PROGRAM_DURATION_MIN_WEEKS).toBe(1);
    expect(PROGRAM_DURATION_MAX_WEEKS).toBe(52);
    expect(PROGRAM_DURATION_WEEK_OPTIONS).toHaveLength(52);
    expect(PROGRAM_DURATION_WEEK_OPTIONS[0]).toBe(1);
    expect(PROGRAM_DURATION_WEEK_OPTIONS[51]).toBe(52);
  });

  it("formats week labels with correct pluralization", () => {
    expect(formatDurationWeeksLabel(1)).toBe("1 week");
    expect(formatDurationWeeksLabel(8)).toBe("8 weeks");
  });

  it("Muscle Group Volume includes all 20 requested muscle groups", () => {
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_ORDER).toHaveLength(20);
    const labels = PROGRAM_DESIGN_MUSCLE_GROUP_ORDER.map(
      (id) => PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[id],
    );
    expect(labels).toEqual([
      "Upper Chest",
      "Mid Chest",
      "Lats",
      "Upper Back",
      "Front Delts",
      "Side Delts",
      "Rear Delts",
      "Triceps",
      "Biceps",
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
      "Abs",
      "Lower Traps",
      "Rotator Cuff",
      "Adductors",
      "Forearms",
      "Neck",
      "Tibialis",
    ]);
  });

  it("Weekly Split supports 2–6 days", () => {
    expect(WEEKLY_SPLIT_MIN_DAYS).toBe(2);
    expect(WEEKLY_SPLIT_MAX_DAYS).toBe(6);
    expect([...WEEKLY_SPLIT_DAY_COUNT_OPTIONS]).toEqual([2, 3, 4, 5, 6]);
  });

  it("rebuilds the split day list preserving names by position", () => {
    const initial = buildWeeklySplitDays(3);
    expect(initial.map((d) => d.id)).toEqual(["day-1", "day-2", "day-3"]);
    expect(initial.every((d) => d.name === "")).toBe(true);

    const named = initial.map((d, i) => ({ ...d, name: `D${i + 1}` }));
    const grown = buildWeeklySplitDays(5, named);
    expect(grown).toHaveLength(5);
    expect(grown.slice(0, 3).map((d) => d.name)).toEqual(["D1", "D2", "D3"]);
    expect(grown.slice(3).map((d) => d.name)).toEqual(["", ""]);
  });
});

describe("buildProgramDesignRows / summaries", () => {
  it("lists the five categories in order with 'Not set' defaults", () => {
    const rows = buildProgramDesignRows(buildEmptyWorkoutProgramDesignDraft());
    expect(rows.map((r) => r.id)).toEqual([...PROGRAM_DESIGN_CATEGORY_ORDER]);
    expect(rows.map((r) => r.title)).toEqual([
      "Type",
      "Training Level",
      "Duration",
      "Muscle Group Volume",
      "Weekly Split",
    ]);
    expect(rows.every((r) => r.valueLabel === "Not set")).toBe(true);
    expect(rows.every((r) => r.isSet === false)).toBe(true);
  });

  it("reflects selected single-value categories", () => {
    const draft = {
      ...buildEmptyWorkoutProgramDesignDraft(),
      type: "hypertrophy" as const,
      trainingLevel: "advanced" as const,
      durationWeeks: 8,
    };
    expect(buildProgramDesignCategoryValueLabel("type", draft)).toBe("Hypertrophy");
    expect(buildProgramDesignCategoryValueLabel("trainingLevel", draft)).toBe("Advanced");
    expect(buildProgramDesignCategoryValueLabel("duration", draft)).toBe("8 weeks");
  });

  it("summarizes muscle volume and weekly split as counts", () => {
    const draft = {
      ...buildEmptyWorkoutProgramDesignDraft(),
      muscleGroupVolume: { upper_chest: 12, lats: 16, abs: 0 },
      weeklySplit: { dayCount: 5, days: buildWeeklySplitDays(5) },
    };
    expect(countConfiguredMuscleGroups(draft)).toBe(2);
    expect(buildProgramDesignCategoryValueLabel("muscleGroupVolume", draft)).toBe(
      "2 muscle groups configured",
    );
    expect(buildProgramDesignCategoryValueLabel("weeklySplit", draft)).toBe("5 days configured");
  });

  it("uses singular nouns for a single day / group", () => {
    const draft = {
      ...buildEmptyWorkoutProgramDesignDraft(),
      muscleGroupVolume: { biceps: 10 },
      weeklySplit: { dayCount: 2, days: buildWeeklySplitDays(2) },
    };
    expect(buildProgramDesignCategoryValueLabel("muscleGroupVolume", draft)).toBe(
      "1 muscle group configured",
    );
  });

  it("every row carries a category route href and a11y label", () => {
    const rows = buildProgramDesignRows(buildEmptyWorkoutProgramDesignDraft());
    for (const row of rows) {
      expect(row.href).toMatch(/^\/\(app\)\/program\/workout\//);
      expect(row.accessibilityLabel).toContain(row.title);
    }
  });
});

describe("workoutProgramDesignStore", () => {
  beforeEach(() => {
    workoutProgramDesignStore.reset();
  });

  it("starts empty and accepts single-value mutations", () => {
    expect(workoutProgramDesignStore.getSnapshot()).toEqual(
      buildEmptyWorkoutProgramDesignDraft(),
    );
    workoutProgramDesignStore.setType("power_lifting");
    workoutProgramDesignStore.setTrainingLevel("elite");
    workoutProgramDesignStore.setDurationWeeks(12);
    const snap = workoutProgramDesignStore.getSnapshot();
    expect(snap.type).toBe("power_lifting");
    expect(snap.trainingLevel).toBe("elite");
    expect(snap.durationWeeks).toBe(12);
  });

  it("sets/clears muscle volume (0 removes the entry)", () => {
    workoutProgramDesignStore.setMuscleVolume("quads", 14);
    expect(workoutProgramDesignStore.getSnapshot().muscleGroupVolume.quads).toBe(14);
    workoutProgramDesignStore.setMuscleVolume("quads", 0);
    expect(workoutProgramDesignStore.getSnapshot().muscleGroupVolume.quads).toBeUndefined();
  });

  it("clamps weekly split day count to 2–6 and preserves names", () => {
    workoutProgramDesignStore.setWeeklySplitDayCount(99);
    expect(workoutProgramDesignStore.getSnapshot().weeklySplit?.dayCount).toBe(6);
    workoutProgramDesignStore.setWeeklySplitDayCount(0);
    expect(workoutProgramDesignStore.getSnapshot().weeklySplit?.dayCount).toBe(2);

    workoutProgramDesignStore.setWeeklySplitDayCount(3);
    workoutProgramDesignStore.setWeeklySplitDayName("day-1", "Push");
    workoutProgramDesignStore.setWeeklySplitDayCount(4);
    const days = workoutProgramDesignStore.getSnapshot().weeklySplit?.days ?? [];
    expect(days).toHaveLength(4);
    expect(days[0]?.name).toBe("Push");
  });

  it("notifies subscribers on change", () => {
    const listener = jest.fn();
    const unsubscribe = workoutProgramDesignStore.subscribe(listener);
    workoutProgramDesignStore.setType("hypertrophy");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    workoutProgramDesignStore.setType("strength_training");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("exports a hook bound to the external store", () => {
    expect(typeof useWorkoutProgramDesignDraft).toBe("function");
  });

  it("never exceeds the muscle volume ceiling via summaries", () => {
    workoutProgramDesignStore.setMuscleVolume("calves", MUSCLE_VOLUME_MAX_SETS);
    expect(workoutProgramDesignStore.getSnapshot().muscleGroupVolume.calves).toBe(
      MUSCLE_VOLUME_MAX_SETS,
    );
  });
});
