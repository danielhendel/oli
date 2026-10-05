/**
 * Statistics helpers (plan §23.3 / §23.3.1).
 *
 * - Hyndman–Fan Type 7 quantiles only.
 * - Batch-means: exactly 20 contiguous equal batches, sample SD divisor 19, SE = sd/sqrt(20).
 * - Convergence: two consecutive checkpoints satisfying ALL tolerance + SE criteria.
 */

import { MC_PROTOCOL, THRESHOLDS } from "./constants";

/**
 * Hyndman–Fan Type 7 on an ascending-sorted array (first `n` entries).
 *
 *   h = (n-1)p; j = floor(h); g = h - j
 *   j >= n-1 → x[n-1]; else (1-g) x[j] + g x[j+1]
 */
export function quantileType7(sorted: ArrayLike<number>, p: number, n = sorted.length): number {
  if (n <= 0) return Number.NaN;
  if (!(p >= 0 && p <= 1)) throw new Error(`quantile_p_out_of_range:${p}`);
  const h = (n - 1) * p;
  const j = Math.floor(h);
  const g = h - j;
  if (j >= n - 1) return sorted[n - 1] as number;
  return (1 - g) * (sorted[j] as number) + g * (sorted[j + 1] as number);
}

export function sortedCopy(values: ArrayLike<number>): Float64Array {
  const out = Float64Array.from(values as ArrayLike<number>);
  out.sort();
  return out;
}

export function mean(values: ArrayLike<number>, n = values.length): number {
  if (n <= 0) return Number.NaN;
  let s = 0;
  for (let i = 0; i < n; i++) s += values[i] as number;
  return s / n;
}

/** Sample SD (divisor n-1). n<2 → NaN. */
export function sampleSd(values: ArrayLike<number>, n = values.length): number {
  if (n < 2) return Number.NaN;
  const m = mean(values, n);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = (values[i] as number) - m;
    ss += d * d;
  }
  return Math.sqrt(ss / (n - 1));
}

/** Batch-estimates sample SD: y_bar = Σy/B; var = Σ(y−y_bar)²/(B−1). */
export function batchSampleSd(batchEstimates: readonly number[]): number {
  const b = batchEstimates.length;
  if (b < 2) return Number.NaN;
  const yBar = batchEstimates.reduce((a, c) => a + c, 0) / b;
  let ss = 0;
  for (const y of batchEstimates) ss += (y - yBar) * (y - yBar);
  return Math.sqrt(ss / (b - 1));
}

/** SE = sampleSD / sqrt(B). */
export function batchMeansSe(batchEstimates: readonly number[]): number {
  return batchSampleSd(batchEstimates) / Math.sqrt(batchEstimates.length);
}

/** Largest prefix length divisible by `batches`. */
export function largestPrefixDivisibleBy(n: number, batches = MC_PROTOCOL.batchCount): number {
  return n - (n % batches);
}

/* ------------------------------------------------------------------ */
/* Online moments (Welford) for construct-score covariance             */
/* ------------------------------------------------------------------ */

export class OnlineMoments {
  readonly dim: number;
  n = 0;
  readonly mean: Float64Array;
  /** Co-moment matrix (row-major dim×dim): Σ (x_i − mean_i)(x_j − mean_j). */
  readonly co: Float64Array;
  private readonly delta: Float64Array;

  constructor(dim: number) {
    this.dim = dim;
    this.mean = new Float64Array(dim);
    this.co = new Float64Array(dim * dim);
    this.delta = new Float64Array(dim);
  }

  push(x: ArrayLike<number>): void {
    const d = this.dim;
    this.n += 1;
    const n = this.n;
    for (let i = 0; i < d; i++) this.delta[i] = (x[i] as number) - (this.mean[i] as number);
    for (let i = 0; i < d; i++) this.mean[i] = (this.mean[i] as number) + (this.delta[i] as number) / n;
    for (let i = 0; i < d; i++) {
      const dxi = (x[i] as number) - (this.mean[i] as number);
      for (let j = 0; j < d; j++) {
        const idx = i * d + j;
        this.co[idx] = (this.co[idx] as number) + (this.delta[j] as number) * dxi;
      }
    }
  }

