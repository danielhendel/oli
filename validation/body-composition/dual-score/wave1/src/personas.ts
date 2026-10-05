/**
 * §23.10 canonical numeric persona table (BCV-017) — W1-PERSONAS.
 * Synthetic only. Not clinical archetypes. No qualitative labels.
 */

import type { Sex } from "./constants";

export type Relation = "higher" | "lower" | "equal" | "not_applicable";
export const RELATIONS: readonly Relation[] = ["higher", "lower", "equal", "not_applicable"] as const;

export type ExpectedRelations = {
  H1: Relation;
  H2: Relation;
  H3: Relation;
  HealthAggregate: Relation;
  P1: Relation;
  P3: Relation;
  PerformanceAggregate: Relation;
};

export type Persona = {
  id: string;
  /** P-01 → 0 … P-12 → 11. */
  index: number;
  sex: Sex;
  age: number;
  heightCm: number;
  waistCm: number;
  whtr: number;
  fmi: number;
  almi: number;
  ffmi: number;
  h3Primary: "ALMI";
  expected: ExpectedRelations;
  notes: string;
};

type Row = [
  id: string,
  sex: Sex,
  age: number,
  height: number,
  waist: number,
  whtr: number,
  fmi: number,
  almi: number,
  ffmi: number,
  h1: Relation,
  h2: Relation,
  h3: Relation,
  hAgg: Relation,
  p1: Relation,
  p3: Relation,
  pAgg: Relation,
  notes: string,
];

const ROWS: Row[] = [
  ["P-01", "male", 30, 178, 78, 0.438, 4.5, 8.2, 19.0, "higher", "equal", "equal", "higher", "equal", "equal", "equal", "Favorable all"],
  ["P-02", "male", 40, 175, 105, 0.6, 5.0, 8.0, 18.8, "lower", "equal", "equal", "lower", "lower", "equal", "lower", "High central + favorable lean"],
  ["P-03", "male", 35, 180, 80, 0.444, 4.0, 6.2, 16.2, "higher", "equal", "lower", "lower", "lower", "equal", "lower", "Favorable adiposity + low lean"],
  ["P-04", "male", 28, 182, 92, 0.505, 10.0, 8.5, 20.8, "lower", "lower", "equal", "lower", "higher", "lower", "lower", "High FMI + high FFMI"],
  ["P-05", "male", 55, 170, 76, 0.447, 3.0, 5.8, 15.8, "higher", "lower", "lower", "lower", "lower", "equal", "lower", "Low FMI + low ALMI"],
  ["P-06", "male", 45, 176, 102, 0.58, 4.8, 7.8, 18.5, "lower", "equal", "lower", "lower", "lower", "equal", "lower", "Discordant high WHtR / favorable FMI"],
  ["P-07", "male", 42, 176, 82, 0.466, 12.0, 7.6, 18.2, "higher", "lower", "lower", "lower", "lower", "lower", "lower", "Discordant favorable WHtR / high FMI"],
  ["P-08", "male", 60, 172, 108, 0.628, 11.5, 6.1, 16.0, "lower", "lower", "lower", "lower", "lower", "lower", "lower", "Sarcopenic-obesity-like pattern"],
  ["P-09", "male", 32, 185, 100, 0.541, 7.5, 9.0, 21.0, "lower", "lower", "equal", "lower", "higher", "lower", "lower", "High muscularity + high central adiposity"],
  ["P-10", "male", 38, 178, 98, 0.551, 5.2, 7.5, 18.0, "lower", "equal", "lower", "lower", "lower", "equal", "lower", "Low BMI-like composition + high central adiposity"],
  ["P-11", "female", 30, 165, 70, 0.424, 6.5, 6.5, 16.2, "higher", "equal", "equal", "higher", "lower", "equal", "lower", "Female favorable pattern"],
  ["P-12", "female", 48, 162, 95, 0.586, 14.0, 5.2, 14.8, "lower", "lower", "lower", "lower", "lower", "lower", "lower", "Female adverse mixed pattern"],
];

export const PERSONAS: readonly Persona[] = ROWS.map((r, index) => ({
  id: r[0],
  index,
  sex: r[1],
  age: r[2],
  heightCm: r[3],
  waistCm: r[4],
  whtr: r[5],
  fmi: r[6],
  almi: r[7],
  ffmi: r[8],
  h3Primary: "ALMI" as const,
  expected: {
    H1: r[9],
    H2: r[10],
    H3: r[11],
    HealthAggregate: r[12],
    P1: r[13],
    P3: r[14],
    PerformanceAggregate: r[15],
  },
  notes: r[16],
}));

export function personaById(id: string): Persona {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`persona_not_found:${id}`);
  return p;
}

/**
 * Persona raw masses from indices (§23.7 noise propagation base):
 *   FM = fmi*(h/100)², FFM = ffmi*(h/100)², ALM = almi*(h/100)².
 */
export function personaMasses(p: Persona): { fmKg: number; ffmKg: number; almKg: number } {
  const hm = p.heightCm / 100;
  const h2 = hm * hm;
  return { fmKg: p.fmi * h2, ffmKg: p.ffmi * h2, almKg: p.almi * h2 };
}
