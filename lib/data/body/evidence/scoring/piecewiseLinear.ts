/**
 * Shared piecewise-linear score helper (mathematical truth freeze §3.1–3.2).
 *
 * - Exact knot y at exact knot x
 * - Linear interpolation between knots
 * - Saturate left/right tails (never extrapolate)
 * - Reject non-finite input
 */

export type PiecewiseKnot = readonly [x: number, y: number];

export function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

export function clip01(s: number): number {
  if (!Number.isFinite(s)) return Number.NaN;
  return Math.min(100, Math.max(0, s));
}

/**
 * Evaluate a non-decreasing x-ordered knot series with saturated tails.
 * Knots must be strictly increasing in x.
 */
export function piecewiseLinearScore(
  x: number,
  knots: readonly PiecewiseKnot[],
): number | null {
  if (!Number.isFinite(x)) return null;
  if (knots.length < 1) return null;
  for (const knot of knots) {
    const kx = knot[0];
    const ky = knot[1];
    if (!Number.isFinite(kx) || !Number.isFinite(ky)) return null;
  }
  for (let i = 1; i < knots.length; i++) {
    const prev = knots[i - 1];
    const curr = knots[i];
    if (prev == null || curr == null) return null;
    if (!(curr[0] > prev[0])) return null;
  }

  const first = knots[0];
  const last = knots[knots.length - 1];
  if (first == null || last == null) return null;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];

  for (let i = 1; i < knots.length; i++) {
    const prev = knots[i - 1];
    const curr = knots[i];
    if (prev == null || curr == null) return null;
    const [x0, y0] = prev;
    const [x1, y1] = curr;
    if (x === x1) return y1;
    if (x < x1) {
      if (x === x0) return y0;
      return lerp(x, x0, x1, y0, y1);
    }
  }
  return last[1];
}