  /** Sample covariance matrix (divisor N−1). */
  covariance(): number[][] {
    const d = this.dim;
    const out: number[][] = [];
    for (let i = 0; i < d; i++) {
      const row: number[] = [];
      for (let j = 0; j < d; j++) {
        row.push(this.n > 1 ? (this.co[i * d + j] as number) / (this.n - 1) : Number.NaN);
      }
      out.push(row);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Monte Carlo checkpoint estimation + convergence                     */
/* ------------------------------------------------------------------ */

export type CheckpointEstimate = {
  /** Draw count at the checkpoint (not the divisible prefix). */
  draws: number;
  /** Prefix used for batch-means (largest divisible by 20). */
  prefix: number;
  medianAbs: number;
  p95Abs: number;
  /** Threshold-crossing probabilities at THRESHOLDS (same order). */
  rates: number[];
  seMedianAbs: number;
  seP95Abs: number;
  seRates: number[];
};

export type CheckpointInput = {
  /** |S' − S0| per draw. */
  absDelta: Float64Array;
  /** Noisy aggregate score per draw. */
  noisy: Float64Array;
  /** Deterministic aggregate S0. */
  s0: number;
  /** Number of draws available. */
  n: number;
  /** Scratch buffers (length ≥ n). */
  scratchA: Float64Array;
  scratchB: Float64Array;
};

/**
 * Crossing indicator at threshold T: baseline and noisy score lie on opposite
 * sides of T, with "at or above T" counted as above.
 */
export function crossesThreshold(s0: number, noisy: number, threshold: number): boolean {
  return s0 >= threshold !== noisy >= threshold;
}

export function computeCheckpointEstimate(input: CheckpointInput): CheckpointEstimate {
  const { absDelta, noisy, s0, n, scratchA, scratchB } = input;
  const batches = MC_PROTOCOL.batchCount;
  const prefix = largestPrefixDivisibleBy(n, batches);
  const m = prefix / batches;

  // whole-prefix estimates
  scratchA.set(absDelta.subarray(0, prefix));
  const sortedAll = scratchA.subarray(0, prefix);
  sortedAll.sort();
  const medianAbs = quantileType7(sortedAll, 0.5, prefix);
  const p95Abs = quantileType7(sortedAll, 0.95, prefix);
  const rates: number[] = [];
  for (const t of THRESHOLDS) {
    let c = 0;
    for (let i = 0; i < prefix; i++) if (crossesThreshold(s0, noisy[i] as number, t)) c++;
    rates.push(c / prefix);
  }

  // per-batch estimates
  const bMed: number[] = [];
  const bP95: number[] = [];
  const bRates: number[][] = THRESHOLDS.map(() => []);
  for (let b = 0; b < batches; b++) {
    const lo = b * m;
    scratchB.set(absDelta.subarray(lo, lo + m));
    const seg = scratchB.subarray(0, m);
    seg.sort();
    bMed.push(quantileType7(seg, 0.5, m));
    bP95.push(quantileType7(seg, 0.95, m));
    for (let ti = 0; ti < THRESHOLDS.length; ti++) {
      const t = THRESHOLDS[ti] as number;
      let c = 0;
      for (let i = lo; i < lo + m; i++) if (crossesThreshold(s0, noisy[i] as number, t)) c++;
      (bRates[ti] as number[]).push(c / m);
    }
  }

  return {
    draws: n,
    prefix,
    medianAbs,
    p95Abs,
    rates,
    seMedianAbs: batchMeansSe(bMed),
    seP95Abs: batchMeansSe(bP95),
    seRates: bRates.map((r) => batchMeansSe(r)),
  };
}

export type ConvergenceParams = {
  medianDeltaTolerance: number;
  p95DeltaTolerance: number;
  medianSeTolerance: number;
  p95SeTolerance: number;
  rateDeltaTolerance: number;
  rateSeTolerance: number;
  requiredConsecutivePasses: number;
};

export const FROZEN_CONVERGENCE_PARAMS: ConvergenceParams = {
  medianDeltaTolerance: MC_PROTOCOL.medianDeltaTolerance,
  p95DeltaTolerance: MC_PROTOCOL.p95DeltaTolerance,
  medianSeTolerance: MC_PROTOCOL.medianSeTolerance,
  p95SeTolerance: MC_PROTOCOL.p95SeTolerance,
  rateDeltaTolerance: MC_PROTOCOL.rateDeltaTolerance,
  rateSeTolerance: MC_PROTOCOL.rateSeTolerance,
  requiredConsecutivePasses: MC_PROTOCOL.requiredConsecutivePasses,
};

/**
 * Does `curr` satisfy ALL tol + SE criteria vs the IMMEDIATELY preceding
 * checkpoint `prev` (no moving average)?
 */
export function checkpointPasses(
  prev: CheckpointEstimate,
  curr: CheckpointEstimate,
  params: ConvergenceParams = FROZEN_CONVERGENCE_PARAMS,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!(Math.abs(curr.medianAbs - prev.medianAbs) <= params.medianDeltaTolerance)) {
    failures.push("median_delta");
  }
  if (!(Math.abs(curr.p95Abs - prev.p95Abs) <= params.p95DeltaTolerance)) {
    failures.push("p95_delta");
  }
  if (!(curr.seMedianAbs <= params.medianSeTolerance)) failures.push("median_se");
  if (!(curr.seP95Abs <= params.p95SeTolerance)) failures.push("p95_se");
  for (let i = 0; i < curr.rates.length; i++) {
    const t = THRESHOLDS[i] as number;
    if (!(Math.abs((curr.rates[i] as number) - (prev.rates[i] as number)) <= params.rateDeltaTolerance)) {
      failures.push(`rate_delta_${t}`);
    }
    if (!((curr.seRates[i] as number) <= params.rateSeTolerance)) failures.push(`rate_se_${t}`);
  }
  return { pass: failures.length === 0, failures };
}

/**
 * Stop rule tracker: converged once `requiredConsecutivePasses` consecutive
 * checkpoints pass. Hard-max handling is the caller's responsibility.
 */
export class ConvergenceTracker {
  private prev: CheckpointEstimate | null = null;
  consecutivePasses = 0;
  converged = false;
  lastFailures: string[] = [];
  checkpointsEvaluated = 0;

  constructor(private readonly params: ConvergenceParams = FROZEN_CONVERGENCE_PARAMS) {}

  /** First call establishes the reference estimate (no delta available). */
  push(cp: CheckpointEstimate): { pass: boolean; converged: boolean } {
    if (this.prev == null) {
      this.prev = cp;
      return { pass: false, converged: false };
    }
    const r = checkpointPasses(this.prev, cp, this.params);
    this.prev = cp;
    this.checkpointsEvaluated += 1;
    this.lastFailures = r.failures;
    if (r.pass) this.consecutivePasses += 1;
    else this.consecutivePasses = 0;
    if (this.consecutivePasses >= this.params.requiredConsecutivePasses) this.converged = true;
    return { pass: r.pass, converged: this.converged };
  }

  get last(): CheckpointEstimate | null {
    return this.prev;
  }
}
