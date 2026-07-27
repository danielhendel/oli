import { describe, expect, it } from "@jest/globals";

import {
  classifyReadinessContributorAverageScore,
  formatReadinessContributorScoreDisplay,
  READINESS_CONTRIBUTOR_SCORE_ZONE_FRACTIONS,
  readinessContributorScoreBarAccessibilitySummary,
  readinessContributorScoreMarkerPosition01,
} from "@/lib/data/readiness/readinessContributorScoreBar";
import { classifyOuraProviderScore } from "@/lib/format/ouraScore";

describe("readinessContributorScoreBar helpers", () => {
  it("uses true proportional zone fractions that sum to 1", () => {
    const f = READINESS_CONTRIBUTOR_SCORE_ZONE_FRACTIONS;
    expect(f.payAttention).toBeCloseTo(0.6);
    expect(f.fair).toBeCloseTo(0.1);
    expect(f.good).toBeCloseTo(0.15);
    expect(f.optimal).toBeCloseTo(0.15);
    expect(f.payAttention + f.fair + f.good + f.optimal).toBeCloseTo(1);
  });

  it("places marker at score/100 without distorting classification bands", () => {
    expect(readinessContributorScoreMarkerPosition01(0)).toBe(0);
    expect(readinessContributorScoreMarkerPosition01(50)).toBeCloseTo(0.5);
    expect(readinessContributorScoreMarkerPosition01(82)).toBeCloseTo(0.82);
    expect(readinessContributorScoreMarkerPosition01(100)).toBe(1);
  });

  it("classifies averages with existing provider bands after rounding", () => {
    expect(classifyReadinessContributorAverageScore(0)).toBe("Pay attention");
    expect(classifyReadinessContributorAverageScore(59.99)).toBe("Pay attention");
    expect(classifyReadinessContributorAverageScore(60)).toBe("Fair");
    expect(classifyReadinessContributorAverageScore(69.99)).toBe("Fair");
    expect(classifyReadinessContributorAverageScore(70)).toBe("Good");
    expect(classifyReadinessContributorAverageScore(84.99)).toBe("Good");
    expect(classifyReadinessContributorAverageScore(85)).toBe("Optimal");
    expect(classifyReadinessContributorAverageScore(100)).toBe("Optimal");
    expect(classifyReadinessContributorAverageScore(null)).toBeNull();
  });

  it("does not introduce an alternate classifier", () => {
    for (const score of [0, 59, 60, 69, 70, 84, 85, 100]) {
      expect(classifyReadinessContributorAverageScore(score)).toBe(
        classifyOuraProviderScore(score),
      );
    }
  });

  it("formats display scores as integers without units", () => {
    expect(formatReadinessContributorScoreDisplay(82.4)).toBe("82");
    expect(formatReadinessContributorScoreDisplay(null)).toBeNull();
  });

  it("accessibility summary announces out-of-100 and provider ownership", () => {
    const summary = readinessContributorScoreBarAccessibilitySummary({
      displayScore: 82,
      classification: "Good",
    });
    expect(summary).toContain("82 out of 100");
    expect(summary).toContain("Good");
    expect(summary).toContain("Oura contributor score");
    expect(summary).not.toMatch(/ms|°C|°F|color|healthy range/i);
  });
});
