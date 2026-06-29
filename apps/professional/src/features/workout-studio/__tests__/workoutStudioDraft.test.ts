import fs from "node:fs";
import path from "node:path";

import {
  addBlock,
  addExercise,
  addExerciseFromLibrary,
  createEmptyWorkoutExperience,
  duplicateBlock,
  duplicateExercise,
  moveBlock,
  moveExerciseToBlock,
  removeBlock,
  removeExercise,
  seedSampleWorkout,
  updateBlock,
  updateExercise,
  updateWorkoutMeta,
} from "../workoutStudioDraft";
import { buildAppWorkoutDraftPayload } from "../buildAppWorkoutDraftPayload";
import { buildWorkoutProjectedVolume } from "../buildWorkoutProjectedVolume";
import { buildWorkoutQualityChecklist } from "../buildWorkoutQualityChecklist";
import { buildWorkoutExperiencePreview } from "../buildWorkoutExperiencePreview";
import { getBlockDisplayTitle, mapStudioBlockTypeToJournalBlockType } from "../blockUtils";
import { cloneExerciseCard } from "../exerciseCloneUtils";
import { createWorkoutStudioExerciseFromLibraryExercise, createEmptyCustomExercise } from "../createWorkoutStudioExerciseFromLibraryExercise";
import {
  createDefaultDesignedSets,
  createDefaultExerciseDetails,
} from "../exerciseDefaults";
import {
  addDesignedSet,
  applySetDesignToAllSets,
  duplicateDesignedSet,
  duplicateLastDesignedSet,
  removeDesignedSet,
  updateDesignedSet,
} from "../designedSetUtils";
import {
  filterWorkoutLibraryExercises,
  listCanonicalWorkoutLibraryExercises,
} from "../exerciseLibraryAdapter";
import { WORKOUT_BLOCK_TYPES, WORKOUT_BLOCK_TYPE_LABELS } from "../types";

describe("exerciseLibraryAdapter", () => {
  it("returns canonical exercises with snake_case exerciseId", () => {
    const items = listCanonicalWorkoutLibraryExercises();
    expect(items.length).toBeGreaterThan(100);
    expect(items[0]?.exerciseId).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    expect(items.some((item) => item.exerciseId === "bench_press")).toBe(true);
  });

  it("filters by search and category", () => {
    const items = listCanonicalWorkoutLibraryExercises();
    const pushOnly = filterWorkoutLibraryExercises(items, "push", "");
    expect(pushOnly.every((item) => item.movementPattern === "push")).toBe(true);

    const bench = filterWorkoutLibraryExercises(items, "all", "bench press");
    expect(bench.some((item) => item.exerciseId === "bench_press")).toBe(true);
  });
});

describe("block model", () => {
  it("includes Set block type", () => {
    expect(WORKOUT_BLOCK_TYPES).toContain("set");
    expect(WORKOUT_BLOCK_TYPE_LABELS.set).toBe("Set");
    expect(mapStudioBlockTypeToJournalBlockType("set")).toBe("sets");
  });

  it("uses block type labels for non-custom blocks", () => {
    const workout = addBlock(createEmptyWorkoutExperience(), "primaryLift");
    const block = workout.blocks[0];
    expect(block?.blockType).toBe("primaryLift");
    expect(getBlockDisplayTitle(block!)).toBe(WORKOUT_BLOCK_TYPE_LABELS.primaryLift);
  });

  it("uses custom title when block type is custom", () => {
    const workout = addBlock(createEmptyWorkoutExperience(), "custom");
    const blockId = workout.blocks[0]?.id;
    expect(blockId).toBeDefined();
    const updated = updateBlock(workout, blockId!, { customTitle: "My Finisher Circuit" });
    expect(getBlockDisplayTitle(updated.blocks[0]!)).toBe("My Finisher Circuit");
  });

  it("retains block notes through updates", () => {
    const workout = addBlock(createEmptyWorkoutExperience(), "warmUp");
    const blockId = workout.blocks[0]?.id;
    const notes = "Focus on shoulder mobility and ramping heart rate.";
    const updated = updateBlock(workout, blockId!, { notes });
    expect(updated.blocks[0]?.notes).toBe(notes);
  });
});

