import {
  PROGRAM_DESIGN_AGE_MAX,
  PROGRAM_DESIGN_AGE_MIN,
  PROGRAM_DESIGN_AGE_OPTIONS,
  PROGRAM_DESIGN_CATEGORY_ORDER,
  PROGRAM_DESIGN_GOAL_OPTIONS,
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
  PROGRAM_DESIGN_SEX_OPTIONS,
  PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS,
  TRAINING_DAYS_COUNT_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  formatAgeLabel,
  formatTrainingDaysLabel,
} from "@/lib/data/program/workoutProgramDesignOptions";
import {
  buildProgramDesignCategoryValueLabel,
  buildProgramDesignRows,
  isProgramDesignCategorySet,
} from "@/lib/data/program/buildWorkoutProgramDesignSummary";
import {
  buildEmptyWorkoutProgramDesignDraft,
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";

describe("Program Design options", () => {
  it("Sex exposes Male/Female in order", () => {
    expect(PROGRAM_DESIGN_SEX_OPTIONS.map((o) => o.label)).toEqual(["Male", "Female"]);
  });

  it("Age supports 13–90 years", () => {
    expect(PROGRAM_DESIGN_AGE_MIN).toBe(13);
    expect(PROGRAM_DESIGN_AGE_MAX).toBe(90);
    expect(PROGRAM_DESIGN_AGE_OPTIONS).toHaveLength(90 - 13 + 1);
    expect(PROGRAM_DESIGN_AGE_OPTIONS[0]).toEqual({ id: "13", label: "13 years" });
    expect(formatAgeLabel(1)).toBe("1 year");
    expect(formatAgeLabel(28)).toBe("28 years");
  });

  it("Training Level exposes the five tiers in order", () => {
    expect(PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS.map((o) => o.label)).toEqual([
      "Beginner",
      "Novice",
      "Intermediate",
      "Advanced",
      "Elite",
    ]);
  });

  it("Training Days supports 2–6 days", () => {
    expect([...TRAINING_DAYS_COUNT_OPTIONS]).toEqual([2, 3, 4, 5, 6]);
    expect(formatTrainingDaysLabel(1)).toBe("1 day");
    expect(formatTrainingDaysLabel(4)).toBe("4 days");
  });

  it("Goal exposes the five goal options", () => {
    expect(PROGRAM_DESIGN_GOAL_OPTIONS.map((o) => o.label)).toEqual([
      "General Health",
      "Build Muscle",
      "Gain Strength",
      "Lose Fat",
      "Athletic Performance",
    ]);
  });

  it("Training Type exposes exactly the six requested options in order", () => {
    expect(TRAINING_TYPE_OPTIONS.map((o) => o.label)).toEqual([
      "General Fitness",
      "Hypertrophy",
      "Strength",
      "Powerlifting",
      "Athletic Performance",
      "Conditioning",
    ]);
  });

  it("includes all 20 canonical muscle groups", () => {
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_ORDER).toHaveLength(20);
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_LABEL.upper_chest).toBe("Upper Chest");
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_LABEL.tibialis).toBe("Tibialis");
  });

  it("orders the six categories as requested", () => {
    expect([...PROGRAM_DESIGN_CATEGORY_ORDER]).toEqual([
      "sex",
      "age",
      "trainingLevel",
      "trainingDays",
      "goal",
      "trainingType",
    ]);
  });
});

