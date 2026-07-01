import { EXERCISE_LIBRARY_V1 } from "../../library.v1";
import {
  EXERCISE_LIBRARY_ENRICHMENT_V1,
  TOP25_EXERCISE_ENRICHMENT_IDS,
  getExerciseLibraryEnrichmentById,
  hasExerciseLibraryEnrichment,
} from "../libraryEnrichment.v1";
import { TOP25_EXERCISE_ENRICHMENT_ENTRIES } from "../top25ExerciseEnrichmentEntries";
import {
  TOP25_EXERCISE_PRIORITY_IDS,
  TOP50_EXERCISE_PRIORITY_IDS,
  TOP50_EXERCISE_PRIORITY_PLAN_V1,
} from "../top50ExercisePriorityPlan.v1";
import { assertNoExerciseLibraryEnrichmentErrors } from "../validateExerciseLibraryEnrichment";

describe("Exercise Library Enrichment v1", () => {
  const canonicalIds = new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));

  it("contains at least 25 enrichment entries", () => {
    expect(EXERCISE_LIBRARY_ENRICHMENT_V1.length).toBeGreaterThanOrEqual(25);
  });

  it("every enriched exerciseId exists in EXERCISE_LIBRARY_V1", () => {
    for (const entry of EXERCISE_LIBRARY_ENRICHMENT_V1) {
      expect(canonicalIds.has(entry.exerciseId)).toBe(true);
    }
  });

  it("has no duplicate enrichment IDs", () => {
    const ids = EXERCISE_LIBRARY_ENRICHMENT_V1.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("TOP25_EXERCISE_ENRICHMENT_IDS has 25 unique IDs", () => {
    expect(TOP25_EXERCISE_ENRICHMENT_IDS).toHaveLength(25);
    expect(new Set(TOP25_EXERCISE_ENRICHMENT_IDS).size).toBe(25);
  });

  it("every top25 ID has enrichment", () => {
    for (const id of TOP25_EXERCISE_ENRICHMENT_IDS) {
      expect(hasExerciseLibraryEnrichment(id)).toBe(true);
      expect(getExerciseLibraryEnrichmentById(id)).not.toBeNull();
    }
  });

  it("top50 priority plan has 50 unique IDs that exist in library", () => {
    expect(TOP50_EXERCISE_PRIORITY_PLAN_V1).toHaveLength(50);
    expect(new Set(TOP50_EXERCISE_PRIORITY_IDS).size).toBe(50);
    for (const id of TOP50_EXERCISE_PRIORITY_IDS) {
      expect(canonicalIds.has(id)).toBe(true);
    }
  });

  it("top50 priority ranks are unique and contiguous 1–50", () => {
    const ranks = TOP50_EXERCISE_PRIORITY_PLAN_V1.map((item) => item.priorityRank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("top25 priority IDs match enrichment scope", () => {
    expect(TOP25_EXERCISE_PRIORITY_IDS).toEqual(TOP25_EXERCISE_ENRICHMENT_IDS);
  });

  it("includes bench_press with required M9/M11 keyframe poses", () => {
    const bench = getExerciseLibraryEnrichmentById("bench_press");
    expect(bench).not.toBeNull();
    const poseIds = bench!.mediaProfile.keyframeRequirements.map((k) => k.poseId);
    expect(poseIds).toEqual(
      expect.arrayContaining(["setup", "start_lockout", "bottom_chest_pause", "finish_lockout"]),
    );
  });

  it("all top25 entries default to ready-for-expert-review", () => {
    for (const entry of TOP25_EXERCISE_ENRICHMENT_ENTRIES) {
      expect(entry.reviewStatus).toBe("ready-for-expert-review");
    }
  });

  it("passes validation with no errors", () => {
    expect(() => assertNoExerciseLibraryEnrichmentErrors()).not.toThrow();
  });
});
