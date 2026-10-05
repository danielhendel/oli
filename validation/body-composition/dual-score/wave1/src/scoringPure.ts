/**
 * Pure-transform scoring for MC / surfaces / sensitivity.
 * Uses the approved transforms from lib/data/body/evidence/scoring directly.
 * Does NOT modify the engine and does NOT invent any new formula.
 */

import {
  H1_whtr,
  H2_fmi_female,
  H2_fmi_male,
  H3_almi_female,
  H3_almi_male,
  H3_ffmi_female,
  H3_ffmi_male,
  P1_ffmi_female,
  P1_ffmi_male,
  P3_fmi_female,
  P3_fmi_male,
  Health_aggregate,
  PerformanceSupporting_aggregate,
} from "@oli/lib/data/body/evidence/scoring/transforms";

import { HEALTH_WEIGHTS, PERF_WEIGHTS } from "./constants";
import type { Sex } from "./constants";
import type { ConstructKey } from "./domains";

export type ConstructFn = (x: number) => number | null;

export function constructFn(construct: ConstructKey, sex: Sex): ConstructFn {
  const male = sex === "male";
  switch (construct) {
    case "H1":
      return H1_whtr;
    case "H2":
      return male ? H2_fmi_male : H2_fmi_female;
    case "H3_ALMI":
      return male ? H3_almi_male : H3_almi_female;
    case "H3_FFMI":
      return male ? H3_ffmi_male : H3_ffmi_female;
    case "P1":
      return male ? P1_ffmi_male : P1_ffmi_female;
    case "P3":
      return male ? P3_fmi_male : P3_fmi_female;
  }
}

export type H3Kind = "ALMI" | "FFMI";

export type HealthInputs = {
  whtr: number;
  fmi: number;
  h3Kind: H3Kind;
  h3Value: number;
};

export type HealthScores = {
  H1: number | null;
  H2: number | null;
  H3: number | null;
  /** Aggregate via approved Health_aggregate (clipped). */
  aggregate: number | null;
  /** Σ w_i C_i, un-clipped (null if any construct null). */
  unclippedAggregate: number | null;
};

export type PerfInputs = { ffmi: number; fmi: number };

export type PerfScores = {
  P1: number | null;
  P3: number | null;
  aggregate: number | null;
  unclippedAggregate: number | null;
};

export function scoreHealthPure(sex: Sex, inp: HealthInputs): HealthScores {
  const h1 = H1_whtr(inp.whtr);
  const h2 = constructFn("H2", sex)(inp.fmi);
  const h3 = constructFn(inp.h3Kind === "ALMI" ? "H3_ALMI" : "H3_FFMI", sex)(inp.h3Value);
  const aggregate = Health_aggregate(h1, h2, h3);
  const unclipped =
    h1 == null || h2 == null || h3 == null
      ? null
      : HEALTH_WEIGHTS.H1 * h1 + HEALTH_WEIGHTS.H2 * h2 + HEALTH_WEIGHTS.H3 * h3;
  return { H1: h1, H2: h2, H3: h3, aggregate, unclippedAggregate: unclipped };
}

export function scorePerfPure(sex: Sex, inp: PerfInputs): PerfScores {
  const p1 = constructFn("P1", sex)(inp.ffmi);
  const p3 = constructFn("P3", sex)(inp.fmi);
  const aggregate = PerformanceSupporting_aggregate(p1, p3);
  const unclipped =
    p1 == null || p3 == null ? null : PERF_WEIGHTS.P1 * p1 + PERF_WEIGHTS.P3 * p3;
  return { P1: p1, P3: p3, aggregate, unclippedAggregate: unclipped };
}

export { Health_aggregate, PerformanceSupporting_aggregate };
