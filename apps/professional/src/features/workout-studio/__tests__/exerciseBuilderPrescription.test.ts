import {
  applyBuilderPatch,
  applyExerciseLevelRepsToAllSets,
  applyExerciseLevelRestToAllSets,
  applyExerciseLevelSetCount,
  applyPerSetBuilderPatch,
  applyPerSetPatch,
  defaultExerciseBuilderPrescription,
  formatLoadGuidance,
  parseLoadGuidance,
  parseRestWithUnit,
  resolveRestDisplayUnit,
  setsAreUniform,
  syncGeneralPrescriptionToSets,
} from "../exerciseBuilderPrescription";
import { createDefaultDesignedSets } from "../designedSetUtils";
import { createWorkoutStudioExerciseFromLibraryExercise } from "../createWorkoutStudioExerciseFromLibraryExercise";
import type { WorkoutLibraryExercise } from "../exerciseLibraryAdapter";

const libraryExercise: WorkoutLibraryExercise = {
  exerciseId: "squat",
  name: "Squat",
  aliases: [],
  primaryMuscles: ["Quads"],
  secondaryMuscles: ["Glutes"],
  equipment: "Barbell",
  movementPattern: "squat",
  primaryBucket: "Legs",
  trainingType: "strength",
  description: "",
  cues: [],
};

