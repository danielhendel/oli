import { seedSampleWorkout } from "../workoutStudioDraft";
import {
  updateExercisePrescriptionFromRow,
  updateExerciseRepRangeFromRow,
  updateExerciseRestSecondsFromRow,
  updateExerciseRpeFromRow,
  updateExerciseSetCountFromRow,
  updateExerciseTempoFromRow,
} from "../updateExercisePrescriptionFromRow";

describe("updateExercisePrescriptionFromRow", () => {
  function sampleExercise() {
    const workout = seedSampleWorkout();
    const exercise = workout.blocks[0]?.exercises[0];
    if (!exercise) {
      throw new Error("expected seeded exercise");
    }
    return exercise;
  }

  it("increases set count by appending sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseSetCountFromRow(exercise, 5);
    expect(next.designedSets).toHaveLength(5);
    expect(next.designedSets[4]?.setNumber).toBe(5);
  });

  it("decreases set count by truncating sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseSetCountFromRow(exercise, 2);
    expect(next.designedSets).toHaveLength(2);
    expect(next.designedSets.map((set) => set.setNumber)).toEqual([1, 2]);
  });

  it("keeps set numbers contiguous after resize", () => {
    const exercise = sampleExercise();
    const next = updateExerciseSetCountFromRow(exercise, 4);
    expect(next.designedSets.map((set) => set.setNumber)).toEqual([1, 2, 3, 4]);
  });

  it("applies rep range to all sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseRepRangeFromRow(exercise, "5-8");
    expect(next.designedSets.every((set) => set.repRange === "5-8")).toBe(true);
  });

  it("applies RPE to all sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseRpeFromRow(exercise, 9);
    expect(next.designedSets.every((set) => set.rpeTarget === 9)).toBe(true);
  });

  it("applies rest to all sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseRestSecondsFromRow(exercise, 120);
    expect(next.designedSets.every((set) => set.restSeconds === 120)).toBe(true);
  });

  it("applies tempo to all sets", () => {
    const exercise = sampleExercise();
    const next = updateExerciseTempoFromRow(exercise, "3-1-1");
    expect(next.designedSets.every((set) => set.tempo === "3-1-1")).toBe(true);
  });

  it("preserves exerciseId and design fields", () => {
    const exercise = sampleExercise();
    const next = updateExercisePrescriptionFromRow(exercise, {
      field: "repRange",
      value: "4-6",
    });

    expect(next.exerciseId).toBe(exercise.exerciseId);
    expect(next.id).toBe(exercise.id);
    expect(next.design).toEqual(exercise.design);
    expect(next.prescription).toEqual(exercise.prescription);
    expect(next.logging).toEqual(exercise.logging);
    expect(next.mediaComposer).toEqual(exercise.mediaComposer);
  });

  it("does not mutate the input exercise object", () => {
    const exercise = sampleExercise();
    const originalSets = exercise.designedSets.map((set) => ({ ...set }));
    updateExerciseSetCountFromRow(exercise, 5);
    expect(exercise.designedSets).toEqual(originalSets);
  });

  it("preserves notes on existing sets when increasing count", () => {
    const exercise = sampleExercise();
    const withNotes = {
      ...exercise,
      designedSets: exercise.designedSets.map((set, index) =>
        index === 0 ? { ...set, notes: "Keep tight" } : set,
      ),
    };
    const next = updateExerciseSetCountFromRow(withNotes, 4);
    expect(next.designedSets[0]?.notes).toBe("Keep tight");
  });
});
