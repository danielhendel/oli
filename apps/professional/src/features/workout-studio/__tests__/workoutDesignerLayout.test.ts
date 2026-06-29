import {
  addBlock,
  addExerciseFromLibrary,
  createEmptyWorkoutExperience,
  seedSampleWorkout,
  updateBlock,
} from "../workoutStudioDraft";
import { buildAppWorkoutDraftPayload } from "../buildAppWorkoutDraftPayload";
import { buildProjectedVolumeMuscleDetail } from "../buildProjectedVolumeMuscleDetail";
import { buildWorkoutProjectedVolume } from "../buildWorkoutProjectedVolume";
import { blockNotesPreview } from "../blockNotesUtils";
import { listCanonicalWorkoutLibraryExercises } from "../exerciseLibraryAdapter";

describe("buildWorkoutProjectedVolume contributors", () => {
  it("returns deterministic contributors with exercise and block attribution", () => {
    const sample = seedSampleWorkout();
    const volume = buildWorkoutProjectedVolume(sample);
    expect(volume.contributors).toHaveLength(1);
    expect(volume.contributors[0]).toMatchObject({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      sets: 3,
      muscleGroup: "Chest",
    });
    expect(volume.contributors[0]?.blockTitle.length).toBeGreaterThan(0);
  });

  it("buildProjectedVolumeMuscleDetail includes exercises blocks and sets", () => {
    const volume = buildWorkoutProjectedVolume(seedSampleWorkout());
    const chest = volume.muscleGroupSetCounts.find((row) => row.muscleGroupKey === "chest");
    expect(chest).toBeDefined();
    const detail = buildProjectedVolumeMuscleDetail(volume, chest!.muscleGroupKey);
    expect(detail).not.toBeNull();
    expect(detail?.totalSets).toBe(3);
    expect(detail?.exercises).toHaveLength(1);
    expect(detail?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(detail?.blocks).toHaveLength(1);
    expect(detail?.blocks[0]?.sets).toBe(3);
  });
});

describe("block notes behavior", () => {
  it("blockNotesPreview returns null for empty notes", () => {
    expect(blockNotesPreview("")).toBeNull();
    expect(blockNotesPreview("   ")).toBeNull();
  });

  it("blockNotesPreview truncates long notes", () => {
    const preview = blockNotesPreview("A".repeat(100), 20);
    expect(preview?.endsWith("…")).toBe(true);
  });

  it("draft payload preserves block notes after update", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    expect(blockId).toBeDefined();
    workout = updateBlock(workout, blockId!, { notes: "Heavy pressing focus" });
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const payload = buildAppWorkoutDraftPayload(workout);
    expect(payload.blocks[0]?.notes).toBe("Heavy pressing focus");
  });

  it("cleared block notes persist as empty string in payload", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    workout = updateBlock(workout, blockId!, { notes: "Temp note" });
    workout = updateBlock(workout, blockId!, { notes: "" });
    expect(buildAppWorkoutDraftPayload(workout).blocks[0]?.notes).toBe("");
  });
});

describe("add block layout compatibility", () => {
  it("addBlock works when no blocks exist", () => {
    const workout = addBlock(createEmptyWorkoutExperience(), "set");
    expect(workout.blocks).toHaveLength(1);
    expect(workout.blocks[0]?.blockType).toBe("set");
  });

  it("addBlock appends after existing blocks", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "primaryLift");
    workout = addBlock(workout, "accessory");
    expect(workout.blocks).toHaveLength(2);
    expect(workout.blocks[1]?.blockType).toBe("accessory");
    expect(workout.blocks[1]?.order).toBe(1);
  });
});
