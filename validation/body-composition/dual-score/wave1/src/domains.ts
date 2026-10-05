/**
 * Canonical synthetic domains, grids, knots, plateaus (plan §23.5, §23.13).
 * Synthetic computational domains — NOT clinical ranges.
 */

import { DOMAINS, EPS_NUM, EPS_SURF } from "./constants";
import type { ProtocolDomainVar, Sex } from "./constants";

/** Round to 12 decimals so grid arithmetic yields exact-looking decimals (0.4, 0.5, ...). */
export function r12(x: number): number {
  return Number(x.toFixed(12));
}

export function domainOf(variable: ProtocolDomainVar, sex: Sex): readonly [number, number] {
  return DOMAINS[variable][sex];
}

export function domainRangeOf(variable: ProtocolDomainVar, sex: Sex): number {
  if (variable === "whtr") return DOMAINS.whtr.range;
  return (DOMAINS[variable].range as Record<Sex, number>)[sex];
}

export const COARSE_STEP: Record<ProtocolDomainVar, number> = {
  whtr: 0.01,
  fmi: 0.25,
  almi: 0.1,
  ffmi: 0.1,
};

export const DENSE_HALF_WIDTH = 0.05;
export const DENSE_STEP: Record<ProtocolDomainVar, number> = {
  whtr: 0.005,
  fmi: 0.05,
  almi: 0.05,
  ffmi: 0.05,
};

/** Axis / construct keys used by BCV-001 surfaces and knot analyses. */
export type ConstructKey = "H1" | "H2" | "H3_ALMI" | "H3_FFMI" | "P1" | "P3";
export const CONSTRUCT_KEYS: readonly ConstructKey[] = [
  "H1",
  "H2",
  "H3_ALMI",
  "H3_FFMI",
  "P1",
  "P3",
] as const;

export function variableOfConstruct(key: ConstructKey): ProtocolDomainVar {
  switch (key) {
    case "H1":
      return "whtr";
    case "H2":
    case "P3":
      return "fmi";
    case "H3_ALMI":
      return "almi";
    case "H3_FFMI":
    case "P1":
      return "ffmi";
  }
}

/** §23.5.2 frozen knots. H1 is sex-independent. */
export const KNOTS: Record<ConstructKey, Record<Sex, readonly number[]>> = {
  H1: { male: [0.4, 0.5, 0.6, 0.8], female: [0.4, 0.5, 0.6, 0.8] },
  H2: { male: [2.0, 3.5, 5.5, 9.0, 15.0], female: [3.5, 5.5, 8.5, 13.0, 21.0] },
  H3_ALMI: { male: [6.0, 7.0, 8.0], female: [4.5, 5.5, 6.3] },
  H3_FFMI: { male: [16.0, 16.7, 18.5], female: [14.0, 14.6, 16.0] },
  P1: { male: [16.0, 16.7, 19.0, 20.5], female: [14.0, 14.6, 16.5, 17.5] },
  P3: { male: [2.0, 3.0, 7.0, 10.0, 16.0], female: [3.5, 5.0, 10.0, 14.0, 22.0] },
};

/** §23.13 BCV-013 exact plateaus (score-flat intervals; inclusive both ends). */
export type Plateau = {
  id: string;
  construct: ConstructKey;
  sex: Sex | "both";
  lower: number | null; // null → unbounded left tail
  upper: number | null;
  value: number;
};
export const PLATEAUS: readonly Plateau[] = [
  { id: "H2_male_92", construct: "H2", sex: "male", lower: 3.5, upper: 5.5, value: 92 },
  { id: "H2_female_92", construct: "H2", sex: "female", lower: 5.5, upper: 8.5, value: 92 },
  { id: "P3_male_92", construct: "P3", sex: "male", lower: 3.0, upper: 7.0, value: 92 },
  { id: "P3_female_92", construct: "P3", sex: "female", lower: 5.0, upper: 10.0, value: 92 },
  { id: "H1_left", construct: "H1", sex: "both", lower: null, upper: 0.4, value: 100 },
];

/** §23.13 BCV-012 explicit sensitivity centers. */
export const SENSITIVITY_CENTERS: Record<ConstructKey, Record<Sex, readonly number[]>> = {
  H1: { male: [0.45, 0.55, 0.7], female: [0.45, 0.55, 0.7] },
  H2: { male: [2.75, 4.5, 7.25, 12.0], female: [4.5, 7.0, 10.75, 17.0] },
  H3_ALMI: { male: [6.5, 7.5], female: [5.0, 5.9] },
  H3_FFMI: { male: [16.35, 17.6], female: [14.3, 15.3] },
  P1: { male: [16.35, 17.85, 19.75], female: [14.3, 15.55, 17.0] },
  P3: { male: [2.5, 5.0, 8.5, 13.0], female: [4.25, 7.5, 12.0, 18.0] },
};

