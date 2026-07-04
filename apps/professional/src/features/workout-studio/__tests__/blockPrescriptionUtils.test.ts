import { createDefaultDesignedSets } from "../designedSetUtils";
import {
  applyBlockDefaultRest,
  applyBlockTargetSetCount,
  applyBlockDefaultsToNewExercise,
  DEFAULT_BLOCK_TARGET_SET_COUNT,
} from "../blockPrescriptionUtils";
import { createWorkoutStudioExerciseFromLibraryExercise } from "../createWorkoutStudioExerciseFromLibraryExercise";
import { createBlock } from "../workoutStudioDraft";
import type { WorkoutLibraryExercise } from "../exerciseLibraryAdapter";

const libraryExercise: WorkoutLibraryExercise = {
  exerciseId: "bench_press",
  name: "Bench Press",
  aliases: [],
  primaryMuscles: ["Chest"],
  secondaryMuscles: ["Triceps"],
  equipment: "Barbell",
  movementPattern: "push",
  primaryBucket: "Chest",
  trainingType: "strength",
  description: "",
  cues: [],
};

describe("blockPrescriptionUtils", () => {
  it("updates exercise designedSets when block target set count changes", () => {
    const block = createBlock("primaryLift", 0);
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const withExercise = { ...block, exercises: [exercise] };

    const next = applyBlockTargetSetCount(withExercise, 5);

    expect(next.targetSetCount).toBe(5);
    expect(next.exercises[0]?.designedSets).toHaveLength(5);
    expect(next.exercises[0]?.designedSets[4]?.setNumber).toBe(5);
  });

  it("preserves existing set values when shrinking and growing block set count", () => {
    const block = createBlock("primaryLift", 0);
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const customSets = createDefaultDesignedSets(4).map((set, index) => ({
      ...set,
      repRange: `${6 + index}`,
      rpeTarget: 7 + index,
    }));
    const customized = {
      ...exercise,
      designedSets: customSets,
      builderPrescription: {
        ...exercise.builderPrescription,
        customizeEachSet: true,
      },
    };
    const withExercise = {
      ...block,
      exercises: [customized],
    };

    const shrunk = applyBlockTargetSetCount(withExercise, 2);
    expect(shrunk.exercises[0]?.designedSets[0]?.repRange).toBe("6");
    expect(shrunk.exercises[0]?.designedSets[1]?.repRange).toBe("7");

    const grown = applyBlockTargetSetCount(shrunk, 4);
    expect(grown.exercises[0]?.designedSets[2]?.repRange).toBe("7");
    expect(grown.exercises[0]?.designedSets[3]?.repRange).toBe("7");
  });

  it("applies block default rest to all exercise sets", () => {
    const block = createBlock("accessory", 0);
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const withExercise = { ...block, exercises: [exercise] };

    const next = applyBlockDefaultRest(withExercise, 120);

    expect(next.defaultRestSeconds).toBe(120);
    expect(next.exercises[0]?.designedSets.every((set) => set.restSeconds === 120)).toBe(true);
  });

  it("applies block defaults when adding a new exercise", () => {
    const block = { ...createBlock("primaryLift", 0), targetSetCount: 4, defaultRestSeconds: 75 };
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);

    const next = applyBlockDefaultsToNewExercise(exercise, block);

    expect(next.designedSets).toHaveLength(4);
    expect(next.designedSets.every((set) => set.restSeconds === 75)).toBe(true);
    expect(block.targetSetCount).toBe(4);
    expect(DEFAULT_BLOCK_TARGET_SET_COUNT).toBe(3);
  });
});
