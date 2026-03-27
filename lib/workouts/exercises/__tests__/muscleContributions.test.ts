import {
  defineMuscleContributions,
  getExerciseMuscleContributions,
  getPrimaryMuscleGroupsForExercise,
} from "@/lib/workouts/exercises/muscleContributions";

describe("exercise muscle contributions", () => {
  it("returns bench press contributions with chest/triceps/shoulders emphasis", () => {
    const rows = getExerciseMuscleContributions("bench_press");
    expect(rows).not.toBeNull();
    const groups = getPrimaryMuscleGroupsForExercise("bench_press");
    expect(groups).toContain("chest");
    expect(groups).toContain("triceps");
    expect(groups).toContain("shoulders");
    expect(groups[0]).toBe("chest");
  });

  it("returns squat contributions with quads/glutes emphasis", () => {
    const groups = getPrimaryMuscleGroupsForExercise("squat");
    expect(groups).toContain("quads");
    expect(groups).toContain("glutes");
  });

  it("returns rdl contributions with hamstrings/glutes emphasis", () => {
    const groups = getPrimaryMuscleGroupsForExercise("romanian_deadlift");
    expect(groups).toContain("hamstrings");
    expect(groups).toContain("glutes");
  });

  it("returns null/empty for unknown exercise ids", () => {
    expect(getExerciseMuscleContributions("unknown_exercise")).toBeNull();
    expect(getPrimaryMuscleGroupsForExercise("unknown_exercise")).toEqual([]);
  });

  it("rejects invalid contribution weights", () => {
    expect(() =>
      defineMuscleContributions([
        { subgroup: "mid_chest", weight: 0.8 },
        { subgroup: "triceps_long_head", weight: 0.4 },
      ]),
    ).toThrow(/Invalid muscle contributions/);
    expect(() =>
      defineMuscleContributions([{ subgroup: "mid_chest", weight: -0.1 }]),
    ).toThrow(/Invalid muscle contributions/);
  });
});
