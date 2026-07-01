import { validateExerciseLibraryEnrichment } from "../validateExerciseLibraryEnrichment";
import { TOP25_EXERCISE_ENRICHMENT_ENTRIES } from "../top25ExerciseEnrichmentEntries";
import type { ExerciseLibraryEnrichmentV1 } from "../types";

describe("validateExerciseLibraryEnrichment", () => {
  it("valid dataset returns no error severity issues", () => {
    const result = validateExerciseLibraryEnrichment();
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("invalid exerciseId returns error", () => {
    const bad = {
      ...TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!,
      exerciseId: "not_a_real_exercise_id",
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "unknown-exercise-id")).toBe(true);
  });

  it("invalid substitution reference returns error", () => {
    const bad: ExerciseLibraryEnrichmentV1 = {
      ...TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!,
      substitutionProfile: {
        regressions: [{ exerciseId: "fake_exercise_xyz", reason: "test", substitutionType: "regression" }],
        progressions: [],
        lateralSubstitutions: [],
        equipmentSubstitutions: [],
      },
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.issues.some((i) => i.code === "invalid-substitution-reference")).toBe(true);
  });

  it("duplicate pose IDs return error", () => {
    const bench = TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!;
    const dupPose = bench.mediaProfile.keyframeRequirements[0]!;
    const bad: ExerciseLibraryEnrichmentV1 = {
      ...bench,
      mediaProfile: {
        ...bench.mediaProfile,
        keyframeRequirements: [dupPose, { ...dupPose, poseLabel: "Duplicate" }],
      },
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.issues.some((i) => i.code === "duplicate-pose-ids")).toBe(true);
  });

  it("missing 16:9 render target returns error", () => {
    const bench = TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!;
    const bad: ExerciseLibraryEnrichmentV1 = {
      ...bench,
      mediaProfile: {
        ...bench.mediaProfile,
        renderTargets: ["9:16"],
      },
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.issues.some((i) => i.code === "missing-16x9-render-target")).toBe(true);
  });

  it("bench_press missing bottom_chest_pause returns error", () => {
    const bench = TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!;
    const bad: ExerciseLibraryEnrichmentV1 = {
      ...bench,
      mediaProfile: {
        ...bench.mediaProfile,
        keyframeRequirements: bench.mediaProfile.keyframeRequirements.filter(
          (k) => k.poseId !== "bottom_chest_pause",
        ),
      },
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.issues.some((i) => i.code === "bench-press-missing-pose")).toBe(true);
  });

  it("empty coaching cues return error", () => {
    const bench = TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!;
    const bad: ExerciseLibraryEnrichmentV1 = {
      ...bench,
      coachingProfile: {
        ...bench.coachingProfile,
        setupCues: [],
      },
    };
    const result = validateExerciseLibraryEnrichment([bad]);
    expect(result.issues.some((i) => i.code === "empty-coaching-field")).toBe(true);
  });

  it("does not throw for normal validation issues", () => {
    expect(() => validateExerciseLibraryEnrichment([{
      ...TOP25_EXERCISE_ENRICHMENT_ENTRIES[0]!,
      exerciseId: "invalid_id",
    }])).not.toThrow();
  });
});
