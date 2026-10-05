import { MarsagliaPolar } from "../src/marsaglia";
import { Mulberry32 } from "../src/prng";

describe("Marsaglia polar", () => {
  it("returns z1 first and caches z2 for the very next call (no new uniforms)", () => {
    // Reproduce the first accepted pair by hand from the raw stream.
    const raw = new Mulberry32(20261004);
    let z1 = 0;
    let z2 = 0;
    for (;;) {
      const u1 = raw.nextOpenUnit();
      const u2 = raw.nextOpenUnit();
      const p1 = 2 * u1 - 1;
      const p2 = 2 * u2 - 1;
      const s = p1 * p1 + p2 * p2;
      if (s === 0 || s >= 1) continue;
      const m = Math.sqrt((-2 * Math.log(s)) / s);
      z1 = p1 * m;
      z2 = p2 * m;
      break;
    }
    const g = new MarsagliaPolar(new Mulberry32(20261004));
    expect(g.hasCachedValue()).toBe(false);
    expect(g.next()).toBe(z1);
    expect(g.hasCachedValue()).toBe(true);
    const consumed = g.uniformsConsumed;
    expect(g.next()).toBe(z2);
    expect(g.uniformsConsumed).toBe(consumed); // cached value consumed BEFORE any new uniforms
    expect(g.hasCachedValue()).toBe(false);
  });

  it("consumes cached values across odd/even call counts deterministically", () => {
    const a = new MarsagliaPolar(new Mulberry32(5));
    const b = new MarsagliaPolar(new Mulberry32(5));
    const xs = Array.from({ length: 7 }, () => a.next());
    const ys = Array.from({ length: 7 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it("reset drops the cache (used after reseeding)", () => {
    const rng = new Mulberry32(3);
    const g = new MarsagliaPolar(rng);
    g.next();
    expect(g.hasCachedValue()).toBe(true);
    rng.reseed(3);
    g.reset();
    expect(g.hasCachedValue()).toBe(false);
    const fresh = new MarsagliaPolar(new Mulberry32(3));
    expect(g.next()).toBe(fresh.next());
  });

  it("produces approximately standard normal samples", () => {
    const g = new MarsagliaPolar(new Mulberry32(42));
    const n = 200000;
    let s = 0;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const z = g.next();
      s += z;
      ss += z * z;
    }
    const m = s / n;
    const v = ss / n - m * m;
    expect(Math.abs(m)).toBeLessThan(0.01);
    expect(Math.abs(v - 1)).toBeLessThan(0.02);
  });
});
