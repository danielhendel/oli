/**
 * §23.17.1 contribution metrics, §23.17.2 reversal indicator,
 * §23.17.3 construct uncertainty share. Validation-only descriptive math.
 */

import { EPS_NUM, HEALTH_WEIGHTS, PERF_WEIGHTS } from "./constants";

export type ScoreFamily = "health" | "performance";

export const CONSTRUCT_ORDER: Record<ScoreFamily, readonly string[]> = {
  health: ["H1", "H2", "H3"],
  performance: ["P1", "P3"],
};

export const WEIGHTS: Record<ScoreFamily, Record<string, number>> = {
  health: { ...HEALTH_WEIGHTS },
  performance: { ...PERF_WEIGHTS },
};

export type ContributionRow = {
  construct: string;
  score: number;
  weight: number;
  absoluteContribution: number;
  marginalContributionPerConstructPoint: number;
  weightedDeficit: number;
};

export type ContributionSummary = {
  rows: ContributionRow[];
  /** Σ absoluteContribution = unclipped aggregate. */
  unclippedAggregate: number;
  dominantAdverseConstruct: string;
};

export function absoluteContribution(weight: number, score: number): number {
  return weight * score;
}
export function marginalContributionPerConstructPoint(weight: number): number {
  return weight;
}
export function weightedDeficit(weight: number, score: number): number {
  return weight * (100 - score);
}
export function changeContribution(weight: number, scoreA: number, scoreB: number): number {
  return weight * (scoreB - scoreA);
}

/**
 * dominantAdverseConstruct = MAX weightedDeficit; ties → Health H1→H2→H3, Perf P1→P3
 * (i.e. earliest in declared order wins on exact tie).
 */
export function dominantAdverseConstruct(
  family: ScoreFamily,
  scores: Record<string, number>,
): string {
  const order = CONSTRUCT_ORDER[family];
  const w = WEIGHTS[family];
  let best = order[0] as string;
  let bestDef = weightedDeficit(w[best] as number, scores[best] as number);
  for (let i = 1; i < order.length; i++) {
    const c = order[i] as string;
    const d = weightedDeficit(w[c] as number, scores[c] as number);
    if (d > bestDef) {
      best = c;
      bestDef = d;
    }
  }
  return best;
}

export function contributionSummary(
  family: ScoreFamily,
  scores: Record<string, number>,
): ContributionSummary {
  const order = CONSTRUCT_ORDER[family];
  const w = WEIGHTS[family];
  const rows: ContributionRow[] = order.map((c) => ({
    construct: c,
    score: scores[c] as number,
    weight: w[c] as number,
    absoluteContribution: absoluteContribution(w[c] as number, scores[c] as number),
    marginalContributionPerConstructPoint: marginalContributionPerConstructPoint(w[c] as number),
    weightedDeficit: weightedDeficit(w[c] as number, scores[c] as number),
  }));
  return {
    rows,
    unclippedAggregate: rows.reduce((a, r) => a + r.absoluteContribution, 0),
    dominantAdverseConstruct: dominantAdverseConstruct(family, scores),
  };
}

export type ChangeContributionRow = { construct: string; changeContribution: number };

export function changeContributions(
  family: ScoreFamily,
  scoresA: Record<string, number>,
  scoresB: Record<string, number>,
): { rows: ChangeContributionRow[]; aggregateChange: number } {
  const w = WEIGHTS[family];
  const rows = CONSTRUCT_ORDER[family].map((c) => ({
    construct: c,
    changeContribution: changeContribution(w[c] as number, scoresA[c] as number, scoresB[c] as number),
  }));
  return { rows, aggregateChange: rows.reduce((a, r) => a + r.changeContribution, 0) };
}

/** Adverse-hide: any construct < 40 while aggregate ≥ 70 (BCV-017/018). */
export function adverseHide(constructScores: number[], aggregate: number): boolean {
  return constructScores.some((s) => s < 40) && aggregate >= 70;
}

/* ---------------- §23.17.2 ---------------- */

/** reversal iff delta_A * delta_B < 0; any exact zero delta → 0. */
export function reversalIndicator(deltaA: number, deltaB: number): 0 | 1 {
  if (deltaA === 0 || deltaB === 0) return 0;
  return deltaA * deltaB < 0 ? 1 : 0;
}

/* ---------------- §23.17.3 ---------------- */

export type UncertaintyAllocation = {
  constructs: string[];
  weights: number[];
  covarianceMatrix: number[][];
  varianceOfAggregate: number;
  varianceContribution: number[];
  /** Signed, unclipped; null when Var(A) ≤ EPS_NUM. */
  constructUncertaintyShare: (number | null)[];
  flags: string[];
};

/**
 * varianceContribution_i = w_i² Var(C_i) + Σ_{j≠i} w_i w_j Cov(C_i, C_j)
 * Σ_i varianceContribution_i = Var(A);  share_i = vc_i / Var(A) if Var(A) > EPS_NUM else null.
 * Shares may be negative; never clipped. `covarianceMatrix` uses sample moments (N−1).
 */
export function uncertaintyAllocation(
  constructs: string[],
  weights: number[],
  covarianceMatrix: number[][],
): UncertaintyAllocation {
  const n = constructs.length;
  const vc: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = (weights[i] as number) ** 2 * ((covarianceMatrix[i] as number[])[i] as number);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      v += (weights[i] as number) * (weights[j] as number) * ((covarianceMatrix[i] as number[])[j] as number);
    }
    vc.push(v);
  }
  const varA = vc.reduce((a, b) => a + b, 0);
  const flags: string[] = [];
  const nearZero = !(varA > EPS_NUM);
  if (nearZero) flags.push("aggregate_variance_near_zero");
  return {
    constructs,
    weights,
    covarianceMatrix,
    varianceOfAggregate: varA,
    varianceContribution: vc,
    constructUncertaintyShare: vc.map((v) => (nearZero ? null : v / varA)),
    flags,
  };
}