describe("buildProgramDesignRows / summaries", () => {
  it("lists the six categories in order with 'Not set' defaults", () => {
    const rows = buildProgramDesignRows(buildEmptyWorkoutProgramDesignDraft());
    expect(rows.map((r) => r.id)).toEqual([...PROGRAM_DESIGN_CATEGORY_ORDER]);
    expect(rows.map((r) => r.title)).toEqual([
      "Sex",
      "Age",
      "Training Level",
      "Training Days",
      "Goal",
      "Training Type",
    ]);
    expect(rows.every((r) => r.valueLabel === "Not set")).toBe(true);
    expect(rows.every((r) => r.isSet === false)).toBe(true);
  });

  it("reflects selected category values", () => {
    const draft = {
      ...buildEmptyWorkoutProgramDesignDraft(),
      sex: "female" as const,
      age: 31,
      trainingLevel: "advanced" as const,
      trainingDays: 5,
      goal: "build_muscle" as const,
      trainingType: "hypertrophy" as const,
    };
    expect(buildProgramDesignCategoryValueLabel("sex", draft)).toBe("Female");
    expect(buildProgramDesignCategoryValueLabel("age", draft)).toBe("31 years");
    expect(buildProgramDesignCategoryValueLabel("trainingLevel", draft)).toBe("Advanced");
    expect(buildProgramDesignCategoryValueLabel("trainingDays", draft)).toBe("5 days");
    expect(buildProgramDesignCategoryValueLabel("goal", draft)).toBe("Build Muscle");
    expect(buildProgramDesignCategoryValueLabel("trainingType", draft)).toBe("Hypertrophy");
    expect(isProgramDesignCategorySet("trainingType", draft)).toBe(true);
    expect(isProgramDesignCategorySet("trainingType", buildEmptyWorkoutProgramDesignDraft())).toBe(
      false,
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

  it("starts empty and accepts the six input mutations", () => {
    expect(workoutProgramDesignStore.getSnapshot()).toEqual(buildEmptyWorkoutProgramDesignDraft());
    workoutProgramDesignStore.setSex("male");
    workoutProgramDesignStore.setAge(28);
    workoutProgramDesignStore.setTrainingLevel("intermediate");
    workoutProgramDesignStore.setTrainingDays(4);
    workoutProgramDesignStore.setGoal("gain_strength");
    workoutProgramDesignStore.setTrainingType("strength");
    const snap = workoutProgramDesignStore.getSnapshot();
    expect(snap.sex).toBe("male");
    expect(snap.age).toBe(28);
    expect(snap.trainingLevel).toBe("intermediate");
    expect(snap.trainingDays).toBe(4);
    expect(snap.goal).toBe("gain_strength");
    expect(snap.trainingType).toBe("strength");
  });

  it("clamps age to 13–90 and training days to 2–6", () => {
    workoutProgramDesignStore.setAge(5);
    expect(workoutProgramDesignStore.getSnapshot().age).toBe(13);
    workoutProgramDesignStore.setAge(200);
    expect(workoutProgramDesignStore.getSnapshot().age).toBe(90);
    workoutProgramDesignStore.setTrainingDays(99);
    expect(workoutProgramDesignStore.getSnapshot().trainingDays).toBe(6);
    workoutProgramDesignStore.setTrainingDays(0);
    expect(workoutProgramDesignStore.getSnapshot().trainingDays).toBe(2);
  });

  it("sets and clears manual muscle volume overrides (0 is a valid override)", () => {
    workoutProgramDesignStore.setMuscleVolumeOverride("quads", 14);
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.quads).toBe(14);
    workoutProgramDesignStore.setMuscleVolumeOverride("quads", 0);
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.quads).toBe(0);
    workoutProgramDesignStore.clearMuscleVolumeOverride("quads");
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.quads).toBeUndefined();
  });

  it("clamps override values to the stepper bounds", () => {
    workoutProgramDesignStore.setMuscleVolumeOverride("calves", 999);
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.calves).toBe(30);
    workoutProgramDesignStore.setMuscleVolumeOverride("calves", -5);
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.calves).toBe(0);
  });

  it("records split day name overrides by id", () => {
    workoutProgramDesignStore.setSplitDayName("day-1", "Push");
    expect(workoutProgramDesignStore.getSnapshot().splitDayNameOverrides["day-1"]).toBe("Push");
  });

  it("notifies subscribers on change", () => {
    const listener = jest.fn();
    const unsubscribe = workoutProgramDesignStore.subscribe(listener);
    workoutProgramDesignStore.setSex("male");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    workoutProgramDesignStore.setSex("female");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("exports a hook bound to the external store", () => {
    expect(typeof useWorkoutProgramDesignDraft).toBe("function");
  });
});
