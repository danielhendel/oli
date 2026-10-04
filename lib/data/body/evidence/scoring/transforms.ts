/**
 * Exact construct transforms — mathematical truth freeze §§10–17.
 * No intermediate rounding. Non-finite → null (never 0).
 */

import { clip01, lerp } from "./piecewiseLinear";

export function H1_whtr(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (x <= 0.4) return 100;
  if (x <= 0.5) return lerp(x, 0.4, 0.5, 100, 80);
  if (x <= 0.6) return lerp(x, 0.5, 0.6, 80, 50);
  if (x <= 0.8) return lerp(x, 0.6, 0.8, 50, 0);
  return 0;
}

export function H2_fmi_male(fmi: number): number | null {
  if (!Number.isFinite(fmi)) return null;
  if (fmi <= 2.0) return 80;
  if (fmi <= 3.5) return lerp(fmi, 2.0, 3.5, 80, 92);
  if (fmi <= 5.5) return 92;
  if (fmi <= 9.0) return lerp(fmi, 5.5, 9.0, 92, 50);
  if (fmi <= 15.0) return lerp(fmi, 9.0, 15.0, 50, 10);
  return 10;
}

export function H2_fmi_female(fmi: number): number | null {
  if (!Number.isFinite(fmi)) return null;
  if (fmi <= 3.5) return 80;
  if (fmi <= 5.5) return lerp(fmi, 3.5, 5.5, 80, 92);
  if (fmi <= 8.5) return 92;
  if (fmi <= 13.0) return lerp(fmi, 8.5, 13.0, 92, 50);
  if (fmi <= 21.0) return lerp(fmi, 13.0, 21.0, 50, 10);
  return 10;
}

export function H3_almi_male(almi: number): number | null {
  if (!Number.isFinite(almi)) return null;
  if (almi <= 6.0) return 15;
  if (almi <= 7.0) return lerp(almi, 6.0, 7.0, 15, 55);
  if (almi <= 8.0) return lerp(almi, 7.0, 8.0, 55, 92);
  return 92;
}

export function H3_almi_female(almi: number): number | null {
  if (!Number.isFinite(almi)) return null;
  if (almi <= 4.5) return 15;
  if (almi <= 5.5) return lerp(almi, 4.5, 5.5, 15, 55);
  if (almi <= 6.3) return lerp(almi, 5.5, 6.3, 55, 92);
  return 92;
}

export function H3_ffmi_male(ffmi: number): number | null {
  if (!Number.isFinite(ffmi)) return null;
  if (ffmi <= 16.0) return 15;
  if (ffmi <= 16.7) return lerp(ffmi, 16.0, 16.7, 15, 55);
  if (ffmi <= 18.5) return lerp(ffmi, 16.7, 18.5, 55, 92);
  return 92;
}

export function H3_ffmi_female(ffmi: number): number | null {
  if (!Number.isFinite(ffmi)) return null;
  if (ffmi <= 14.0) return 15;
  if (ffmi <= 14.6) return lerp(ffmi, 14.0, 14.6, 15, 55);
  if (ffmi <= 16.0) return lerp(ffmi, 14.6, 16.0, 55, 92);
  return 92;
}

export function P1_ffmi_male(ffmi: number): number | null {
  if (!Number.isFinite(ffmi)) return null;
  if (ffmi <= 16.0) return 10;
  if (ffmi <= 16.7) return lerp(ffmi, 16.0, 16.7, 10, 40);
  if (ffmi <= 19.0) return lerp(ffmi, 16.7, 19.0, 40, 90);
  if (ffmi <= 20.5) return lerp(ffmi, 19.0, 20.5, 90, 95);
  return 95;
}

export function P1_ffmi_female(ffmi: number): number | null {
  if (!Number.isFinite(ffmi)) return null;
  if (ffmi <= 14.0) return 10;
  if (ffmi <= 14.6) return lerp(ffmi, 14.0, 14.6, 10, 40);
  if (ffmi <= 16.5) return lerp(ffmi, 14.6, 16.5, 40, 90);
  if (ffmi <= 17.5) return lerp(ffmi, 16.5, 17.5, 90, 95);
  return 95;
}

export function P3_fmi_male(fmi: number): number | null {
  if (!Number.isFinite(fmi)) return null;
  if (fmi <= 2.0) return 80;
  if (fmi <= 3.0) return lerp(fmi, 2.0, 3.0, 80, 92);
  if (fmi <= 7.0) return 92;
  if (fmi <= 10.0) return lerp(fmi, 7.0, 10.0, 92, 45);
  if (fmi <= 16.0) return lerp(fmi, 10.0, 16.0, 45, 8);
  return 8;
}

export function P3_fmi_female(fmi: number): number | null {
  if (!Number.isFinite(fmi)) return null;
  if (fmi <= 3.5) return 80;
  if (fmi <= 5.0) return lerp(fmi, 3.5, 5.0, 80, 92);
  if (fmi <= 10.0) return 92;
  if (fmi <= 14.0) return lerp(fmi, 10.0, 14.0, 92, 45);
  if (fmi <= 22.0) return lerp(fmi, 14.0, 22.0, 45, 8);
  return 8;
}

export function Health_aggregate(
  h1: number | null,
  h2: number | null,
  h3: number | null,
): number | null {
  if (h1 == null || h2 == null || h3 == null) return null;
  if (![h1, h2, h3].every(Number.isFinite)) return null;
  return clip01(0.45 * h1 + 0.35 * h2 + 0.2 * h3);
}

export function PerformanceSupporting_aggregate(
  p1: number | null,
  p3: number | null,
): number | null {
  if (p1 == null || p3 == null) return null;
  if (![p1, p3].every(Number.isFinite)) return null;
  return clip01(0.5 * p1 + 0.5 * p3);
}