describe("createDefaultDesignedSets", () => {
  it("returns three default sets with expected prescription", () => {
    const sets = createDefaultDesignedSets();
    expect(sets).toHaveLength(3);
    expect(sets[0]?.setNumber).toBe(1);
    expect(sets[0]?.repRange).toBe("8-12");
    expect(sets[0]?.rpeTarget).toBe(8);
    expect(sets[0]?.rirTarget).toBe(2);
    expect(sets[0]?.restSeconds).toBe(90);
  });

  it("supports add, duplicate, and remove operations", () => {
    const initial = createDefaultDesignedSets();
    const withExtra = addDesignedSet(initial);
    expect(withExtra).toHaveLength(4);
    const duplicated = duplicateDesignedSet(withExtra, withExtra[0]!.setId);
    expect(duplicated).toHaveLength(5);
    const removed = removeDesignedSet(duplicated, duplicated[0]!.setId);
    expect(removed).toHaveLength(4);
  });
});

describe("createDefaultExerciseDetails", () => {
  it("preloads editable coaching content from library metadata", () => {
    const library = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    expect(library).toBeDefined();
    const details = createDefaultExerciseDetails(library!);
    expect(details.design.whyThisExercise.length).toBeGreaterThan(0);
    expect(details.design.setupInstructions.length).toBeGreaterThan(0);
    expect(details.design.coachingCues.length).toBeGreaterThan(0);
    expect(details.design.shouldNotFeel.some((item) => item.text.includes("pain"))).toBe(true);
    expect(details.progressionRules.length).toBeGreaterThan(0);
  });
});

describe("createWorkoutStudioExerciseFromLibraryExercise", () => {
  it("preserves canonical exerciseId with default designed sets and details", () => {
    const library = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    expect(library).toBeDefined();
    const card = createWorkoutStudioExerciseFromLibraryExercise(library!);
    expect(card.exerciseId).toBe("bench_press");
    expect(card.source).toBe("canonical");
    expect(card.designedSets).toHaveLength(3);
    expect(card.design.whyThisExercise.length).toBeGreaterThan(0);
    expect(card.logging.fields.some((field) => field.kind === "reps" && field.enabled)).toBe(
      true,
    );
    expect(card.logging.fields.some((field) => field.kind === "weight" && field.enabled)).toBe(
      true,
    );
    expect(card.logging.fields.some((field) => field.kind === "rpe" && field.enabled)).toBe(true);
    expect(card.logging.fields.some((field) => field.kind === "rir" && field.enabled)).toBe(true);
    expect(card.logging.fields.some((field) => field.kind === "notes" && field.enabled)).toBe(
      true,
    );
  });
});

describe("workoutStudioDraft", () => {
  it("createEmptyWorkoutExperience returns a valid draft", () => {
    const workout = createEmptyWorkoutExperience("Daniel Hendel");
    expect(workout.clientName).toBe("Daniel Hendel");
    expect(workout.blocks).toEqual([]);
    expect(workout.overview.objective).toBe("");
  });

  it("addBlock appends a block with order", () => {
    const base = createEmptyWorkoutExperience();
    const next = addBlock(base, "warmUp");
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0]?.blockType).toBe("warmUp");
    expect(next.blocks[0]?.order).toBe(0);
  });

  it("addExerciseFromLibrary adds canonical exercise to block", () => {
    const withBlock = addBlock(createEmptyWorkoutExperience(), "primaryLift");
    const blockId = withBlock.blocks[0]?.id;
    const libraryItem = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    expect(blockId).toBeDefined();
    expect(libraryItem).toBeDefined();
    const withExercise = addExerciseFromLibrary(withBlock, blockId!, libraryItem!);
    expect(withExercise.blocks[0]?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(withExercise.blocks[0]?.exercises[0]?.designedSets).toHaveLength(3);
  });

  it("seedSampleWorkout includes bench_press", () => {
    const sample = seedSampleWorkout();
    expect(sample.blocks[0]?.exercises[0]?.exerciseId).toBe("bench_press");
  });

  it("overview fields persist through draft mutations (collapse is UI-only)", () => {
    const base = updateWorkoutMeta(createEmptyWorkoutExperience(), {
      objective: "Upper body strength",
      title: "Push Day",
      estimatedDurationMinutes: 45,
      difficulty: "advanced",
    });
    const withBlock = addBlock(base, "primaryLift");
    expect(withBlock.overview.objective).toBe("Upper body strength");
    expect(withBlock.title).toBe("Push Day");
  });

  it("exercise detail edits persist when updating other fields", () => {
    const withBlock = addBlock(createEmptyWorkoutExperience(), "primaryLift");
    const blockId = withBlock.blocks[0]?.id;
    const libraryItem = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    const withExercise = addExerciseFromLibrary(withBlock, blockId!, libraryItem!);
    const exerciseId = withExercise.blocks[0]?.exercises[0]?.id;
    expect(exerciseId).toBeDefined();

    const edited = updateExercise(withExercise, blockId!, exerciseId!, {
      design: {
        ...withExercise.blocks[0]!.exercises[0]!.design,
        whyToday: "Fresh today for heavy pressing.",
      },
    });
    const setsEdited = updateExercise(edited, blockId!, exerciseId!, {
      designedSets: createDefaultDesignedSets(4),
    });
    expect(setsEdited.blocks[0]?.exercises[0]?.design.whyToday).toBe(
      "Fresh today for heavy pressing.",
    );
    expect(setsEdited.blocks[0]?.exercises[0]?.designedSets).toHaveLength(4);
  });
});

