import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import {
  buildExerciseIntelligenceAuditModel,
  MAJOR_HYPERTROPHY_REGION_KEYS,
} from "../intelligence/buildExerciseIntelligenceAuditModel";

describe("buildExerciseIntelligenceAuditModel", () => {
  const model = buildExerciseIntelligenceAuditModel();

  it("reports total library exercises from EXERCISE_LIBRARY_V1", () => {
    expect(model.totalLibraryExercises).toBe(EXERCISE_LIBRARY_V1.length);
    expect(model.totalLibraryExercises).toBeGreaterThan(100);
  });

  it("reports Hypertrophy Core seeded count of 100", () => {
    expect(model.seededIntelligenceCount).toBe(100);
  });

  it("derives coverage percent from seeded count / library total", () => {
    expect(model.coveragePercent).toBeCloseTo((100 / EXERCISE_LIBRARY_V1.length) * 100, 1);
  });

  it("has zero scoring audit issues across Core 100", () => {
    expect(model.scoringAuditIssueCount).toBe(0);
  });

  it("covers forearms and tibialis in region counts", () => {
    expect(model.seededByRegion.forearms).toBeGreaterThan(0);
    expect(model.seededByRegion.tibialis).toBeGreaterThan(0);
    expect(model.missingMajorRegionCoverage).not.toContain("forearms");
    expect(model.missingMajorRegionCoverage).not.toContain("tibialis");
  });

  it("lists every major region in seededByRegion", () => {
    for (const key of MAJOR_HYPERTROPHY_REGION_KEYS) {
      expect(typeof model.seededByRegion[key]).toBe("number");
      expect(model.seededByRegion[key]).toBeGreaterThan(0);
    }
    expect(model.missingMajorRegionCoverage).toEqual([]);
  });

  it("returns top 10 ranked lists with deterministic ordering", () => {
    expect(model.topSfrExercises).toHaveLength(10);
    expect(model.highestFatigueExercises).toHaveLength(10);
    expect(model.highestJointStressExercises.lumbar).toHaveLength(10);
    expect(model.highestJointStressExercises.shoulder).toHaveLength(10);
    expect(model.highestJointStressExercises.knee).toHaveLength(10);

    for (let i = 1; i < model.topSfrExercises.length; i += 1) {
      const prev = model.topSfrExercises[i - 1]!;
      const curr = model.topSfrExercises[i]!;
      expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      if (prev.score === curr.score) {
        expect(prev.exerciseId.localeCompare(curr.exerciseId)).toBeLessThanOrEqual(0);
      }
    }
  });
});
