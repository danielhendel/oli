/**
 * Piecewise-linear helper — knots, tails, continuity.
 */
import { describe, expect, it } from "@jest/globals";

import { clip01, lerp, piecewiseLinearScore, type PiecewiseKnot } from "../piecewiseLinear";

const SAMPLE_KNOTS: readonly PiecewiseKnot[] = [
  [0, 10],
  [1, 40],
  [2, 90],
];

describe("piecewiseLinearScore", () => {
  it("returns exact knot y at exact knot x", () => {
    expect(piecewiseLinearScore(0, SAMPLE_KNOTS)).toBe(10);
    expect(piecewiseLinearScore(1, SAMPLE_KNOTS)).toBe(40);
    expect(piecewiseLinearScore(2, SAMPLE_KNOTS)).toBe(90);
  });

  it("interpolates epsilon below and above interior knots", () => {
    const eps = 1e-9;
    expect(piecewiseLinearScore(0.5 - eps, SAMPLE_KNOTS)).toBeCloseTo(25, 5);
    expect(piecewiseLinearScore(0.5 + eps, SAMPLE_KNOTS)).toBeCloseTo(25, 5);
    expect(piecewiseLinearScore(1.5, SAMPLE_KNOTS)).toBe(65);
  });

  it("saturates left and right tails without extrapolation", () => {
    expect(piecewiseLinearScore(-100, SAMPLE_KNOTS)).toBe(10);
    expect(piecewiseLinearScore(100, SAMPLE_KNOTS)).toBe(90);
  });

  it("returns null for non-finite input or invalid knot series", () => {
    expect(piecewiseLinearScore(Number.NaN, SAMPLE_KNOTS)).toBeNull();
    expect(piecewiseLinearScore(Number.POSITIVE_INFINITY, SAMPLE_KNOTS)).toBeNull();
    expect(piecewiseLinearScore(0.5, [])).toBeNull();
    expect(piecewiseLinearScore(0.5, [[0, 10], [0, 20]])).toBeNull();
    expect(piecewiseLinearScore(0.5, [[Number.NaN, 10], [1, 20]])).toBeNull();
  });

  it("has no discontinuity on a dense sample between knots", () => {
    const steps = 500;
    let prev: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const x = (2 * i) / steps;
      const y = piecewiseLinearScore(x, SAMPLE_KNOTS);
      expect(y).not.toBeNull();
      if (prev != null && y != null) {
        const maxSlope = Math.max(
          Math.abs(40 - 10),
          Math.abs(90 - 40),
        );
        expect(Math.abs(y - prev)).toBeLessThanOrEqual(maxSlope / (steps / 2) + 1e-6);
      }
      prev = y;
    }
  });

  it("lerp and clip01 behave per freeze §3", () => {
    expect(lerp(0.5, 0, 1, 0, 100)).toBe(50);
    expect(clip01(150)).toBe(100);
    expect(clip01(-5)).toBe(0);
    expect(Number.isNaN(clip01(Number.NaN))).toBe(true);
  });
});