describe("buildWorkoutExperiencePreview", () => {
  it("maps workout experience into preview with blocks", () => {
    const sample = seedSampleWorkout();
    const preview = buildWorkoutExperiencePreview(sample);
    expect(preview.blocks[0]?.exercises[0]?.exerciseId).toBe("bench_press");
  });
});

describe("buildAppWorkoutDraftPayload", () => {
  it("includes blockType, notes, exerciseId, designedSets, logging, and coaching details", () => {
    const sample = seedSampleWorkout();
    const payload = buildAppWorkoutDraftPayload(sample);
    expect(payload.version).toBe("preliminary-v1");
    expect(payload.blocks[0]?.blockType).toBe("primaryLift");
    expect(payload.blocks[0]?.notes.length).toBeGreaterThan(0);
    expect(payload.blocks[0]?.journalBlockType).toBe("sets");
    expect(payload.blocks[0]?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(payload.blocks[0]?.exercises[0]?.designedSets.length).toBeGreaterThan(0);
    expect(payload.blocks[0]?.exercises[0]?.loggingSchema.fields.length).toBeGreaterThan(0);
    expect(
      payload.blocks[0]?.exercises[0]?.coachingPayload.whyThisExercise.length,
    ).toBeGreaterThan(0);
    expect(payload.blocks[0]?.exercises[0]?.exerciseAcademy?.exerciseId).toBe("bench_press");
    expect(payload.blocks[0]?.exercises[0]?.exerciseAcademy?.academyVersion).toBe("academy-v1");
    expect(payload.blocks[0]?.exercises[0]?.exerciseAcademy?.qualityScore).toBeGreaterThan(0);
    expect(payload.projectedVolume.totalSets).toBeGreaterThan(0);
    expect(payload.projectedVolume.muscleGroupSetCounts[0]?.muscleGroup).toBe("Chest");
  });
});

describe("buildWorkoutProjectedVolume", () => {
  it("returns zero volume for empty workout", () => {
    const volume = buildWorkoutProjectedVolume(createEmptyWorkoutExperience());
    expect(volume.totalSets).toBe(0);
    expect(volume.muscleGroupsTrained).toBe(0);
    expect(volume.muscleGroupSetCounts).toEqual([]);
    expect(volume.uncountedExercises).toEqual([]);
  });

  it("counts total sets from designedSets in strength blocks", () => {
    const sample = seedSampleWorkout();
    const volume = buildWorkoutProjectedVolume(sample);
    expect(volume.totalSets).toBe(3);
    expect(volume.countedExercises).toBe(1);
  });

  it("attributes full set credit to primary muscle group", () => {
    const sample = seedSampleWorkout();
    const volume = buildWorkoutProjectedVolume(sample);
    const chest = volume.muscleGroupSetCounts.find((row) => row.muscleGroupKey === "chest");
    expect(chest?.sets).toBe(3);
    expect(chest?.source).toBe("primary");
    expect(volume.muscleGroupSetCounts.some((row) => row.muscleGroupKey === "triceps")).toBe(
      false,
    );
  });

  it("aggregates chest volume across multiple pressing exercises", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    const dbBench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "dumbbell_bench_press",
    );
    expect(blockId).toBeDefined();
    expect(bench).toBeDefined();
    expect(dbBench).toBeDefined();
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    workout = addExerciseFromLibrary(workout, blockId!, dbBench!);
    const volume = buildWorkoutProjectedVolume(workout);
    expect(volume.totalSets).toBe(6);
    const chest = volume.muscleGroupSetCounts.find((row) => row.muscleGroupKey === "chest");
    expect(chest?.sets).toBe(6);
  });

  it("updates volume when a set is added", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    const sets = workout.blocks[0]?.exercises[0]?.designedSets ?? [];
    workout = updateExercise(workout, blockId!, exerciseId!, {
      designedSets: addDesignedSet(sets),
    });
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(4);
  });

  it("updates volume when a set is removed", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    const sets = workout.blocks[0]?.exercises[0]?.designedSets ?? [];
    workout = updateExercise(workout, blockId!, exerciseId!, {
      designedSets: removeDesignedSet(sets, sets[0]!.setId),
    });
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(2);
  });

  it("updates volume when an exercise is removed", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    workout = removeExercise(workout, blockId!, exerciseId!);
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(0);
  });

  it("excludes warmup blocks from projected volume", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "warmUp");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    expect(buildWorkoutProjectedVolume(workout).totalSets).toBe(0);
  });

  it("sorts muscle groups deterministically by sets desc then name", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    const ohp = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "overhead_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    workout = addExerciseFromLibrary(workout, blockId!, ohp!);
    const exerciseId = workout.blocks[0]?.exercises[1]?.id;
    workout = updateExercise(workout, blockId!, exerciseId!, {
      designedSets: createDefaultDesignedSets(1),
    });
    const volume = buildWorkoutProjectedVolume(workout);
    expect(volume.muscleGroupSetCounts[0]?.muscleGroupKey).toBe("chest");
    expect(volume.muscleGroupSetCounts[1]?.muscleGroupKey).toBe("shoulders");
  });

  it("records uncounted exercises without muscle metadata", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    workout = addExercise(workout, blockId!, createEmptyCustomExercise("Unknown movement"));
    const volume = buildWorkoutProjectedVolume(workout);
    expect(volume.totalSets).toBe(3);
    expect(volume.countedExercises).toBe(0);
    expect(volume.uncountedExercises).toHaveLength(1);
    expect(volume.uncountedExercises[0]?.reason).toContain("primary muscle");
  });
});

