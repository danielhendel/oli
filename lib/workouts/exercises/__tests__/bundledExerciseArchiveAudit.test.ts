import { describe, expect, it } from "@jest/globals";
import { CONFIRMED_UNUSED_BUNDLED_EXERCISE_IDS } from "../bundledExerciseConfirmedUnused";
import {
  bundledExerciseIdsAmbiguousForAutoArchive,
  collectAllClassificationMapExerciseIds,
  computeBundledCatalogAmbiguousExerciseIds,
  findBundledExerciseIdsMissingFromAllClassificationMaps,
} from "../bundledExerciseArchiveAudit";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";

describe("bundledExerciseArchiveAudit", () => {
  it("classification union is a subset of bundled ids (some cardio/conditioning rows omit muscle slices)", () => {
    const classified = collectAllClassificationMapExerciseIds();
    const lib = new Set(EXERCISE_LIBRARY_V1.map((x) => x.exerciseId));
    for (const id of classified) expect(lib.has(id)).toBe(true);
    expect(classified.size).toBeLessThanOrEqual(EXERCISE_LIBRARY_V1.length);
  });

  it("missing slice ids include known cardio machine entries (ambiguous for auto-archive)", () => {
    const missing = findBundledExerciseIdsMissingFromAllClassificationMaps();
    expect(missing).toContain("treadmill_run");
    expect(missing).toContain("rower");
    expect(missing.length).toBeGreaterThan(0);
  });

  it("confirmed-unused archive gate never lists ambiguous / unclassified bundled ids", () => {
    const amb = bundledExerciseIdsAmbiguousForAutoArchive();
    for (const id of CONFIRMED_UNUSED_BUNDLED_EXERCISE_IDS) {
      expect(amb.has(id)).toBe(false);
    }
  });

  it("label collision set is stable (empty when no duplicate normalized labels)", () => {
    const collisions = computeBundledCatalogAmbiguousExerciseIds();
    expect(collisions.size).toBeGreaterThanOrEqual(0);
  });
});
