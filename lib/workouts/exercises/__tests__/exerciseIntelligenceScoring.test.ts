import { HYPERTROPHY_CORE_INTELLIGENCE_V1 } from "../intelligence/hypertrophyCoreV1";
import {
  auditExerciseIntelligenceScoring,
  auditExerciseIntelligenceScoringBatch,
  computeStimulusToFatigueRatio,
  CORE_COMPOUND_EXERCISE_IDS,
  maxIsolationFatigue,
  meanFatigueForRows,
  minFatigueForRows,
  SFR_TOLERANCE,
} from "../intelligence/exerciseIntelligenceScoring";
import { exerciseIntelligenceStimulusSum } from "../intelligence/exerciseIntelligenceV1Types";

describe("ExerciseIntelligenceV1 Core 100 scoring audit", () => {
  it("has no scoring consistency issues across all 100 seeded rows", () => {
    expect(auditExerciseIntelligenceScoringBatch(HYPERTROPHY_CORE_INTELLIGENCE_V1)).toEqual([]);
  });

  it("stimulusToFatigueRatio equals normalized total stimulus / fatigue within tolerance", () => {
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      const expected = computeStimulusToFatigueRatio(row.stimulus, row.fatigue);
      expect(Math.abs(row.stimulusToFatigueRatio - expected)).toBeLessThanOrEqual(SFR_TOLERANCE);
    }
  });

  it("all scalar scores are within 0–1", () => {
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      const issues = auditExerciseIntelligenceScoring(row).filter((i) => i.kind === "score_out_of_range");
      expect(issues).toEqual([]);
    }
  });

  it("every seeded exercise has non-empty stimulus", () => {
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      expect(exerciseIntelligenceStimulusSum(row.stimulus)).toBeGreaterThan(0);
    }
  });

  it("no seeded exercise has impossible values (stimulus sum ≤ 1, recovery ≤ fatigue)", () => {
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      expect(exerciseIntelligenceStimulusSum(row.stimulus)).toBeLessThanOrEqual(1);
      expect(row.recoveryDemand).toBeLessThanOrEqual(row.fatigue);
    }
  });

  it("compound lifts generally have higher fatigue than isolations", () => {
    const compoundMean = meanFatigueForRows(HYPERTROPHY_CORE_INTELLIGENCE_V1, CORE_COMPOUND_EXERCISE_IDS);
    const isolationRows = HYPERTROPHY_CORE_INTELLIGENCE_V1.filter(
      (r) => !CORE_COMPOUND_EXERCISE_IDS.has(r.exerciseId),
    );
    const isolationMean =
      isolationRows.reduce((sum, r) => sum + r.fatigue, 0) / isolationRows.length;

    expect(compoundMean).toBeGreaterThan(isolationMean);

    const minCompound = minFatigueForRows(HYPERTROPHY_CORE_INTELLIGENCE_V1, CORE_COMPOUND_EXERCISE_IDS);
    const maxIsolation = maxIsolationFatigue(HYPERTROPHY_CORE_INTELLIGENCE_V1);
    expect(maxIsolation).toBeLessThanOrEqual(minCompound + 0.02);
  });
});
