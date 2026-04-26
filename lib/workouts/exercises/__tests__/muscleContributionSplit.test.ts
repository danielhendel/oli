import {
  isMuscleSplitTotalUnit,
  muscleContributionWeightSum,
  MUSCLE_SPLIT_SUM_EPSILON,
  normalizeMuscleContributionsToUnit,
} from "../muscleContributionSplit";

describe("muscleContributionWeightSum", () => {
  it("sums finite non-negative weights", () => {
    expect(muscleContributionWeightSum([{ weight: 0.6 }, { weight: 0.4 }])).toBeCloseTo(1);
  });

  it("ignores negative and non-finite weights", () => {
    expect(
      muscleContributionWeightSum([
        { weight: 1 },
        { weight: -2 },
        { weight: Number.NaN },
        { weight: Number.POSITIVE_INFINITY },
      ]),
    ).toBe(1);
  });
});

describe("normalizeMuscleContributionsToUnit", () => {
  it("scales arbitrary positive weights to sum 1", () => {
    const out = normalizeMuscleContributionsToUnit([
      { subgroup: "upper_chest", weight: 3 },
      { subgroup: "front_delts", weight: 3 },
    ]);
    expect(out[0]?.weight).toBeCloseTo(0.5);
    expect(out[1]?.weight).toBeCloseTo(0.5);
    expect(muscleContributionWeightSum(out)).toBeCloseTo(1);
  });

  it("assigns equal weights when all contributions are zero", () => {
    const out = normalizeMuscleContributionsToUnit([
      { subgroup: "lats", weight: 0 },
      { subgroup: "upper_back", weight: 0 },
      { subgroup: "lower_back", weight: 0 },
    ]);
    expect(out).toHaveLength(3);
    for (const r of out) expect(r.weight).toBeCloseTo(1 / 3);
    expect(muscleContributionWeightSum(out)).toBeCloseTo(1);
  });

  it("clamps negative weights before normalizing", () => {
    const out = normalizeMuscleContributionsToUnit([
      { subgroup: "quads", weight: -5 },
      { subgroup: "hamstrings", weight: 2 },
    ]);
    expect(muscleContributionWeightSum(out)).toBeCloseTo(1);
    expect(out[0]?.weight).toBeCloseTo(0);
    expect(out[1]?.weight).toBeCloseTo(1);
  });
});

describe("isMuscleSplitTotalUnit", () => {
  it("accepts sums within epsilon of 1", () => {
    expect(isMuscleSplitTotalUnit(1)).toBe(true);
    expect(isMuscleSplitTotalUnit(1 - MUSCLE_SPLIT_SUM_EPSILON / 2)).toBe(true);
  });

  it("rejects sums outside epsilon", () => {
    expect(isMuscleSplitTotalUnit(0.98)).toBe(false);
    expect(isMuscleSplitTotalUnit(1.02)).toBe(false);
  });
});
