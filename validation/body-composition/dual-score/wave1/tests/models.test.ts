import { SIGMA_STAR } from "../src/constants";
import { MarsagliaPolar } from "../src/marsaglia";
import {
  IDX_ALMI,
  IDX_FFMI,
  IDX_FMI,
  IDX_WHTR,
  Z_ALM,
  Z_FFM,
  Z_FM,
  Z_HEIGHT,
  Z_WAIST,
  covarianceParametersFor,
  drawModelA,
  drawModelB,
  drawNoise,
  expectedCorrelations,
  modelAError,
  modelB,
  perturbIndices,
  personaBase,
} from "../src/models";
import { personaById } from "../src/personas";
import { Mulberry32 } from "../src/prng";

function corr(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i]! - ma) * (b[i]! - mb);
    saa += (a[i]! - ma) ** 2;
    sbb += (b[i]! - mb) ** 2;
  }
  return sab / Math.sqrt(saa * sbb);
}

function sample(model: ReturnType<typeof modelB> | ReturnType<typeof modelAError>, seed: number, n: number) {
  const g = new MarsagliaPolar(new Mulberry32(seed));
  const cols: number[][] = [[], [], [], [], []];
  const z = new Float64Array(5);
  for (let i = 0; i < n; i++) {
    drawNoise(g, model, z);
    for (let k = 0; k < 5; k++) cols[k]!.push(z[k]!);
  }
  return cols;
}

describe("canonical draw order", () => {
  it("Height, FM, FFM, ALM, Waist — five normals per observation", () => {
    expect([Z_HEIGHT, Z_FM, Z_FFM, Z_ALM, Z_WAIST]).toEqual([0, 1, 2, 3, 4]);
    const g = new MarsagliaPolar(new Mulberry32(11));
    const ref = new MarsagliaPolar(new Mulberry32(11));
    const raw = [0, 1, 2, 3, 4].map(() => ref.next());
    const z = new Float64Array(5);
    drawModelA(g, z);
    expect(Array.from(z)).toEqual(raw);
  });
  it("consumes the same number of normals under Model B", () => {
    const g = new MarsagliaPolar(new Mulberry32(11));
    const z = new Float64Array(5);
    drawModelB(g, 0.5, z);
    const after = g.next();
    const ref = new MarsagliaPolar(new Mulberry32(11));
    for (let i = 0; i < 5; i++) ref.next();
    expect(after).toBe(ref.next());
  });
});

describe("Model A — independent DXA component errors", () => {
  it("has zero synthetic correlation among FM/FFM/ALM", () => {
    const c = sample(modelAError(), 101, 200000);
    expect(Math.abs(corr(c[Z_FM]!, c[Z_FFM]!))).toBeLessThan(0.01);
    expect(Math.abs(corr(c[Z_FFM]!, c[Z_ALM]!))).toBeLessThan(0.01);
    expect(Math.abs(corr(c[Z_FM]!, c[Z_ALM]!))).toBeLessThan(0.01);
    expect(expectedCorrelations(modelAError())).toEqual({ corrFmFfm: 0, corrFfmAlm: 0, corrFmAlm: 0 });
  });
  it("is NOT Model B at rho=0: separate model kind, separate covariance block, separate stream", () => {
    expect(modelAError()).toEqual({ kind: "A" });
    expect(modelB(0)).toEqual({ kind: "B", rho: 0 });
    expect(covarianceParametersFor(modelAError())).toEqual({
      model: "A_independent_dxa",
      sharedHeightError: true,
      correlatedPairs: [],
      rho: null,
    });
    expect(covarianceParametersFor(modelB(0))).toEqual({
      model: "B_correlated_dxa",
      sharedHeightError: true,
      correlatedPairs: [
        ["FM", "FFM"],
        ["FFM", "ALM"],
      ],
      rho: 0,
    });
    // Distinct derived seeds => distinct draw streams for the same persona/sigma.
    const a = sample(modelAError(), 500, 50);
    const b = sample(modelB(0), 501, 50);
    expect(a[Z_FM]).not.toEqual(b[Z_FM]);
  });
});

