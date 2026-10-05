import {
  ConvergenceTracker,
  FROZEN_CONVERGENCE_PARAMS,
  OnlineMoments,
  batchMeansSe,
  batchSampleSd,
  checkpointPasses,
  computeCheckpointEstimate,
  crossesThreshold,
  largestPrefixDivisibleBy,
  mean,
  quantileType7,
  sampleSd,
  sortedCopy,
} from "../src/stats";
import type { CheckpointEstimate } from "../src/stats";
import { MC_PROTOCOL, THRESHOLDS } from "../src/constants";

describe("Hyndman–Fan Type 7", () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("matches textbook values", () => {
    expect(quantileType7(x, 0)).toBe(1);
    expect(quantileType7(x, 1)).toBe(10);
    expect(quantileType7(x, 0.5)).toBe(5.5);
    expect(quantileType7(x, 0.25)).toBeCloseTo(3.25, 12); // h=2.25 -> 3 + .25
    expect(quantileType7(x, 0.95)).toBeCloseTo(9.55, 12); // h=8.55 -> 9 + .55
    expect(quantileType7(x, 0.05)).toBeCloseTo(1.45, 12);
  });
  it("single value and respects n prefix", () => {
    expect(quantileType7([7], 0.9)).toBe(7);
    expect(quantileType7([1, 2, 3, 100], 0.5, 3)).toBe(2);
  });
  it("is NaN for n=0 and throws for p outside [0,1]", () => {
    expect(quantileType7([], 0.5)).toBeNaN();
    expect(() => quantileType7(x, 1.1)).toThrow();
  });
  it("sortedCopy sorts numerically (not lexicographically)", () => {
    expect(Array.from(sortedCopy([10, 9, 100, 1]))).toEqual([1, 9, 10, 100]);
  });
});

describe("sample SD and batch means", () => {
  it("uses divisor n-1", () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(sampleSd([1])).toBeNaN();
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it("batch SE = sample SD (divisor B-1) / sqrt(B) with B=20", () => {
    const ys = Array.from({ length: 20 }, (_, i) => i + 1);
    const sd = Math.sqrt(ys.reduce((a, y) => a + (y - 10.5) ** 2, 0) / 19);
    expect(batchSampleSd(ys)).toBeCloseTo(sd, 12);
    expect(batchMeansSe(ys)).toBeCloseTo(sd / Math.sqrt(20), 12);
    expect(MC_PROTOCOL.batchCount).toBe(20);
  });
  it("largest prefix divisible by 20", () => {
    expect(largestPrefixDivisibleBy(100000)).toBe(100000);
    expect(largestPrefixDivisibleBy(100019)).toBe(100000);
    expect(largestPrefixDivisibleBy(19)).toBe(0);
  });
  it("threshold crossing = opposite sides with >= counted above", () => {
    expect(crossesThreshold(70, 69.999, 70)).toBe(true);
    expect(crossesThreshold(70, 70, 70)).toBe(false);
    expect(crossesThreshold(69, 70, 70)).toBe(true);
    expect(crossesThreshold(80, 90, 70)).toBe(false);
  });
});

describe("OnlineMoments (Welford)", () => {
  it("matches a two-pass sample covariance", () => {
    const xs = [
      [1, 2],
      [2, 1],
      [3, 5],
      [4, 3],
      [5, 8],
    ];
    const om = new OnlineMoments(2);
    for (const r of xs) om.push(r);
    const c = om.covariance();
    const mx = 3;
    const my = 3.8;
    const sxx = xs.reduce((a, r) => a + (r[0]! - mx) ** 2, 0) / 4;
    const sxy = xs.reduce((a, r) => a + (r[0]! - mx) * (r[1]! - my), 0) / 4;
    expect(c[0]![0]).toBeCloseTo(sxx, 12);
    expect(c[0]![1]).toBeCloseTo(sxy, 12);
    expect(c[1]![0]).toBeCloseTo(sxy, 12);
  });
});

function est(over: Partial<CheckpointEstimate> = {}): CheckpointEstimate {
  return {
    draws: 100000,
    prefix: 100000,
    medianAbs: 1,
    p95Abs: 3,
    rates: THRESHOLDS.map(() => 0.1),
    seMedianAbs: 0.001,
    seP95Abs: 0.002,
    seRates: THRESHOLDS.map(() => 0.0001),
    ...over,
  };
}

describe("convergence helper", () => {
  it("frozen tolerances", () => {
    expect(FROZEN_CONVERGENCE_PARAMS).toMatchObject({
      medianDeltaTolerance: 0.01,
      p95DeltaTolerance: 0.02,
      medianSeTolerance: 0.02,
      p95SeTolerance: 0.05,
      rateDeltaTolerance: 0.001,
      rateSeTolerance: 0.001,
      requiredConsecutivePasses: 2,
    });
  });
  it("passes when all deltas and SEs are inside tolerance", () => {
    expect(checkpointPasses(est(), est({ medianAbs: 1.005 })).pass).toBe(true);
  });
  it.each([
    ["median_delta", { medianAbs: 1.02 }],
    ["p95_delta", { p95Abs: 3.03 }],
    ["median_se", { seMedianAbs: 0.03 }],
    ["p95_se", { seP95Abs: 0.06 }],
  ] as const)("fails on %s", (name, over) => {
    const r = checkpointPasses(est(), est(over));
    expect(r.pass).toBe(false);
    expect(r.failures).toContain(name);
  });
  it("fails when any threshold rate moves more than tol_rate or its SE exceeds se_tol_rate", () => {
    const rates = THRESHOLDS.map(() => 0.1);
    rates[3] = 0.1011;
    expect(checkpointPasses(est(), est({ rates })).pass).toBe(false);
    const seRates = THRESHOLDS.map(() => 0.0001);
    seRates[0] = 0.002;
    expect(checkpointPasses(est(), est({ seRates })).pass).toBe(false);
  });
  it("tracker: first checkpoint is only the reference; needs 2 CONSECUTIVE passes", () => {
    const t = new ConvergenceTracker();
    expect(t.push(est()).converged).toBe(false); // reference
    expect(t.push(est()).pass).toBe(true);
    expect(t.converged).toBe(false);
    expect(t.push(est({ medianAbs: 1.5 })).pass).toBe(false); // resets streak
    expect(t.consecutivePasses).toBe(0);
    t.push(est({ medianAbs: 1.5 }));
    expect(t.converged).toBe(false);
    t.push(est({ medianAbs: 1.5 }));
    expect(t.converged).toBe(true);
  });
  it("computeCheckpointEstimate returns SEs from 20 batches", () => {
    const n = 4000;
    const absDelta = new Float64Array(n);
    const noisy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      absDelta[i] = (i % 100) / 100;
      noisy[i] = 50 + ((i % 100) - 50) / 10;
    }
    const e = computeCheckpointEstimate({
      absDelta,
      noisy,
      s0: 50,
      n,
      scratchA: new Float64Array(n),
      scratchB: new Float64Array(n),
    });
    expect(e.prefix).toBe(4000);
    expect(e.medianAbs).toBeCloseTo(0.495, 2);
    expect(e.rates).toHaveLength(9);
    expect(e.seRates).toHaveLength(9);
    expect(e.seMedianAbs).toBeGreaterThanOrEqual(0);
  });
});
