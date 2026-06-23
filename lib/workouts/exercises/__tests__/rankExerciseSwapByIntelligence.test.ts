import { getExerciseSwapOptions } from "@/lib/data/program/getExerciseSwapOptions";
import {
  EXERCISE_SWAP_REASON_TAGS,
  rankExerciseSwapByIntelligence,
  stimulusProfileSimilarity,
} from "@/lib/workouts/exercises/intelligence/rankExerciseSwapByIntelligence";
import { getExerciseIntelligenceV1 } from "@/lib/workouts/exercises/intelligence/exerciseIntelligenceV1Registry";

function rankedIds(
  sourceExerciseId: string,
  candidateExerciseIds: readonly string[],
  constraints?: Parameters<typeof rankExerciseSwapByIntelligence>[0]["constraints"],
): string[] {
  return rankExerciseSwapByIntelligence({
    sourceExerciseId,
    candidateExerciseIds,
    constraints,
  }).map((row) => row.exerciseId);
}

describe("stimulusProfileSimilarity", () => {
  it("returns 1 for identical stimulus profiles", () => {
    const stimulus = getExerciseIntelligenceV1("hack_squat")!.stimulus;
    expect(stimulusProfileSimilarity(stimulus, stimulus)).toBeCloseTo(1, 5);
  });
});

describe("rankExerciseSwapByIntelligence", () => {
  it("hack_squat prefers leg_press and front_squat over unrelated exercises", () => {
    const ids = rankedIds("hack_squat", [
      "barbell_curl",
      "lateral_raise",
      "leg_press",
      "front_squat",
    ]);
    expect(ids.indexOf("leg_press")).toBeLessThan(ids.indexOf("barbell_curl"));
    expect(ids.indexOf("front_squat")).toBeLessThan(ids.indexOf("lateral_raise"));
  });

  it("lumbar-sensitive mode penalizes deadlift and good_morning vs leg_press", () => {
    const ids = rankedIds(
      "hack_squat",
      ["deadlift", "good_morning", "leg_press"],
      { avoidHighLumbarStress: true },
    );
    expect(ids[0]).toBe("leg_press");
    expect(ids.indexOf("leg_press")).toBeLessThan(ids.indexOf("deadlift"));
    expect(ids.indexOf("leg_press")).toBeLessThan(ids.indexOf("good_morning"));
  });

  it("shoulder-sensitive mode penalizes dips and overhead presses vs flies", () => {
    const ids = rankedIds(
      "bench_press",
      ["dip", "overhead_press", "dumbbell_fly"],
      { avoidHighShoulderStress: true },
    );
    expect(ids[0]).toBe("dumbbell_fly");
    expect(ids.indexOf("dumbbell_fly")).toBeLessThan(ids.indexOf("dip"));
    expect(ids.indexOf("dumbbell_fly")).toBeLessThan(ids.indexOf("overhead_press"));
  });

  it("returns zero intelligence adjustment when source is not seeded", () => {
    const ranked = rankExerciseSwapByIntelligence({
      sourceExerciseId: "pec_stretch",
      candidateExerciseIds: ["bench_press", "incline_bench_press"],
      baseSwapScoresByExerciseId: { bench_press: 120, incline_bench_press: 100 },
    });
    expect(ranked[0]!.exerciseId).toBe("bench_press");
    expect(ranked[0]!.breakdown.intelligenceScore).toBe(0);
    expect(ranked[0]!.breakdown.finalScore).toBe(120);
    expect(ranked[0]!.reasonSummary).toBeNull();
    expect(ranked[0]!.reasonTags).toEqual([]);
  });

  it("hack_squat → leg_press includes similar stimulus and lower lumbar stress reasons", () => {
    const ranked = rankExerciseSwapByIntelligence({
      sourceExerciseId: "hack_squat",
      candidateExerciseIds: ["leg_press"],
    });
    const row = ranked[0]!;
    expect(row.reasonTags).toContain(EXERCISE_SWAP_REASON_TAGS.SIMILAR_STIMULUS);
    expect(row.reasonTags).toContain(EXERCISE_SWAP_REASON_TAGS.LOWER_LUMBAR_STRESS);
    expect(row.reasonSummary).toBe("Similar quad stimulus · Lower lumbar stress");
  });

  it("bench_press → dumbbell_fly can include better SFR and lower shoulder stress", () => {
    const ranked = rankExerciseSwapByIntelligence({
      sourceExerciseId: "bench_press",
      candidateExerciseIds: ["dumbbell_fly"],
    });
    const row = ranked[0]!;
    expect(row.reasonSummary).toContain("Similar chest stimulus");
    expect(row.reasonTags).toContain(EXERCISE_SWAP_REASON_TAGS.BETTER_SFR);
    expect(row.reasonTags).toContain(EXERCISE_SWAP_REASON_TAGS.LOWER_SHOULDER_STRESS);
  });

  it("exposes score breakdown components", () => {
    const ranked = rankExerciseSwapByIntelligence({
      sourceExerciseId: "hack_squat",
      candidateExerciseIds: ["leg_press"],
    });
    const row = ranked[0]!;
    expect(row.breakdown.stimulusSimilarity).toBeGreaterThan(0);
    expect(row.breakdown.primaryRegionBonus).toBeGreaterThan(0);
    expect(row.breakdown.intelligenceScore).toBeGreaterThan(0);
    expect(row.breakdown.finalScore).toBe(row.breakdown.intelligenceScore);
  });
});

