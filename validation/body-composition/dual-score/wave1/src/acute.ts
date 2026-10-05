/**
 * §23.13 BCV-034 acute-state scenarios and §23.17.8 false-improvement predicate.
 * Synthetic fallback perturbations — NOT empirical (ER-BC-16 may later replace).
 * Weight is metadata only; FM / FMI are never altered by this matrix.
 */

import { EPS_NUM } from "./constants";
import type { Persona } from "./personas";
import { personaMasses } from "./personas";

export type AcuteScenario = {
  id: string;
  dFfmKg: number;
  dAlmKg: number;
  dWaistCm: number;
  /** Menstrual scenarios apply to female baselines only. */
  femaleOnly: boolean;
};

export const ACUTE_SCENARIOS: readonly AcuteScenario[] = [
  { id: "BASE", dFfmKg: 0, dAlmKg: 0, dWaistCm: 0, femaleOnly: false },
  { id: "HYDRATION_DOWN", dFfmKg: -1.0, dAlmKg: -0.6, dWaistCm: -1.0, femaleOnly: false },
  { id: "HYDRATION_UP", dFfmKg: 1.0, dAlmKg: 0.6, dWaistCm: 1.0, femaleOnly: false },
  { id: "GLYCOGEN_DOWN", dFfmKg: -0.5, dAlmKg: -0.3, dWaistCm: 0, femaleOnly: false },
  { id: "GLYCOGEN_UP", dFfmKg: 0.5, dAlmKg: 0.3, dWaistCm: 0, femaleOnly: false },
  { id: "RECENT_EXERCISE", dFfmKg: 0.5, dAlmKg: 0.3, dWaistCm: 0, femaleOnly: false },
  { id: "ILLNESS_INFLAMMATION", dFfmKg: 1.0, dAlmKg: 0.6, dWaistCm: 1.0, femaleOnly: false },
  { id: "EDEMA", dFfmKg: 1.5, dAlmKg: 0.9, dWaistCm: 2.0, femaleOnly: false },
  { id: "MENSTRUAL_PHASE_LOW", dFfmKg: 0, dAlmKg: 0, dWaistCm: 0, femaleOnly: true },
  { id: "MENSTRUAL_PHASE_HIGH", dFfmKg: 0.5, dAlmKg: 0.3, dWaistCm: 1.0, femaleOnly: true },
  { id: "TOD_MORNING", dFfmKg: 0, dAlmKg: 0, dWaistCm: 0, femaleOnly: false },
  { id: "TOD_EVENING", dFfmKg: 0.5, dAlmKg: 0.3, dWaistCm: 1.0, femaleOnly: false },
];

export const ACUTE_BASELINE_PERSONAS = ["P-01", "P-08", "P-11", "P-12"] as const;

export const ACUTE_LABEL = "synthetic_fallback_not_empirical_artifact_vs_biology_unresolved" as const;

export function scenarioApplies(s: AcuteScenario, p: Persona): boolean {
  return !s.femaleOnly || p.sex === "female";
}

/**
 * Height held fixed. FFMI / ALMI recomputed from perturbed FFM / ALM; WHtR recomputed from
 * perturbed Waist (ΔWaist = 0 ⇒ unchanged). FM / FMI untouched.
 */
export function applyScenario(
  p: Persona,
  s: AcuteScenario,
): { whtr: number; fmi: number; ffmi: number; almi: number; waistCm: number } {
  const m = personaMasses(p);
  const hm2 = (p.heightCm / 100) ** 2;
  const waistCm = p.waistCm + s.dWaistCm;
  return {
    whtr: waistCm / p.heightCm,
    fmi: m.fmKg / hm2,
    ffmi: (m.ffmKg + s.dFfmKg) / hm2,
    almi: (m.almKg + s.dAlmKg) / hm2,
    waistCm,
  };
}

/** 1 if scenario − base > EPS_NUM, else 0; null when either aggregate unavailable. */
export function falseImprovementIndicator(
  baseAggregate: number | null,
  scenarioAggregate: number | null,
): 0 | 1 | null {
  if (baseAggregate == null || scenarioAggregate == null) return null;
  return scenarioAggregate - baseAggregate > EPS_NUM ? 1 : 0;
}

/** count(indicator==1) / count(indicator ∈ {0,1}); unavailable reported separately. */
export function falseImprovementRate(indicators: ReadonlyArray<0 | 1 | null>): {
  rate: number | null;
  numerator: number;
  denominator: number;
  unavailableCount: number;
} {
  let num = 0;
  let den = 0;
  let un = 0;
  for (const i of indicators) {
    if (i == null) un++;
    else {
      den++;
      if (i === 1) num++;
    }
  }
  return { rate: den === 0 ? null : num / den, numerator: num, denominator: den, unavailableCount: un };
}
