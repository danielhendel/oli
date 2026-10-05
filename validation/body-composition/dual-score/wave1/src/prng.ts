/**
 * mulberry32 — exact port (plan §23.2). No platform RNG.
 *
 * u = (x + 0.5) / 4294967296  ⇒  0 < u < 1 for every uint32 x.
 */

const TWO_POW_32 = 4294967296;

export function uint32ToOpenUnit(x: number): number {
  return (x + 0.5) / TWO_POW_32;
}

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Reset to a new seed (used for per-replicate streams). */
  reseed(seed: number): void {
    this.state = seed | 0;
  }

  /** Next unsigned 32-bit integer in [0, 2^32 - 1]. */
  nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Open-interval uniform u ∈ (0,1) via (x + 0.5) / 2^32. */
  nextOpenUnit(): number {
    return (this.nextUint32() + 0.5) / TWO_POW_32;
  }
}

export function createMulberry32(seed: number): Mulberry32 {
  return new Mulberry32(seed);
}
