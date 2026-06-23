import {
  buildMuscleGroupExercisePlan,
  getSelectedExercisesForMuscleGroup,
} from "@/lib/data/program/buildProgramExerciseRecommendations";
import {
  distributeMuscleGroupSetsToExercises,
  recommendedExerciseCount,
  TARGET_MAX_SETS_PER_SLOT,
} from "@/lib/data/program/distributeMuscleGroupSetsToExercises";
import { getProgramExerciseDetails } from "@/lib/data/program/getProgramExerciseDetails";
import { getExerciseSwapOptions, buildProgramExerciseSwapOptionsArgs } from "@/lib/data/program/getExerciseSwapOptions";
import { MIN_DESIRED_SWAP_OPTIONS } from "@/lib/data/program/programExerciseRecommendationTypes";
import { getLibraryCandidatesForMuscleGroup } from "@/lib/data/program/programMuscleGroupExerciseTaxonomy";
import { buildProgrammingPrescription } from "@/lib/data/program/buildProgrammingPrescription";
import { EXERCISE_LIBRARY_V1 } from "@/lib/workouts/exercises/library.v1";
import type { ProgrammingInputs } from "@/lib/data/program/programmingEngineTypes";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import { PROGRAM_DESIGN_MUSCLE_GROUP_ORDER } from "@/lib/data/program/workoutProgramDesignOptions";

const SAMPLE_INPUTS: ProgrammingInputs = {
  sex: "male",
  age: 28,
  trainingLevel: "intermediate",
  trainingDays: 4,
  goal: "build_muscle",
  trainingType: "hypertrophy",
};

describe("recommendedExerciseCount", () => {
  it("returns 0 exercises for 0 weekly sets", () => {
    expect(recommendedExerciseCount(0, 0)).toBe(0);
  });

  it("returns 1 exercise for 1–6 weekly sets", () => {
    expect(recommendedExerciseCount(1, 1)).toBe(1);
    expect(recommendedExerciseCount(6, 1)).toBe(1);
  });

  it("returns 2 exercises for 7–12 weekly sets", () => {
    expect(recommendedExerciseCount(7, 1)).toBe(2);
    expect(recommendedExerciseCount(12, 1)).toBe(2);
  });

  it("returns 2–3 exercises for 13–18 weekly sets", () => {
    expect(recommendedExerciseCount(13, 1)).toBeGreaterThanOrEqual(2);
    expect(recommendedExerciseCount(13, 1)).toBeLessThanOrEqual(3);
  });

  it("returns 3–4 exercises for 19+ weekly sets", () => {
    expect(recommendedExerciseCount(19, 1)).toBeGreaterThanOrEqual(3);
    expect(recommendedExerciseCount(19, 1)).toBeLessThanOrEqual(4);
  });
});

describe("distributeMuscleGroupSetsToExercises", () => {
  it("splits weekly sets evenly with remainder to earliest slots", () => {
    expect(distributeMuscleGroupSetsToExercises(7, 2)).toEqual([4, 3]);
    expect(distributeMuscleGroupSetsToExercises(13, 3)).toEqual([5, 4, 4]);
  });

  it("keeps no slot above TARGET_MAX_SETS_PER_SLOT when the chosen count makes it avoidable", () => {
    for (const weeklySets of [10, 14, 22]) {
      const count = recommendedExerciseCount(weeklySets, 2);
      if (Math.ceil(weeklySets / count) > TARGET_MAX_SETS_PER_SLOT) continue;
      const allocation = distributeMuscleGroupSetsToExercises(weeklySets, count);
      for (const slotSets of allocation) {
        expect(slotSets).toBeLessThanOrEqual(TARGET_MAX_SETS_PER_SLOT);
      }
    }
  });
});

describe("getExerciseSwapOptions", () => {
  const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);

  it("returns options filtered by muscle group", () => {
    const upperChest = getExerciseSwapOptions({
      muscleGroupId: "upper_chest",
      trainingType: prescription.inputs.trainingType,
      trainingLevel: prescription.inputs.trainingLevel,
    });
    expect(upperChest.length).toBeGreaterThan(0);
    for (const option of upperChest) {
      const item = EXERCISE_LIBRARY_V1.find((x) => x.exerciseId === option.exerciseId);
      expect(item).toBeDefined();
    }
  });

  it("returns at least 5 swap options for upper_chest when the library has enough", () => {
    const options = getExerciseSwapOptions({
      muscleGroupId: "upper_chest",
      trainingType: "hypertrophy",
      trainingLevel: "intermediate",
    });
    expect(options.length).toBeGreaterThanOrEqual(MIN_DESIRED_SWAP_OPTIONS);
  });

  it("does not rename or rewrite historical exercise ids", () => {
    const options = getExerciseSwapOptions({
      muscleGroupId: "mid_chest",
      trainingType: "hypertrophy",
      trainingLevel: "intermediate",
    });
    for (const option of options) {
      expect(option.exerciseId).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
      expect(EXERCISE_LIBRARY_V1.some((x) => x.exerciseId === option.exerciseId)).toBe(true);
    }
  });
});

