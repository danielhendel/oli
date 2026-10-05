/**
 * Marsaglia polar Gaussian (plan §23.2).
 *
 * p1 = 2*u1 - 1, p2 = 2*u2 - 1, s = p1² + p2²;
 * reject if s == 0 or s >= 1; m = sqrt(-2 ln(s) / s); z1 = p1*m, z2 = p2*m.
 * Return z1 first; cache z2 and consume it BEFORE drawing any new uniforms.
 */

import type { Mulberry32 } from "./prng";

export class MarsagliaPolar {
  private readonly rng: Mulberry32;
  private cached = 0;
  private hasCached = false;
  /** Diagnostics only: number of uniforms consumed. */
  uniformsConsumed = 0;

  constructor(rng: Mulberry32) {
    this.rng = rng;
  }

  /** Drop any cached value (call after reseeding the underlying PRNG). */
  reset(): void {
    this.hasCached = false;
    this.cached = 0;
    this.uniformsConsumed = 0;
  }

  hasCachedValue(): boolean {
    return this.hasCached;
  }

  next(): number {
    if (this.hasCached) {
      this.hasCached = false;
      return this.cached;
    }
    for (;;) {
      const u1 = this.rng.nextOpenUnit();
      const u2 = this.rng.nextOpenUnit();
      this.uniformsConsumed += 2;
      const p1 = 2 * u1 - 1;
      const p2 = 2 * u2 - 1;
      const s = p1 * p1 + p2 * p2;
      if (s === 0 || s >= 1) continue;
      const m = Math.sqrt((-2 * Math.log(s)) / s);
      this.cached = p2 * m;
      this.hasCached = true;
      return p1 * m;
    }
  }
}
