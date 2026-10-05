import { Mulberry32, uint32ToOpenUnit } from "../src/prng";

/** Canonical mulberry32 one-liner (reference implementation). */
function reference(seed: number, n: number): number[] {
  let a = seed | 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push((t ^ (t >>> 14)) >>> 0);
  }
  return out;
}

const GOLDEN: Array<[number, number[]]> = [
  [0, [1144304738, 1416247, 958946056, 627933444, 2007157716]],
  [1, [2693262067, 11749833, 2265367787, 4213581821, 4159151403]],
  [20261004, [3280056454, 3657064598, 4078717403, 885281445, 1220495050]],
  [4294967295, [3850105811, 813802916, 3073704848, 4054706436, 3630262831]],
];

describe("mulberry32", () => {
  it.each(GOLDEN)("matches golden uint32 sequence for seed %i", (seed, expected) => {
    const g = new Mulberry32(seed);
    expect([0, 1, 2, 3, 4].map(() => g.nextUint32())).toEqual(expected);
  });

  it("equals the canonical one-liner for 1000 draws", () => {
    const g = new Mulberry32(20261004);
    expect(Array.from({ length: 1000 }, () => g.nextUint32())).toEqual(reference(20261004, 1000));
  });

  it("maps uint32 to the OPEN interval (0,1) via (x+0.5)/2^32", () => {
    expect(uint32ToOpenUnit(0)).toBe(0.5 / 4294967296);
    expect(uint32ToOpenUnit(0)).toBeGreaterThan(0);
    expect(uint32ToOpenUnit(4294967295)).toBeLessThan(1);
    expect(uint32ToOpenUnit(4294967295)).toBe(4294967295.5 / 4294967296);
  });

  it("never returns 0 or 1 over many draws", () => {
    const g = new Mulberry32(12345);
    for (let i = 0; i < 100000; i++) {
      const u = g.nextOpenUnit();
      expect(u > 0 && u < 1).toBe(true);
    }
  });

  it("nextOpenUnit equals (nextUint32+0.5)/2^32 on the same stream", () => {
    const a = new Mulberry32(7);
    const b = new Mulberry32(7);
    for (let i = 0; i < 50; i++) expect(a.nextOpenUnit()).toBe((b.nextUint32() + 0.5) / 4294967296);
  });

  it("reseed restarts the sequence exactly", () => {
    const g = new Mulberry32(1);
    const first = [g.nextUint32(), g.nextUint32()];
    g.reseed(1);
    expect([g.nextUint32(), g.nextUint32()]).toEqual(first);
  });

  it("does not use Math.random", () => {
    const spy = jest.spyOn(Math, "random");
    const g = new Mulberry32(99);
    for (let i = 0; i < 10; i++) g.nextOpenUnit();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
