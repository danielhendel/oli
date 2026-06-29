import { buildAppWorkoutDraftPayload } from "../buildAppWorkoutDraftPayload";
import { buildWorkoutProjectedVolume } from "../buildWorkoutProjectedVolume";
import {
  addDesignedSet,
  updateDesignedSet,
} from "../designedSetUtils";
import { listCanonicalWorkoutLibraryExercises } from "../exerciseLibraryAdapter";
import { summarizeExerciseForCanvas } from "../exerciseSummaryUtils";
import {
  closeExerciseExperience,
  openExerciseExperience,
  resolveExerciseExperienceContext,
} from "../exerciseExperienceWorkspace";
import {
  addBlock,
  addExerciseFromLibrary,
  createEmptyWorkoutExperience,
  duplicateExercise,
  seedSampleWorkout,
  updateExercise,
} from "../workoutStudioDraft";
import { applyMediaComposerPatch } from "../../exercise-media-os/buildMediaComposerState";
import { buildExerciseClientExperiencePreview } from "../../../components/workout-studio/buildExerciseClientExperiencePreview";

describe("exerciseExperienceWorkspace", () => {
  it("opening exercise experience does not mutate workout data", () => {
    const workout = seedSampleWorkout();
    const block = workout.blocks[0];
    const exercise = block?.exercises[0];
    expect(block).toBeDefined();
    expect(exercise).toBeDefined();

    const before = JSON.stringify(workout);
    const ref = openExerciseExperience({
      blockId: block!.id,
      exerciseCardId: exercise!.id,
    });
    expect(ref).toEqual({
      blockId: block!.id,
      exerciseCardId: exercise!.id,
    });
    expect(closeExerciseExperience()).toBeNull();
    expect(JSON.stringify(workout)).toBe(before);
  });

  it("resolves exercise context from workout draft", () => {
    const workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    const context = resolveExerciseExperienceContext(workout, {
      blockId: block.id,
      exerciseCardId: exercise.id,
    });

    expect(context?.exercise.exerciseId).toBe("bench_press");
    expect(context?.blockTitle.length).toBeGreaterThan(0);
  });

  it("updates sets in experience studio flow through workout draft updateExercise", () => {
    let workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    workout = updateExercise(workout, block.id, exercise.id, {
      designedSets: addDesignedSet(exercise.designedSets),
    });

    const updated = workout.blocks[0]?.exercises[0];
    expect(updated?.designedSets).toHaveLength(4);
    expect(summarizeExerciseForCanvas(updated!).setCount).toBe(4);
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(4);
  });

  it("updates media composer in experience studio flow", () => {
    let workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    const nextComposer = applyMediaComposerPatch(exercise.mediaComposer, {
      coachMessage: "Focus on controlled tempo today.",
      selectedTodayFocus: "tempo",
      selectedVisualEmphasis: "tempo",
    });

    workout = updateExercise(workout, block.id, exercise.id, {
      mediaComposer: nextComposer,
    });

    const updatedBlock = workout.blocks[0];
    expect(updatedBlock).toBeDefined();
    const updated = updatedBlock!.exercises[0];
    expect(updated).toBeDefined();
    const preview = buildExerciseClientExperiencePreview(updated as NonNullable<typeof updated>);
    expect(preview.coachMessage).toBe("Focus on controlled tempo today.");
    expect(preview.goalTitle.length).toBeGreaterThan(0);
  });

  it("compact exercise summary reflects designed set count", () => {
    const workout = seedSampleWorkout();
    const block = workout.blocks[0];
    expect(block).toBeDefined();
    const exercise = block!.exercises[0];
    expect(exercise).toBeDefined();
    expect(summarizeExerciseForCanvas(exercise as NonNullable<typeof exercise>).setCount).toBe(3);
  });

  it("closing studio preserves edits made while open", () => {
    let workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    workout = updateExercise(workout, block.id, exercise.id, {
      designedSets: updateDesignedSet(exercise.designedSets, exercise.designedSets[0]!.setId, {
        repRange: "6-8",
      }),
    });

    const afterClose = workout.blocks[0]?.exercises[0]?.designedSets[0]?.repRange;
    expect(afterClose).toBe("6-8");
  });

  it("duplicate preserves exerciseId and designedSets", () => {
    let workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    workout = duplicateExercise(workout, block.id, exercise.id);
    const copy = workout.blocks[0]?.exercises[1];
    expect(copy?.exerciseId).toBe("bench_press");
    expect(copy?.designedSets).toHaveLength(3);
    expect(copy?.id).not.toBe(exercise.id);
  });

  it("buildAppWorkoutDraftPayload unchanged shape after experience studio edits", () => {
    let workout = seedSampleWorkout();
    const block = workout.blocks[0]!;
    const exercise = block.exercises[0]!;

    workout = updateExercise(workout, block.id, exercise.id, {
      design: {
        ...exercise.design,
        whyToday: "Chest emphasis day",
      },
      mediaComposer: applyMediaComposerPatch(exercise.mediaComposer, {
        coachMessage: "Own the eccentric.",
      }),
    });

    const payload = buildAppWorkoutDraftPayload(workout);
    const draftExercise = payload.blocks[0]?.exercises[0];
    expect(draftExercise?.exerciseId).toBe("bench_press");
    expect(draftExercise?.mediaExperience).toBeDefined();
    expect(draftExercise?.coachingPayload.whyToday).toBe("Chest emphasis day");
  });

  it("projected volume updates after set edits made in experience studio flow", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "primaryLift");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    expect(blockId).toBeDefined();
    expect(bench).toBeDefined();

    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(3);

    const blockAfterAdd = workout.blocks[0];
    expect(blockAfterAdd).toBeDefined();
    const addedExercise = blockAfterAdd!.exercises[0];
    expect(addedExercise).toBeDefined();
    workout = updateExercise(workout, blockId!, addedExercise!.id, {
      designedSets: addDesignedSet(addedExercise!.designedSets),
    });

    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(4);
  });
});
