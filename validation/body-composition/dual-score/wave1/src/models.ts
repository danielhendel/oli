/**
 * Noise / covariance models (plan §23.7).
 *
 * Canonical per-observation draw order (§23.2.3), ALWAYS all five, never skipped:
 *   1. z_Height
 *   2. z_FM
 *   3. z_FFM_ind (Model B) / independent z_FFM (Model A)
 *   4. z_ALM_ind (Model B) / independent z_ALM (Model A)
 *   5. z_Waist
 *
 * Model A is a distinct code path (independent FM/FFM/ALM). It is NOT Model B at rho=0.
 * Model B (only pairs FM↔FFM, FFM↔ALM; one common rho):
 *   z_FFM = rho*z_FM  + sqrt(1-rho²)*z_FFM_ind
 *   z_ALM = rho*z_FFM + sqrt(1-rho²)*z_ALM_ind
 *   ⇒ corr(FM,FFM)=rho, corr(FFM,ALM)=rho, corr(FM,ALM)=rho²
 */

import { SIGMA_STAR } from "./constants";
import type { MarsagliaPolar } from "./marsaglia";
import type { Persona } from "./personas";
import { personaMasses } from "./personas";

export const Z_HEIGHT = 0;
export const Z_FM = 1;
export const Z_FFM = 2;
export const Z_ALM = 3;
export const Z_WAIST = 4;

export type NoiseModel = { kind: "A" } | { kind: "B"; rho: number };

export function modelAError(): NoiseModel {
  return { kind: "A" };
}

export function modelB(rho: number): NoiseModel {
  if (!(rho > -1 && rho < 1)) throw new Error(`rho_out_of_range:${rho}`);
  return { kind: "B", rho };
}

/** Draw one observation's standardized normals into `out` [H, FM, FFM, ALM, Waist]. */
export function drawModelA(gauss: MarsagliaPolar, out: Float64Array): void {
  out[Z_HEIGHT] = gauss.next();
  out[Z_FM] = gauss.next();
  out[Z_FFM] = gauss.next(); // independent z_FFM
  out[Z_ALM] = gauss.next(); // independent z_ALM
  out[Z_WAIST] = gauss.next();
}

export function drawModelB(gauss: MarsagliaPolar, rho: number, out: Float64Array): void {
  const zH = gauss.next();
  const zFm = gauss.next();
  const zFfmInd = gauss.next();
  const zAlmInd = gauss.next();
  const zW = gauss.next();
  const s = Math.sqrt(1 - rho * rho);
  const zFfm = rho * zFm + s * zFfmInd;
  const zAlm = rho * zFfm + s * zAlmInd;
  out[Z_HEIGHT] = zH;
  out[Z_FM] = zFm;
  out[Z_FFM] = zFfm;
  out[Z_ALM] = zAlm;
  out[Z_WAIST] = zW;
}

export function drawNoise(
  gauss: MarsagliaPolar,
  model: NoiseModel,
  out: Float64Array,
): void {
  if (model.kind === "A") drawModelA(gauss, out);
  else drawModelB(gauss, model.rho, out);
}

/** Output indices of `perturbIndices`. */
export const IDX_WHTR = 0;
export const IDX_FMI = 1;
export const IDX_FFMI = 2;
export const IDX_ALMI = 3;

export type PersonaBase = {
  heightCm: number;
  waistCm: number;
  fmKg: number;
  ffmKg: number;
  almKg: number;
};

export function personaBase(p: Persona): PersonaBase {
  const m = personaMasses(p);
  return { heightCm: p.heightCm, waistCm: p.waistCm, ...m };
}

/**
 * Noise propagation with SHARED Height error:
 *   h' = h + eps_H; W' = W + eps_W; FM' = FM + eps_FM; ...
 *   WHtR' = W'/h'; FMI' = FM'/(h'/100)²; FFMI', ALMI' likewise.
 * `mult` scales every σ*.
 */
export function perturbIndices(
  base: PersonaBase,
  mult: number,
  z: Float64Array,
  out: Float64Array,
): void {
  const h = base.heightCm + SIGMA_STAR.heightCm * mult * (z[Z_HEIGHT] as number);
  const w = base.waistCm + SIGMA_STAR.waistCm * mult * (z[Z_WAIST] as number);
  const fm = base.fmKg + SIGMA_STAR.fmKg * mult * (z[Z_FM] as number);
  const ffm = base.ffmKg + SIGMA_STAR.ffmKg * mult * (z[Z_FFM] as number);
  const alm = base.almKg + SIGMA_STAR.almKg * mult * (z[Z_ALM] as number);
  const hm = h / 100;
  const hm2 = hm * hm;
  out[IDX_WHTR] = w / h;
  out[IDX_FMI] = fm / hm2;
  out[IDX_FFMI] = ffm / hm2;
  out[IDX_ALMI] = alm / hm2;
}

export function covarianceParametersFor(model: NoiseModel): {
  model: "A_independent_dxa" | "B_correlated_dxa";
  sharedHeightError: true;
  correlatedPairs: string[][];
  rho: number | null;
} {
  if (model.kind === "A") {
    return { model: "A_independent_dxa", sharedHeightError: true, correlatedPairs: [], rho: null };
  }
  return {
    model: "B_correlated_dxa",
    sharedHeightError: true,
    correlatedPairs: [
      ["FM", "FFM"],
      ["FFM", "ALM"],
    ],
    rho: model.rho,
  };
}

/** Expected correlations documented in artifacts (corr(FM,ALM)=rho²). */
export function expectedCorrelations(model: NoiseModel): {
  corrFmFfm: number;
  corrFfmAlm: number;
  corrFmAlm: number;
} {
  if (model.kind === "A") return { corrFmFfm: 0, corrFfmAlm: 0, corrFmAlm: 0 };
  return { corrFmFfm: model.rho, corrFfmAlm: model.rho, corrFmAlm: model.rho * model.rho };
}