describe("exerciseBuilderPrescription", () => {
  it("defaults to customized per-set mode", () => {
    expect(defaultExerciseBuilderPrescription().customizeEachSet).toBe(true);
  });

  it("updates all sets from general prescription", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const general = applyBuilderPatch(exercise, { customizeEachSet: false });
    const next = applyBuilderPatch(general, {
      loadValue: "185",
      loadUnit: "lbs",
      loadMode: "totalWeight",
      repsMode: "reps",
    });

    const loadGuidance = formatLoadGuidance("totalWeight", "185", "lbs");
    expect(next.designedSets.every((set) => set.loadGuidance === loadGuidance)).toBe(true);
  });

  it("persists target RPE across general prescription updates", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const general = applyBuilderPatch(exercise, { customizeEachSet: false });
    const withRpe = {
      ...general,
      designedSets: general.designedSets.map((set) => ({ ...set, rpeTarget: 9 })),
    };

    const next = applyBuilderPatch(withRpe, { loadValue: "200" });
    expect(next.designedSets.every((set) => set.rpeTarget === 9)).toBe(true);
    expect(next.prescription.rpeTarget).toBe(9);
  });

  it("preserves independent per-set values in customize-each-set mode", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const customized = applyBuilderPatch(exercise, { customizeEachSet: true });
    const setA = customized.designedSets[0];
    const setB = customized.designedSets[1];
    if (!setA || !setB) throw new Error("expected sets");

    const patchedA = applyPerSetPatch(customized, setA.setId, { repRange: "5", rpeTarget: 9 });
    const patchedB = applyPerSetPatch(patchedA, setB.setId, { repRange: "12", rpeTarget: 7 });

    expect(patchedB.designedSets[0]?.repRange).toBe("5");
    expect(patchedB.designedSets[0]?.rpeTarget).toBe(9);
    expect(patchedB.designedSets[1]?.repRange).toBe("12");
    expect(patchedB.designedSets[1]?.rpeTarget).toBe(7);
    expect(setsAreUniform(patchedB.designedSets)).toBe(false);
  });

  it("syncs general prescription from builder state", () => {
    const sets = createDefaultDesignedSets(3);
    const exercise = {
      ...createWorkoutStudioExerciseFromLibraryExercise(libraryExercise),
      designedSets: sets,
      builderPrescription: {
        ...defaultExerciseBuilderPrescription(),
        loadValue: "100",
        loadUnit: "kg" as const,
      },
    };

    const synced = syncGeneralPrescriptionToSets(exercise, exercise.builderPrescription);
    expect(synced.every((set) => set.loadGuidance === "100 kg")).toBe(true);
  });

  it("parses and formats load guidance", () => {
    expect(parseLoadGuidance("135 lbs")).toEqual({
      loadMode: "totalWeight",
      loadUnit: "lbs",
      loadValue: "135",
    });
    expect(parseLoadGuidance("75% RM")).toEqual({
      loadMode: "repMaxPercent",
      loadUnit: "percent",
      loadValue: "75",
    });
    expect(formatLoadGuidance("repMaxPercent", "80", "percent")).toBe("80% RM");
  });

  it("converts rest minutes to seconds and preserves seconds", () => {
    expect(parseRestWithUnit("2", "min")).toBe(120);
    expect(parseRestWithUnit("90", "sec")).toBe(90);
    expect(resolveRestDisplayUnit(120)).toBe("min");
    expect(resolveRestDisplayUnit(90)).toBe("sec");
  });

  it("maps per-set builder fields to designedSets and rpeTarget", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const setId = exercise.designedSets[0]?.setId;
    if (!setId) throw new Error("expected set");

    const next = applyPerSetBuilderPatch(exercise, setId, {
      repsMode: "time",
      repValue: "45",
      sideMode: "each",
      loadMode: "totalWeight",
      loadValue: "50",
      loadUnit: "kg",
      intensityValue: "8",
      restSeconds: 120,
      restUnit: "min",
      tempo: "3-1-1",
    });

    expect(next.designedSets[0]?.repRange).toBe("45s");
    expect(next.designedSets[0]?.loadGuidance).toBe("50 kg");
    expect(next.designedSets[0]?.rpeTarget).toBe(8);
    expect(next.designedSets[0]?.rirTarget).toBeNull();
    expect(next.designedSets[0]?.restSeconds).toBe(120);
    expect(next.designedSets[0]?.tempo).toBe("3-1-1");
    expect(next.builderPrescription.perSetFields[setId]?.sideMode).toBe("each");
    expect(next.builderPrescription.perSetFields[setId]?.intensityKind).toBe("rpe");
    expect(exercise.exerciseId).toBe("squat");
    expect(exercise).not.toBe(next);
  });

  it("maps RIR intensity to rirTarget and clears rpeTarget", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const setId = exercise.designedSets[0]?.setId;
    if (!setId) throw new Error("expected set");

    const withRpe = applyPerSetBuilderPatch(exercise, setId, { intensityValue: "8" });
    const withRir = applyPerSetBuilderPatch(withRpe, setId, {
      intensityKind: "rir",
      intensityValue: "2",
    });

    expect(withRir.designedSets[0]?.rirTarget).toBe(2);
    expect(withRir.designedSets[0]?.rpeTarget).toBeNull();
    expect(withRir.builderPrescription.perSetFields[setId]?.intensityKind).toBe("rir");
    expect(withRpe.designedSets[0]?.rpeTarget).toBe(8);
  });

  it("carries intensity value when switching between RPE and RIR", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const setId = exercise.designedSets[0]?.setId;
    if (!setId) throw new Error("expected set");

    const withRpe = applyPerSetBuilderPatch(exercise, setId, { intensityValue: "7" });
    const switchedToRir = applyPerSetBuilderPatch(withRpe, setId, { intensityKind: "rir" });

    expect(switchedToRir.designedSets[0]?.rirTarget).toBe(7);
    expect(switchedToRir.designedSets[0]?.rpeTarget).toBeNull();
  });

  it("updates tempo for one set only", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const setA = exercise.designedSets[0];
    const setB = exercise.designedSets[1];
    if (!setA || !setB) throw new Error("expected sets");

    const next = applyPerSetBuilderPatch(exercise, setA.setId, { tempo: "2-0-2" });

    expect(next.designedSets[0]?.tempo).toBe("2-0-2");
    expect(next.designedSets[1]?.tempo).toBe(setB.tempo);
  });

  it("preserves tempo when updating intensity or rest", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const setId = exercise.designedSets[0]?.setId;
    if (!setId) throw new Error("expected set");

    const withTempo = applyPerSetBuilderPatch(exercise, setId, { tempo: "3-1-1" });
    const withRpe = applyPerSetBuilderPatch(withTempo, setId, { intensityValue: "8" });
    const withRest = applyPerSetBuilderPatch(withRpe, setId, { restSeconds: 90, restUnit: "sec" });

    expect(withRpe.designedSets[0]?.tempo).toBe("3-1-1");
    expect(withRest.designedSets[0]?.tempo).toBe("3-1-1");
    expect(withRest.designedSets[0]?.rpeTarget).toBe(8);
    expect(withRest.designedSets[0]?.restSeconds).toBe(90);
  });

  it("applies exercise-level set count to one exercise only", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const next = applyExerciseLevelSetCount(exercise, 5);
    expect(next.designedSets).toHaveLength(5);
    expect(next.exerciseId).toBe("squat");
  });

  it("applies exercise-level reps to all sets for one exercise", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const next = applyExerciseLevelRepsToAllSets(exercise, "reps", "10");
    expect(next.designedSets.every((set) => set.repRange === "10")).toBe(true);
    expect(next.builderPrescription.repsMode).toBe("reps");
  });

  it("applies exercise-level rest sec and min to all sets for one exercise", () => {
    const exercise = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
    const withSec = applyExerciseLevelRestToAllSets(exercise, 90, "sec");
    expect(withSec.designedSets.every((set) => set.restSeconds === 90)).toBe(true);

    const withMin = applyExerciseLevelRestToAllSets(exercise, 120, "min");
    expect(withMin.designedSets.every((set) => set.restSeconds === 120)).toBe(true);
    expect(withMin.builderPrescription.perSetFields[exercise.designedSets[0]!.setId]?.restUnit).toBe(
      "min",
    );
  });
});
