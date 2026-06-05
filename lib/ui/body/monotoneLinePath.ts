/**
 * Monotone cubic interpolation (Fritsch–Carlson) → SVG path `d`. No overshoot between points.
 *
 * Extracted from {@link WeightBaselineChart} so the Body weight trend line charts share a single
 * line-drawing implementation (no duplicate truth).
 */
export function monotonePathD(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const n = points.length;
  const x = points.map((p) => p.x);
  const y = points.map((p) => p.y);

  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = x[i + 1]! - x[i]!;
    d.push(Math.abs(dx) < 1e-10 ? 0 : (y[i + 1]! - y[i]!) / dx);
  }

  const m = new Array<number>(n);
  m[0] = d[0] ?? 0;
  m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const dPrev = d[i - 1] ?? 0;
    const dCur = d[i] ?? 0;
    m[i] = dPrev * dCur <= 0 ? 0 : (dPrev + dCur) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] ?? 0;
    if (di === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / di;
    const b = m[i + 1]! / di;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * di;
      m[i + 1] = t * b * di;
    }
  }

  let path = `M ${x[0]} ${y[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = x[i + 1]! - x[i]!;
    const cp1x = x[i]! + dx / 3;
    const cp1y = y[i]! + m[i]! * (dx / 3);
    const cp2x = x[i + 1]! - dx / 3;
    const cp2y = y[i + 1]! - m[i + 1]! * (dx / 3);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x[i + 1]} ${y[i + 1]}`;
  }
  return path;
}
