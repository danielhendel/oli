import {
  getMuscleGroupForSubgroup,
  isMuscleSubgroup,
  subgroupToGroupMap,
  validateMuscleContributions,
  type MuscleGroup,
  type MuscleSubgroup,
} from "@/lib/workouts/exercises/taxonomy";

describe("muscle taxonomy", () => {
  it("maps representative subgroups to expected groups", () => {
    expect(getMuscleGroupForSubgroup("mid_chest")).toBe("chest");
    expect(getMuscleGroupForSubgroup("lats")).toBe("back");
    expect(getMuscleGroupForSubgroup("triceps_long_head")).toBe("triceps");
    expect(getMuscleGroupForSubgroup("biceps_long_head")).toBe("biceps");
    expect(getMuscleGroupForSubgroup("spinal_erectors")).toBe("core");
  });

  it("covers every muscle group with at least one subgroup", () => {
    const sampleByGroup: Record<MuscleGroup, MuscleSubgroup> = {
      chest: "mid_chest",
      back: "lats",
      shoulders: "front_delts",
      triceps: "triceps_long_head",
      biceps: "biceps_long_head",
      forearms: "forearm_flexors",
      quads: "rectus_femoris",
      hamstrings: "biceps_femoris",
      glutes: "glute_max",
      calves: "gastrocnemius",
      core: "spinal_erectors",
    };
    for (const [group, subgroup] of Object.entries(sampleByGroup) as [MuscleGroup, MuscleSubgroup][]) {
      expect(getMuscleGroupForSubgroup(subgroup)).toBe(group);
    }
  });

  it("contains a valid group value for every subgroup key", () => {
    const keys = Object.keys(subgroupToGroupMap) as MuscleSubgroup[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const group = subgroupToGroupMap[key];
      expect([
        "chest",
        "back",
        "shoulders",
        "triceps",
        "biceps",
        "forearms",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "core",
      ]).toContain(group);
    }
  });

  it("type guard identifies valid and invalid subgroup ids", () => {
    expect(isMuscleSubgroup("mid_chest")).toBe(true);
    expect(isMuscleSubgroup("triceps_long_head")).toBe(true);
    expect(isMuscleSubgroup("long_head")).toBe(false);
    expect(isMuscleSubgroup("not_a_real_subgroup")).toBe(false);
  });

  it("validates contribution weights", () => {
    expect(
      validateMuscleContributions([
        { subgroup: "mid_chest", weight: 0.7 },
        { subgroup: "triceps_long_head", weight: 0.3 },
      ]),
    ).toBe(true);
    expect(
      validateMuscleContributions([
        { subgroup: "mid_chest", weight: -0.1 },
      ]),
    ).toBe(false);
    expect(
      validateMuscleContributions(
        [
          { subgroup: "mid_chest", weight: 0.8 },
          { subgroup: "triceps_long_head", weight: 0.5 },
        ],
        { enforceTotalCap: true },
      ),
    ).toBe(false);
  });
});