describe("buildProgramExerciseSwapOptionsArgs", () => {
  const baseContext = {
    muscleGroupId: "quads" as const,
    trainingType: "hypertrophy" as const,
    trainingLevel: "intermediate" as const,
  };

  it("passes sourceExerciseId when the slot has a selected exercise", () => {
    const args = buildProgramExerciseSwapOptionsArgs({
      ...baseContext,
      selectedExerciseId: "hack_squat",
    });
    expect(args.sourceExerciseId).toBe("hack_squat");
    expect(args.intelligenceConstraints).toBeUndefined();
  });

  it("omits sourceExerciseId for empty slots", () => {
    const args = buildProgramExerciseSwapOptionsArgs({
      ...baseContext,
      selectedExerciseId: null,
    });
    expect(args.sourceExerciseId).toBeUndefined();
  });

  it("unseeded selected exercise preserves legacy swap ordering", () => {
    const legacy = getExerciseSwapOptions(baseContext).map((option) => option.exerciseId);
    const args = buildProgramExerciseSwapOptionsArgs({
      ...baseContext,
      selectedExerciseId: "pec_stretch",
    });
    expect(args.sourceExerciseId).toBe("pec_stretch");
    const withUnseededSource = getExerciseSwapOptions(args).map((option) => option.exerciseId);
    expect(withUnseededSource).toEqual(legacy);
  });

  it("seeded selected exercise enables intelligence-aware ordering", () => {
    const emptySlot = getExerciseSwapOptions(
      buildProgramExerciseSwapOptionsArgs({ ...baseContext, selectedExerciseId: null }),
    ).map((option) => option.exerciseId);
    const swappingFromHackSquat = getExerciseSwapOptions(
      buildProgramExerciseSwapOptionsArgs({
        ...baseContext,
        selectedExerciseId: "hack_squat",
      }),
    ).map((option) => option.exerciseId);
    expect(swappingFromHackSquat).not.toEqual(emptySlot);
    expect(swappingFromHackSquat.indexOf("leg_press")).toBeLessThan(
      emptySlot.indexOf("leg_press"),
    );
  });
});

describe("getProgramExerciseDetails", () => {
  it("returns truthful library fields for a bundled exercise", () => {
    const details = getProgramExerciseDetails("incline_bench_press");
    expect(details.name).toBe("Incline Bench Press");
    expect(details.equipment).toBe("Barbell");
    expect(details.movement).toBe("push");
    expect(details.primaryMuscles.length).toBeGreaterThan(0);
    expect(details.loggingType).toContain("rep");
    expect(details.origin).toBe("bundled");
  });
});

describe("buildMuscleGroupExercisePlan", () => {
  const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);

  it("does not preselect specific exercises — slots start empty", () => {
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    expect(plan.slots.length).toBeGreaterThan(0);
    for (const slot of plan.slots) {
      expect(slot.selectedExerciseId).toBeNull();
      expect(slot.selectedExerciseName).toBeNull();
      expect(slot.source).toBe("empty");
    }
  });

  it("uses 'Number of exercises' settings label via exerciseCount", () => {
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    expect(plan.settings.exerciseCount).toBe(plan.slots.length);
  });

  it("applies manual exercise selection with stable exercise id", () => {
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "lats",
    });
    const slotId = plan.slots[0]!.slotId;
    const swapId = "lat_pulldown";

    const selected = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "lats",
      selections: { lats: { [slotId]: swapId } },
    });
    expect(selected.slots[0]!.selectedExerciseId).toBe(swapId);
    expect(selected.slots[0]!.source).toBe("manual");
    expect(selected.slots[0]!.selectedExerciseName).toBeTruthy();
  });

  it("respects exercise count override", () => {
    const withTwo = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
      exerciseCountOverride: 2,
    });
    expect(withTwo.slots).toHaveLength(2);
  });

  it("getSelectedExercisesForMuscleGroup returns only filled slots", () => {
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    expect(getSelectedExercisesForMuscleGroup({
      prescription,
      muscleGroupId: "upper_chest",
    })).toHaveLength(0);

    const slotId = plan.slots[0]!.slotId;
    const selected = getSelectedExercisesForMuscleGroup({
      prescription,
      muscleGroupId: "upper_chest",
      selections: { upper_chest: { [slotId]: "incline_bench_press" } },
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]!.exerciseId).toBe("incline_bench_press");
    expect(selected[0]!.sets).toBeGreaterThan(0);
  });
});

describe("library coverage audit", () => {
  const thinGroups: ProgramDesignMuscleGroup[] = [];
  for (const muscleGroupId of PROGRAM_DESIGN_MUSCLE_GROUP_ORDER) {
    if (getLibraryCandidatesForMuscleGroup(muscleGroupId).length < MIN_DESIRED_SWAP_OPTIONS) {
      thinGroups.push(muscleGroupId);
    }
  }

  it("reports muscle groups with fewer than 5 library candidates", () => {
    expect(thinGroups).toContain("lower_traps");
    expect(thinGroups).toContain("tibialis");
    expect(thinGroups).toContain("neck");
  });
});
