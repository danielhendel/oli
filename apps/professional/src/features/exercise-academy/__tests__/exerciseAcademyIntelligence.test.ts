import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";

import {
  SKIPPED_TOP20_REQUESTED_IDS,
  TOP20_EXERCISE_ACADEMY_INTELLIGENCE,
} from "../data/top20ExerciseAcademyIntelligence";
import {
  getExerciseAcademyIntelligenceById,
  getExerciseAcademyIntelligenceCoverage,
  hasExerciseAcademyIntelligence,
  listExerciseAcademyIntelligenceEntries,
} from "../exerciseAcademyIntelligenceRegistry";
import { EXERCISE_ACADEMY_INTELLIGENCE_VERSION } from "../exerciseAcademyIntelligenceTypes";

describe("Exercise Academy Intelligence registry", () => {
  const canonicalIds = new Set(EXERCISE_LIBRARY_V1.map((entry) => entry.exerciseId));

  it("seeds exactly 20 intelligence entries", () => {
    expect(TOP20_EXERCISE_ACADEMY_INTELLIGENCE).toHaveLength(20);
  });

  it("validates all seeded exercise IDs exist in canonical library", () => {
    for (const entry of TOP20_EXERCISE_ACADEMY_INTELLIGENCE) {
      expect(canonicalIds.has(entry.exerciseId)).toBe(true);
    }
  });

  it("documents skipped requested IDs that are not in canonical library", () => {
    for (const id of SKIPPED_TOP20_REQUESTED_IDS) {
      expect(canonicalIds.has(id)).toBe(false);
    }
    expect(SKIPPED_TOP20_REQUESTED_IDS).toEqual(["split_squat", "bulgarian_split_squat"]);
  });

  it("returns deterministic registry lookup ordering", () => {
    const first = listExerciseAcademyIntelligenceEntries();
    const second = listExerciseAcademyIntelligenceEntries();
    expect(first).toEqual(second);
    expect(first[0]?.exerciseId).toBe("barbell_row");
  });

  it("looks up intelligence by canonical exercise ID", () => {
    const entry = getExerciseAcademyIntelligenceById("bench_press");
    expect(entry?.exerciseId).toBe("bench_press");
    expect(entry?.academyVersion).toBe(EXERCISE_ACADEMY_INTELLIGENCE_VERSION);
    expect(hasExerciseAcademyIntelligence("bench_press")).toBe(true);
    expect(getExerciseAcademyIntelligenceById("unknown_exercise")).toBeNull();
  });

  it("reports coverage counts for canonical IDs", () => {
    const coverage = getExerciseAcademyIntelligenceCoverage([
      "bench_press",
      "squat",
      "unknown_exercise",
    ]);
    expect(coverage.totalCanonical).toBe(3);
    expect(coverage.withIntelligence).toBe(2);
    expect(coverage.missingExerciseIds).toEqual(["unknown_exercise"]);
    expect(coverage.coveragePercent).toBe(67);
  });
});