describe("getExerciseSwapOptions intelligence layer", () => {
  const baseArgs = {
    muscleGroupId: "quads" as const,
    trainingType: "hypertrophy" as const,
    trainingLevel: "intermediate" as const,
  };

  it("preserves legacy ordering when sourceExerciseId is omitted", () => {
    const legacy = getExerciseSwapOptions(baseArgs).map((o) => o.exerciseId);
    const withBlankSource = getExerciseSwapOptions({ ...baseArgs, sourceExerciseId: "" }).map(
      (o) => o.exerciseId,
    );
    expect(withBlankSource).toEqual(legacy);
  });

  it("preserves legacy ordering when source exercise is not seeded", () => {
    const legacy = getExerciseSwapOptions(baseArgs).map((o) => o.exerciseId);
    const withUnseededSource = getExerciseSwapOptions({
      ...baseArgs,
      sourceExerciseId: "pec_stretch",
    }).map((o) => o.exerciseId);
    expect(withUnseededSource).toEqual(legacy);
  });

  it("re-ranks quads swaps when swapping from hack_squat", () => {
    const legacy = getExerciseSwapOptions(baseArgs).map((o) => o.exerciseId);
    const intelligent = getExerciseSwapOptions({
      ...baseArgs,
      sourceExerciseId: "hack_squat",
    }).map((o) => o.exerciseId);

    expect(intelligent).not.toEqual(legacy);
    expect(intelligent.indexOf("leg_press")).toBeLessThan(legacy.indexOf("leg_press"));
    expect(intelligent.indexOf("front_squat")).toBeLessThan(legacy.indexOf("front_squat"));
  });

  it("attaches reasonSummary for seeded source exercises", () => {
    const options = getExerciseSwapOptions({
      ...baseArgs,
      sourceExerciseId: "hack_squat",
    });
    const legPress = options.find((option) => option.exerciseId === "leg_press");
    expect(legPress?.reasonSummary).toBe("Similar quad stimulus · Lower lumbar stress");
    expect(legPress?.reasonTags?.length).toBeGreaterThan(0);
  });

  it("omits reasonSummary when source exercise is not seeded", () => {
    const options = getExerciseSwapOptions({
      ...baseArgs,
      sourceExerciseId: "pec_stretch",
    });
    for (const option of options) {
      expect(option.reasonSummary).toBeUndefined();
      expect(option.reasonTags).toBeUndefined();
    }
  });
});
