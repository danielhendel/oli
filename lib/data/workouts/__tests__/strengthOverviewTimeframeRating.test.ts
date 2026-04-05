import type { StrengthOverviewTimeframeRatingTier } from "../strengthOverviewTimeframeRating";
import {
  computeStrengthOverviewMarkerPosition01,
  getStrengthOverviewTierSegmentBounds01,
  STRENGTH_OVERVIEW_TF_PROGRESS_SCALE,
  STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN,
  STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN,
  STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN,
  STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN,
  strengthOverviewTimeframeConsistencyRating,
} from "../strengthOverviewTimeframeRating";

describe("strengthOverviewTimeframeConsistencyRating", () => {
  it("returns Low and zero progress when no workouts", () => {
    const r = strengthOverviewTimeframeConsistencyRating({
      timeframe: "ytd",
      avgWorkoutsPerWeek: null,
      totalWorkouts: 0,
      elapsedCalendarDays: 100,
    });
    expect(r.tier).toBe("low");
    expect(r.label).toBe("Low");
    expect(r.progress).toBe(0);
    expect(r.scoringAvg).toBe(0);
  });

  it("tier boundaries on ytd match avg/week thresholds when density is saturated", () => {
    const mk = (avg: number) =>
      strengthOverviewTimeframeConsistencyRating({
        timeframe: "ytd",
        avgWorkoutsPerWeek: avg,
        totalWorkouts: 50,
        elapsedCalendarDays: 100,
      });

    expect(mk(STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN - 0.001).tier).toBe("low");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN).tier).toBe("developing");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN - 0.001).tier).toBe("developing");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN).tier).toBe("solid");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN - 0.001).tier).toBe("solid");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN).tier).toBe("strong");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN - 0.001).tier).toBe("strong");
    expect(mk(STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN).tier).toBe("optimal");
  });

  it("progress clamps to 1 and scales with scoring average", () => {
    const r = strengthOverviewTimeframeConsistencyRating({
      timeframe: "mtd",
      avgWorkoutsPerWeek: 20,
      totalWorkouts: 40,
      elapsedCalendarDays: 30,
    });
    expect(r.progress).toBe(1);
    const r2 = strengthOverviewTimeframeConsistencyRating({
      timeframe: "mtd",
      avgWorkoutsPerWeek: STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN,
      totalWorkouts: 20,
      elapsedCalendarDays: 30,
    });
    expect(r2.progress).toBeCloseTo(STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN / STRENGTH_OVERVIEW_TF_PROGRESS_SCALE, 5);
  });

  it("thisWeek dampens partial-week extrapolation so one workout day-1 is not Optimal", () => {
    const r = strengthOverviewTimeframeConsistencyRating({
      timeframe: "thisWeek",
      avgWorkoutsPerWeek: 7,
      totalWorkouts: 1,
      elapsedCalendarDays: 1,
    });
    expect(r.tier).not.toBe("optimal");
    expect(r.tier).toBe("developing");
  });

  it("low total workouts reduces scoring via density for the same avg/week", () => {
    const highDensity = strengthOverviewTimeframeConsistencyRating({
      timeframe: "threeMonth",
      avgWorkoutsPerWeek: 3,
      totalWorkouts: 20,
      elapsedCalendarDays: 90,
    });
    const lowDensity = strengthOverviewTimeframeConsistencyRating({
      timeframe: "threeMonth",
      avgWorkoutsPerWeek: 3,
      totalWorkouts: 1,
      elapsedCalendarDays: 90,
    });
    expect(lowDensity.progress).toBeLessThan(highDensity.progress);
    expect(lowDensity.tier).not.toBe("optimal");
  });
});

function assertMarkerWithinTier(tier: StrengthOverviewTimeframeRatingTier, scoringAvg: number): number {
  const m = computeStrengthOverviewMarkerPosition01({ tier, scoringAvg });
  const { start, end } = getStrengthOverviewTierSegmentBounds01(tier);
  expect(m).toBeGreaterThanOrEqual(start);
  expect(m).toBeLessThanOrEqual(end);
  return m;
}

describe("computeStrengthOverviewMarkerPosition01", () => {
  it("Strong high-end score stays inside Strong segment, not in Optimal (global progress would spill)", () => {
    const strongEnd = assertMarkerWithinTier("strong", STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN - 1e-6);
    const optimalStart = getStrengthOverviewTierSegmentBounds01("optimal").start;
    expect(strongEnd).toBeLessThan(optimalStart);
  });

  it("Strong low-end score stays inside Strong segment", () => {
    const m = assertMarkerWithinTier("strong", STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN);
    expect(m).toBeCloseTo(getStrengthOverviewTierSegmentBounds01("strong").start, 10);
  });

  it("Optimal tier stays inside Optimal segment including capped upper score", () => {
    assertMarkerWithinTier("optimal", STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN);
    assertMarkerWithinTier("optimal", STRENGTH_OVERVIEW_TF_PROGRESS_SCALE);
    assertMarkerWithinTier("optimal", 99);
  });

  const tierCases: { tier: StrengthOverviewTimeframeRatingTier; score: number }[] = [
    { tier: "low", score: 0.4 },
    { tier: "developing", score: 1.2 },
    { tier: "solid", score: 2.5 },
    { tier: "strong", score: 3.7 },
    { tier: "optimal", score: 5.3 },
  ];

  it("maps all five tiers to positions inside their own segment bounds", () => {
    for (const { tier, score } of tierCases) {
      assertMarkerWithinTier(tier, score);
    }
  });

  it("boundary scores at each tier threshold sit at segment starts (deterministic)", () => {
    expect(computeStrengthOverviewMarkerPosition01({ tier: "developing", scoringAvg: 1 })).toBeCloseTo(0.2, 10);
    expect(computeStrengthOverviewMarkerPosition01({ tier: "solid", scoringAvg: 2 })).toBeCloseTo(0.4, 10);
    expect(computeStrengthOverviewMarkerPosition01({ tier: "strong", scoringAvg: 3 })).toBeCloseTo(0.6, 10);
    expect(computeStrengthOverviewMarkerPosition01({ tier: "optimal", scoringAvg: 5 })).toBeCloseTo(0.8, 10);
  });

  it("invalid scoringAvg falls back safely for marker math", () => {
    const m = computeStrengthOverviewMarkerPosition01({ tier: "low", scoringAvg: Number.NaN });
    expect(m).toBe(0);
  });

  it("rating + marker helper: every tier from consistency rating keeps marker inside that tier segment", () => {
    const mk = (avg: number) =>
      strengthOverviewTimeframeConsistencyRating({
        timeframe: "ytd",
        avgWorkoutsPerWeek: avg,
        totalWorkouts: 50,
        elapsedCalendarDays: 100,
      });

    const samples = [0.2, 1.1, 2.2, 3.5, 5.2, 8];
    for (const avg of samples) {
      const r = mk(avg);
      assertMarkerWithinTier(r.tier, r.scoringAvg);
    }
  });
});