export const OAT_STEPS: Record<ProtocolDomainVar, readonly number[]> = {
  whtr: [EPS_SURF, 0.01, 0.1],
  fmi: [EPS_SURF, 0.1, 0.5],
  almi: [EPS_SURF, 0.1, 0.5],
  ffmi: [EPS_SURF, 0.1, 0.5],
};

function uniqueSorted(values: number[]): number[] {
  const set = new Set<number>(values.map(r12));
  return [...set].sort((a, b) => a - b);
}

/** Coarse global grid for a variable over the sex's domain (inclusive endpoints). */
export function coarseGrid(variable: ProtocolDomainVar, sex: Sex): number[] {
  const [lo, hi] = domainOf(variable, sex);
  const step = COARSE_STEP[variable];
  const n = Math.round((hi - lo) / step);
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(r12(lo + i * step));
  return uniqueSorted(out);
}

function inDomain(x: number, variable: ProtocolDomainVar, sex: Sex): boolean {
  const [lo, hi] = domainOf(variable, sex);
  return x >= lo - 1e-12 && x <= hi + 1e-12;
}

/**
 * §23.5.3 canonicalAxisGrid:
 *  sorted unique union of coarse grid points, in-domain knots, and in-domain knot ± EPS_SURF.
 */
export function canonicalAxisGrid(construct: ConstructKey, sex: Sex): number[] {
  const variable = variableOfConstruct(construct);
  const pts: number[] = [...coarseGrid(variable, sex)];
  for (const k of KNOTS[construct][sex]) {
    if (inDomain(k, variable, sex)) pts.push(k);
    if (inDomain(k - EPS_SURF, variable, sex)) pts.push(k - EPS_SURF);
    if (inDomain(k + EPS_SURF, variable, sex)) pts.push(k + EPS_SURF);
  }
  return uniqueSorted(pts);
}

/**
 * 1D sweep grid (§23.5.1): coarse ∪ dense-local(±0.05 @ dense step) around every knot ∪ knots
 * ∪ knot±EPS_NUM ∪ knot±EPS_SURF, restricted to the domain.
 */
export function oneDimensionalSweepGrid(construct: ConstructKey, sex: Sex): number[] {
  const variable = variableOfConstruct(construct);
  const pts: number[] = [...coarseGrid(variable, sex)];
  const dstep = DENSE_STEP[variable];
  const steps = Math.round(DENSE_HALF_WIDTH / dstep);
  for (const k of KNOTS[construct][sex]) {
    for (let i = -steps; i <= steps; i++) {
      const x = r12(k + i * dstep);
      if (inDomain(x, variable, sex)) pts.push(x);
    }
    for (const e of [EPS_NUM, EPS_SURF]) {
      // NB: knot ± EPS_NUM must NOT be rounded to 12 decimals-away from knot; r12 keeps 1e-9.
      for (const x of [k - e, k + e]) if (inDomain(x, variable, sex)) pts.push(x);
    }
  }
  return uniqueSorted(pts);
}

export type SurfaceId =
  | "HEALTH_H1_H2"
  | "HEALTH_H1_H3_ALMI"
  | "HEALTH_H1_H3_FFMI"
  | "HEALTH_H2_H3_ALMI"
  | "HEALTH_H2_H3_FFMI"
  | "PERFORMANCE_P1_P3";

export const SURFACES: readonly {
  id: SurfaceId;
  x: ConstructKey;
  y: ConstructKey;
  h3Primary: "ALMI" | "FFMI" | null;
  nonVaried: string;
}[] = [
  { id: "HEALTH_H1_H2", x: "H1", y: "H2", h3Primary: null, nonVaried: "H3 at sex reference (ALMI primary)" },
  { id: "HEALTH_H1_H3_ALMI", x: "H1", y: "H3_ALMI", h3Primary: "ALMI", nonVaried: "H2 at sex reference" },
  { id: "HEALTH_H1_H3_FFMI", x: "H1", y: "H3_FFMI", h3Primary: "FFMI", nonVaried: "H2 at sex reference" },
  { id: "HEALTH_H2_H3_ALMI", x: "H2", y: "H3_ALMI", h3Primary: "ALMI", nonVaried: "H1 at sex reference" },
  { id: "HEALTH_H2_H3_FFMI", x: "H2", y: "H3_FFMI", h3Primary: "FFMI", nonVaried: "H1 at sex reference" },
  { id: "PERFORMANCE_P1_P3", x: "P1", y: "P3", h3Primary: null, nonVaried: "n/a" },
];
