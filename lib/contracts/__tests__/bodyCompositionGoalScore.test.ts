import {
  BODY_COMPOSITION_GOAL_VERSION,
  computeBodyCompositionGoalScoreV1,
  type BodyCompositionScoreInput,
} from "../bodyCompositionGoal";

function baseInput(
  overrides: Partial<BodyCompositionScoreInput> = {},
): BodyCompositionScoreInput {
  return {
    primaryMetric: "weight",
    goalPrimaryMetric: "weight",
    baselineValue: 100,
    targetValue: 90,
    latestTrustedValue: 100,
    measurementUnit: "kg",
    goalUnit: "kg",
    baselineAt: "2026-01-01T12:00:00.000Z",
    latestMeasurementAt: "2026-01-15T12:00:00.000Z",
    goalVersion: BODY_COMPOSITION_GOAL_VERSION,
    ...overrides,
  };
}

describe("computeBodyCompositionGoalScoreV1", () => {
  it("returns 0 at baseline (decreasing weight)", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 100 }));
    expect(r).toEqual({ available: true, score0to100: 0 });
  });

  it("returns 50 halfway (decreasing weight)", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 95 }));
    expect(r).toEqual({ available: true, score0to100: 50 });
  });

  it("returns 100 at target (decreasing weight)", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 90 }));
    expect(r).toEqual({ available: true, score0to100: 100 });
  });

  it("clamps beyond target to 100", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 85 }));
    expect(r).toEqual({ available: true, score0to100: 100 });
  });

  it("returns 0 for movement opposite the target", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 105 }));
    expect(r).toEqual({ available: true, score0to100: 0 });
  });

  it("supports increasing weight goal", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({
        baselineValue: 70,
        targetValue: 80,
        latestTrustedValue: 75,
      }),
    );
    expect(r).toEqual({ available: true, score0to100: 50 });
  });

  it("supports decreasing body-fat goal", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({
        primaryMetric: "bodyFat",
        goalPrimaryMetric: "bodyFat",
        baselineValue: 25,
        targetValue: 15,
        latestTrustedValue: 20,
        measurementUnit: "percent",
        goalUnit: "percent",
      }),
    );
    expect(r).toEqual({ available: true, score0to100: 50 });
  });

  it("supports increasing lean-mass goal", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({
        primaryMetric: "leanMass",
        goalPrimaryMetric: "leanMass",
        baselineValue: 50,
        targetValue: 60,
        latestTrustedValue: 55,
      }),
    );
    expect(r).toEqual({ available: true, score0to100: 50 });
  });

  it("preserves valid zero score", () => {
    const r = computeBodyCompositionGoalScoreV1(baseInput({ latestTrustedValue: 100 }));
    expect(r.available && r.score0to100).toBe(0);
  });

  it("rejects missing latest", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({ latestTrustedValue: Number.NaN }),
    );
    expect(r).toEqual({ available: false, reason: "missing_latest" });
  });

  it("rejects baseline equals target", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({ baselineValue: 80, targetValue: 80 }),
    );
    expect(r).toEqual({ available: false, reason: "baseline_equals_target" });
  });

  it("rejects unit mismatch", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({ measurementUnit: "percent", goalUnit: "kg" }),
    );
    expect(r).toEqual({ available: false, reason: "unit_mismatch" });
  });

  it("rejects metric mismatch", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({ primaryMetric: "weight", goalPrimaryMetric: "bodyFat" }),
    );
    expect(r).toEqual({ available: false, reason: "metric_mismatch" });
  });

  it("rejects null input as missing_goal", () => {
    expect(computeBodyCompositionGoalScoreV1(null)).toEqual({
      available: false,
      reason: "missing_goal",
    });
  });

  it("rejects Infinity", () => {
    const r = computeBodyCompositionGoalScoreV1(
      baseInput({ latestTrustedValue: Number.POSITIVE_INFINITY }),
    );
    expect(r).toEqual({ available: false, reason: "missing_latest" });
  });
});