describe("canvas v2 draft actions", () => {
  it("duplicateBlock preserves notes and exercises with new ids", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = updateBlock(workout, blockId!, { notes: "Heavy pressing focus" });
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const duplicated = duplicateBlock(workout, blockId!);
    expect(duplicated.blocks).toHaveLength(2);
    expect(duplicated.blocks[1]?.notes).toBe("Heavy pressing focus");
    expect(duplicated.blocks[1]?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(duplicated.blocks[1]?.id).not.toBe(blockId);
    expect(duplicated.blocks[1]?.exercises[0]?.id).not.toBe(
      workout.blocks[0]?.exercises[0]?.id,
    );
  });

  it("removeBlock updates projected volume", () => {
    const sample = seedSampleWorkout();
    const blockId = sample.blocks[0]?.id;
    expect(buildWorkoutProjectedVolume(sample).totalSets).toBe(3);
    const removed = removeBlock(sample, blockId!);
    expect(buildWorkoutProjectedVolume(removed).totalSets).toBe(0);
  });

  it("moveBlock preserves order and block data", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "warmUp");
    workout = addBlock(workout, "set");
    const secondId = workout.blocks[1]?.id;
    expect(workout.blocks[0]?.blockType).toBe("warmUp");
    const moved = moveBlock(workout, secondId!, "up");
    expect(moved.blocks[0]?.blockType).toBe("set");
    expect(moved.blocks[0]?.order).toBe(0);
    expect(moved.blocks[1]?.order).toBe(1);
  });

  it("duplicateExercise preserves exerciseId designedSets and details", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    workout = updateExercise(workout, blockId!, exerciseId!, {
      design: {
        ...workout.blocks[0]!.exercises[0]!.design,
        whyToday: "Fresh for pressing.",
      },
    });
    const duplicated = duplicateExercise(workout, blockId!, exerciseId!);
    const exercises = duplicated.blocks[0]?.exercises ?? [];
    expect(exercises).toHaveLength(2);
    expect(exercises[1]?.exerciseId).toBe("bench_press");
    expect(exercises[1]?.designedSets).toHaveLength(3);
    expect(exercises[1]?.design.whyToday).toBe("Fresh for pressing.");
    expect(exercises[1]?.id).not.toBe(exerciseId);
  });

  it("moveExerciseToBlock preserves exercise data", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    workout = addBlock(workout, "accessory");
    const fromId = workout.blocks[0]?.id;
    const toId = workout.blocks[1]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, fromId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    const moved = moveExerciseToBlock(workout, fromId!, toId!, exerciseId!);
    expect(moved.blocks[0]?.exercises).toHaveLength(0);
    expect(moved.blocks[1]?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(moved.blocks[1]?.exercises[0]?.designedSets).toHaveLength(3);
  });

  it("cloneExerciseCard preserves canonical exerciseId", () => {
    const card = createWorkoutStudioExerciseFromLibraryExercise(
      listCanonicalWorkoutLibraryExercises().find((item) => item.exerciseId === "bench_press")!,
    );
    const copy = cloneExerciseCard(card);
    expect(copy.exerciseId).toBe("bench_press");
    expect(copy.id).not.toBe(card.id);
  });
});