describe("Model B — correlated pairs (FM↔FFM, FFM↔ALM) only", () => {
  const rho = 0.6;
  const c = sample(modelB(rho), 202, 300000);
  it("corr(FM,FFM)=rho and corr(FFM,ALM)=rho", () => {
    expect(corr(c[Z_FM]!, c[Z_FFM]!)).toBeCloseTo(rho, 1);
    expect(Math.abs(corr(c[Z_FM]!, c[Z_FFM]!) - rho)).toBeLessThan(0.01);
    expect(Math.abs(corr(c[Z_FFM]!, c[Z_ALM]!) - rho)).toBeLessThan(0.01);
  });
  it("corr(FM,ALM)=rho^2 (documented)", () => {
    expect(Math.abs(corr(c[Z_FM]!, c[Z_ALM]!) - rho * rho)).toBeLessThan(0.01);
    expect(expectedCorrelations(modelB(rho)).corrFmAlm).toBeCloseTo(0.36, 12);
  });
  it("keeps Height and Waist independent of the DXA components", () => {
    expect(Math.abs(corr(c[Z_HEIGHT]!, c[Z_FM]!))).toBeLessThan(0.01);
    expect(Math.abs(corr(c[Z_WAIST]!, c[Z_ALM]!))).toBeLessThan(0.01);
  });
  it("applies the exact construction", () => {
    const g = new MarsagliaPolar(new Mulberry32(77));
    const ref = new MarsagliaPolar(new Mulberry32(77));
    const [zh, zfm, zffmInd, zalmInd, zw] = [0, 1, 2, 3, 4].map(() => ref.next()) as [number, number, number, number, number];
    const z = new Float64Array(5);
    drawModelB(g, -0.5, z);
    const s = Math.sqrt(1 - 0.25);
    const zffm = -0.5 * zfm + s * zffmInd;
    const zalm = -0.5 * zffm + s * zalmInd;
    expect(z[Z_HEIGHT]).toBe(zh);
    expect(z[Z_FM]).toBe(zfm);
    expect(z[Z_FFM]).toBeCloseTo(zffm, 14);
    expect(z[Z_ALM]).toBeCloseTo(zalm, 14);
    expect(z[Z_WAIST]).toBe(zw);
  });
  it("rejects |rho| >= 1", () => {
    expect(() => modelB(1)).toThrow();
    expect(() => modelB(-1)).toThrow();
  });
});

describe("shared-Height propagation", () => {
  it("applies ONE eps_H to WHtR, FMI, FFMI and ALMI simultaneously", () => {
    const p = personaById("P-01");
    const base = personaBase(p);
    const z = new Float64Array(5);
    z[Z_HEIGHT] = 2; // +2 sigma on height only
    const out = new Float64Array(4);
    perturbIndices(base, 1, z, out);
    const h2 = base.heightCm + SIGMA_STAR.heightCm * 2;
    expect(out[IDX_WHTR]).toBeCloseTo(base.waistCm / h2, 12);
    expect(out[IDX_FMI]).toBeCloseTo(base.fmKg / (h2 / 100) ** 2, 12);
    expect(out[IDX_FFMI]).toBeCloseTo(base.ffmKg / (h2 / 100) ** 2, 12);
    expect(out[IDX_ALMI]).toBeCloseTo(base.almKg / (h2 / 100) ** 2, 12);
  });
  it("sigma multiplier scales every sigma*", () => {
    const base = personaBase(personaById("P-01"));
    const z = new Float64Array([0, 1, 0, 0, 0]);
    const o1 = new Float64Array(4);
    const o2 = new Float64Array(4);
    perturbIndices(base, 1, z, o1);
    perturbIndices(base, 2, z, o2);
    const h2 = (base.heightCm / 100) ** 2;
    expect(o1[IDX_FMI]! - base.fmKg / h2).toBeCloseTo(0.25 / h2, 12);
    expect(o2[IDX_FMI]! - base.fmKg / h2).toBeCloseTo(0.5 / h2, 12);
  });
  it("frozen sigma* values", () => {
    expect(SIGMA_STAR).toEqual({ waistCm: 1.0, heightCm: 0.5, fmKg: 0.25, ffmKg: 0.25, almKg: 0.2 });
  });
});