describe("designed set utilities v2", () => {
  it("applySetDesignToAllSets copies prescription fields", () => {
    const sets = createDefaultDesignedSets(3);
    const updated = applySetDesignToAllSets(
      updateDesignedSet(sets, sets[0]!.setId, { repRange: "5-8", rpeTarget: 9 }),
      sets[0]!.setId,
    );
    expect(updated.every((set) => set.repRange === "5-8")).toBe(true);
    expect(updated.every((set) => set.rpeTarget === 9)).toBe(true);
    expect(updated[1]?.notes).toBe("");
  });

  it("duplicateLastDesignedSet adds a copy of the final set", () => {
    const sets = createDefaultDesignedSets(2);
    const next = duplicateLastDesignedSet(sets);
    expect(next).toHaveLength(3);
    expect(next[2]?.repRange).toBe(next[1]?.repRange);
  });
});

describe("buildWorkoutQualityChecklist", () => {
  it("returns deterministic ordered checklist", () => {
    const checklist = buildWorkoutQualityChecklist(seedSampleWorkout(), buildWorkoutProjectedVolume(seedSampleWorkout()));
    expect(checklist.items.map((item) => item.id)).toEqual([
      "purposeComplete",
      "hasBlocks",
      "hasExercises",
      "hasDesignedSets",
      "hasCoachingDetails",
      "hasProgression",
      "hasProjectedVolume",
    ]);
    expect(checklist.items.find((item) => item.id === "hasBlocks")?.complete).toBe(true);
    expect(checklist.items.find((item) => item.id === "hasProjectedVolume")?.complete).toBe(true);
  });
});

describe("buildWorkoutExperiencePreview v2", () => {
  it("includes blocks exercises designedSets and coaching details", () => {
    const preview = buildWorkoutExperiencePreview(seedSampleWorkout());
    expect(preview.blocks[0]?.notes.length).toBeGreaterThan(0);
    expect(preview.blocks[0]?.exercises[0]?.exerciseId).toBe("bench_press");
    expect(preview.blocks[0]?.exercises[0]?.designedSets.length).toBeGreaterThan(0);
    expect(preview.blocks[0]?.exercises[0]?.why.length).toBeGreaterThan(0);
    expect(preview.blocks[0]?.exercises[0]?.how.length).toBeGreaterThan(0);
  });
});

describe("professional app boundaries", () => {
  it("does not import react-native in workout studio feature modules", () => {
    const featureDir = path.join(__dirname, "..");
    const files = fs.readdirSync(featureDir).filter((file) => file.endsWith(".ts"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(featureDir, file), "utf8");
      expect(content).not.toMatch(/from ["']react-native["']/);
    }
  });
});
