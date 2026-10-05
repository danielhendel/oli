/**
 * Monte Carlo engine for BCV-002 / BCV-029 / BCV-030 (plan §23.3, §23.7, §23.17).
 *
 * PERFORMANCE RULES
 *  - pure-transform scoring only (scoringPure transforms; no resolver / bundle in the hot loop)
 *  - one configuration at a time; typed arrays reused across calls
 *  - only SUMMARY statistics are returned (never raw draws)
 *
 * Health and Perf use separate streams (substream 0 / 1) and converge independently.
 * Reversal replicates (§23.17.2) use fresh per-replicate seeds scoreBase + 2k / + 2k + 1.
 */

import {
  H1_whtr,
  H2_fmi_female,
  H2_fmi_male,
  H3_almi_female,
  H3_almi_male,
  P1_ffmi_female,
  P1_ffmi_male,
  P3_fmi_female,
  P3_fmi_male,
  Health_aggregate,
  PerformanceSupporting_aggregate,
} from "@oli/lib/data/body/evidence/scoring/transforms";

import {
  HEALTH_WEIGHTS,
  MC_PROTOCOL,
  PERF_WEIGHTS,
  THRESHOLDS,
} from "./constants";
import type { ProtocolId, Sex } from "./constants";
import { reversalIndicator, uncertaintyAllocation } from "./contribution";
import type { UncertaintyAllocation } from "./contribution";
import { MarsagliaPolar } from "./marsaglia";
import {
  IDX_ALMI,
  IDX_FFMI,
  IDX_FMI,
  IDX_WHTR,
  drawNoise,
  expectedCorrelations,
  personaBase,
} from "./models";
import type { NoiseModel, PersonaBase } from "./models";
import { perturbIndices } from "./models";
import type { Persona } from "./personas";
import { Mulberry32 } from "./prng";
import { mainStreamSeed, reversalSeed } from "./streams";
import type { NoiseConfigSeedArgs, ScoreKind } from "./streams";
import {
  ConvergenceTracker,
  FROZEN_CONVERGENCE_PARAMS,
  OnlineMoments,
  computeCheckpointEstimate,
  mean as meanOf,
  quantileType7,
  sampleSd,
} from "./stats";
import type { CheckpointEstimate, ConvergenceParams } from "./stats";

export type McRunParams = {
  minimumDraws: number;
  maximumDraws: number;
  checkpointEvery: number;
  convergence: ConvergenceParams;
};

export const FROZEN_MC_RUN_PARAMS: McRunParams = {
  minimumDraws: MC_PROTOCOL.minimumDraws,
  maximumDraws: MC_PROTOCOL.maximumDraws,
  checkpointEvery: MC_PROTOCOL.checkpointEvery,
  convergence: FROZEN_CONVERGENCE_PARAMS,
};

/* ---------------- scorer (hot-loop) ---------------- */

export type PureScorer = {
  kind: ScoreKind;
  constructs: string[];
  weights: number[];
  /** Baseline (noise-free) construct scores. */
  baselineConstructs: number[];
  /** Baseline (noise-free) aggregate S0. */
  s0: number;
  /** Score perturbed indices; writes construct scores into `c`, returns aggregate. */
  evalInto(idx: Float64Array, c: Float64Array): number;
};

export function makeScorer(persona: Persona, kind: ScoreKind): PureScorer {
  const male = persona.sex === "male";
  const base = personaBase(persona);
  const idx0 = new Float64Array(4);
  idx0[IDX_WHTR] = base.waistCm / base.heightCm;
  const hm2 = (base.heightCm / 100) ** 2;
  idx0[IDX_FMI] = base.fmKg / hm2;
  idx0[IDX_FFMI] = base.ffmKg / hm2;
  idx0[IDX_ALMI] = base.almKg / hm2;

  let scorer: PureScorer;
  if (kind === "health") {
    const h2 = male ? H2_fmi_male : H2_fmi_female;
    const h3 = male ? H3_almi_male : H3_almi_female;
    scorer = {
      kind,
      constructs: ["H1", "H2", "H3"],
      weights: [HEALTH_WEIGHTS.H1, HEALTH_WEIGHTS.H2, HEALTH_WEIGHTS.H3],
      baselineConstructs: [],
      s0: 0,
      evalInto(idx, c) {
        const a = H1_whtr(idx[IDX_WHTR] as number);
        const b = h2(idx[IDX_FMI] as number);
        const d = h3(idx[IDX_ALMI] as number);
        const agg = Health_aggregate(a, b, d);
        if (a == null || b == null || d == null || agg == null) {
          throw new Error("non_finite_health_score_in_mc");
        }
        c[0] = a;
        c[1] = b;
        c[2] = d;
        return agg;
      },
    };
  } else {
    const p1 = male ? P1_ffmi_male : P1_ffmi_female;
    const p3 = male ? P3_fmi_male : P3_fmi_female;
    scorer = {
      kind,
      constructs: ["P1", "P3"],
      weights: [PERF_WEIGHTS.P1, PERF_WEIGHTS.P3],
      baselineConstructs: [],
      s0: 0,
      evalInto(idx, c) {
        const a = p1(idx[IDX_FFMI] as number);
        const b = p3(idx[IDX_FMI] as number);
        const agg = PerformanceSupporting_aggregate(a, b);
        if (a == null || b == null || agg == null) throw new Error("non_finite_perf_score_in_mc");
        c[0] = a;
        c[1] = b;
        return agg;
      },
    };
  }
  const c0 = new Float64Array(scorer.constructs.length);
  scorer.s0 = scorer.evalInto(idx0, c0);
  scorer.baselineConstructs = Array.from(c0);
  return scorer;
}

/* ---------------- reusable buffers ---------------- */

type Buffers = {
  size: number;
  noisy: Float64Array;
  absDelta: Float64Array;
  scratchA: Float64Array;
  scratchB: Float64Array;
};
let pool: Buffers | null = null;

function getBuffers(size: number): Buffers {
  if (pool && pool.size >= size) return pool;
  pool = {
    size,
    noisy: new Float64Array(size),
    absDelta: new Float64Array(size),
    scratchA: new Float64Array(size),
    scratchB: new Float64Array(size),
  };
  return pool;
}

/* ---------------- results ---------------- */

export type CheckpointLogEntry = { draws: number; pass: boolean; failures: string[] };

export type ScoreMcSummary = {
  score: ScoreKind;
  constructs: string[];
  weights: number[];
  seed: number;
  substreamIndex: number;
  s0: number;
  baselineConstructScores: number[];
  draws: number;
  converged: boolean;
  hardMaxReached: boolean;
  consecutivePasses: number;
  checkpointLog: CheckpointLogEntry[];
  finalCheckpoint: CheckpointEstimate;
  /** Noisy aggregate summary. */
  noisyAggregate: {
    mean: number;
    sd: number;
    quantiles: { p05: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number };
    centralIntervals: {
      c50: [number, number];
      c80: [number, number];
      c90: [number, number];
      c95: [number, number];
    };
  };
  /** |S' − S0| summary (aggregate). */
  absDelta: { mae: number; median: number; p90: number; p95: number };
  thresholdCrossing: Array<{ threshold: number; rate: number; se: number }>;
  /** Mean construct-score change × weight (descriptive §23.17.1 changeContribution, MC mean). */
  meanChangeContribution: Array<{ construct: string; value: number }>;
  constructMean: number[];
  constructCovariance: number[][];
  uncertainty: UncertaintyAllocation;
  reversal: ReversalSummary | null;
};

export type ReversalSummary = {
  nPairs: number;
  reversalCount: number;
  zeroDeltaPairs: number;
  directionalReversalProbability: number;
  /** SD of delta = S_B − S_A (repeated-measurement difference), sample divisor N−1. */
  sdRepeatedDelta: number;
  scoreBase: number;
};

/* ---------------- main stream convergence ---------------- */

export function runScoreStreamToConvergence(args: {
  persona: Persona;
  kind: ScoreKind;
  seedArgs: NoiseConfigSeedArgs;
  sigmaMultiplier: number;
  model: NoiseModel;
  params?: McRunParams;
  withReversal: boolean;
}): ScoreMcSummary {
  const params = args.params ?? FROZEN_MC_RUN_PARAMS;
  const scorer = makeScorer(args.persona, args.kind);
  const base = personaBase(args.persona);
  const seed = mainStreamSeed(args.seedArgs, args.kind);
  const rng = new Mulberry32(seed);
  const gauss = new MarsagliaPolar(rng);
  const bufs = getBuffers(params.maximumDraws);
  const { noisy, absDelta, scratchA, scratchB } = bufs;
  const z = new Float64Array(5);
  const idx = new Float64Array(4);
  const c = new Float64Array(scorer.constructs.length);
  const moments = new OnlineMoments(scorer.constructs.length);
  const tracker = new ConvergenceTracker(params.convergence);
  const log: CheckpointLogEntry[] = [];
  const s0 = scorer.s0;
  const mult = args.sigmaMultiplier;

  let n = 0;
  const target = (upTo: number) => {
    for (; n < upTo; n++) {
      drawNoise(gauss, args.model, z);
      perturbIndices(base, mult, z, idx);
      const agg = scorer.evalInto(idx, c);
      noisy[n] = agg;
      absDelta[n] = Math.abs(agg - s0);
      moments.push(c);
    }
  };
  const checkpoint = (): CheckpointEstimate =>
    computeCheckpointEstimate({ absDelta, noisy, s0, n, scratchA, scratchB });

  target(params.minimumDraws);
  let cp = checkpoint();
  tracker.push(cp);
  while (!tracker.converged && n < params.maximumDraws) {
    target(Math.min(params.maximumDraws, n + params.checkpointEvery));
    cp = checkpoint();
    const r = tracker.push(cp);
    log.push({ draws: n, pass: r.pass, failures: tracker.lastFailures.slice(0, 8) });
  }
  const converged = tracker.converged;

  // final summaries over all N draws
  const sortedNoisy = scratchA.subarray(0, n);
  sortedNoisy.set(noisy.subarray(0, n));
  sortedNoisy.sort();
  const q = (p: number) => quantileType7(sortedNoisy, p, n);
  const quantiles = {
    p05: q(0.05),
    p10: q(0.1),
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    p95: q(0.95),
  };
  const centralIntervals = {
    c50: [q(0.25), q(0.75)] as [number, number],
    c80: [q(0.1), q(0.9)] as [number, number],
    c90: [q(0.05), q(0.95)] as [number, number],
    c95: [q(0.025), q(0.975)] as [number, number],
  };
  const noisyMean = meanOf(noisy, n);
  const noisySd = sampleSd(noisy, n);

  const sortedAbs = scratchB.subarray(0, n);
  sortedAbs.set(absDelta.subarray(0, n));
  sortedAbs.sort();
  const absSummary = {
    mae: meanOf(absDelta, n),
    median: quantileType7(sortedAbs, 0.5, n),
    p90: quantileType7(sortedAbs, 0.9, n),
    p95: quantileType7(sortedAbs, 0.95, n),
  };

  const cov = moments.covariance();
  const uncertainty = uncertaintyAllocation(scorer.constructs, scorer.weights, cov);
  const meanChange = scorer.constructs.map((name, i) => ({
    construct: name,
    value: (scorer.weights[i] as number) * ((moments.mean[i] as number) - (scorer.baselineConstructs[i] as number)),
  }));

  const final = tracker.last as CheckpointEstimate;
  const summary: ScoreMcSummary = {
    score: args.kind,
    constructs: scorer.constructs,
    weights: scorer.weights,
    seed,
    substreamIndex: args.kind === "health" ? 0 : 1,
    s0,
    baselineConstructScores: scorer.baselineConstructs,
    draws: n,
    converged,
    hardMaxReached: !converged && n >= params.maximumDraws,
    consecutivePasses: tracker.consecutivePasses,
    checkpointLog: log,
    finalCheckpoint: final,
    noisyAggregate: { mean: noisyMean, sd: noisySd, quantiles, centralIntervals },
    absDelta: absSummary,
    thresholdCrossing: THRESHOLDS.map((t, i) => ({
      threshold: t,
      rate: final.rates[i] as number,
      se: final.seRates[i] as number,
    })),
    meanChangeContribution: meanChange,
    constructMean: Array.from(moments.mean),
    constructCovariance: cov,
    uncertainty,
    reversal: null,
  };

  if (args.withReversal) {
    summary.reversal = runReversalPairs({
      scorer,
      base,
      seedArgs: args.seedArgs,
      kind: args.kind,
      sigmaMultiplier: mult,
      model: args.model,
      nPairs: n,
    });
  }
  return summary;
}

/**
 * §23.17.2 two-replicate reversal test. N_pairs = converged MC observation count.
 * Replicate A: substream scoreBase + 2k;  replicate B: scoreBase + 2k + 1.
 * Each replicate draws the full §23.2.3 order once under its derived seed, then scores once.
 */
export function runReversalPairs(args: {
  scorer: PureScorer;
  base: PersonaBase;
  seedArgs: NoiseConfigSeedArgs;
  kind: ScoreKind;
  sigmaMultiplier: number;
  model: NoiseModel;
  nPairs: number;
}): ReversalSummary {
  const { scorer, base, nPairs } = args;
  const rng = new Mulberry32(0);
  const gauss = new MarsagliaPolar(rng);
  const z = new Float64Array(5);
  const idx = new Float64Array(4);
  const c = new Float64Array(scorer.constructs.length);
  const s0 = scorer.s0;
  let reversals = 0;
  let zeroPairs = 0;
  // Welford for delta = S_B − S_A
  let wn = 0;
  let wMean = 0;
  let wM2 = 0;
  for (let k = 0; k < nPairs; k++) {
    rng.reseed(reversalSeed(args.seedArgs, args.kind, k, "A"));
    gauss.reset();
    drawNoise(gauss, args.model, z);
    perturbIndices(base, args.sigmaMultiplier, z, idx);
    const sA = scorer.evalInto(idx, c);

    rng.reseed(reversalSeed(args.seedArgs, args.kind, k, "B"));
    gauss.reset();
    drawNoise(gauss, args.model, z);
    perturbIndices(base, args.sigmaMultiplier, z, idx);
    const sB = scorer.evalInto(idx, c);

    const dA = sA - s0;
    const dB = sB - s0;
    if (dA === 0 || dB === 0) zeroPairs++;
    reversals += reversalIndicator(dA, dB);

    const d = sB - sA;
    wn++;
    const dd = d - wMean;
    wMean += dd / wn;
    wM2 += dd * (d - wMean);
  }
  return {
    nPairs,
    reversalCount: reversals,
    zeroDeltaPairs: zeroPairs,
    directionalReversalProbability: reversals / nPairs,
    sdRepeatedDelta: wn > 1 ? Math.sqrt(wM2 / (wn - 1)) : Number.NaN,
    scoreBase: args.kind === "health" ? 100 : 200,
  };
}

/* ---------------- config-level wrapper ---------------- */

export type NoiseRunConfig = {
  protocolId: ProtocolId;
  persona: Persona;
  sigmaMultiplier: number;
  model: NoiseModel;
  withReversal: boolean;
  params?: McRunParams;
};

export type NoiseRunSummary = {
  personaId: string;
  sex: Sex;
  sigmaMultiplier: number;
  model: NoiseModel;
  expectedCorrelations: ReturnType<typeof expectedCorrelations>;
  health: ScoreMcSummary;
  performance: ScoreMcSummary;
};

/** Run one (persona × sigma × model[×rho]) configuration: Health then Perf, separate streams. */
export function runNoiseConfig(cfg: NoiseRunConfig): NoiseRunSummary {
  const seedArgs: NoiseConfigSeedArgs = {
    protocolId: cfg.protocolId,
    personaIndex: cfg.persona.index,
    sigmaMultiplier: cfg.sigmaMultiplier,
    model: cfg.model.kind,
    rho: cfg.model.kind === "B" ? cfg.model.rho : null,
  };
  const common = {
    persona: cfg.persona,
    seedArgs,
    sigmaMultiplier: cfg.sigmaMultiplier,
    model: cfg.model,
    withReversal: cfg.withReversal,
    ...(cfg.params ? { params: cfg.params } : {}),
  };
  const health = runScoreStreamToConvergence({ ...common, kind: "health" });
  const performance = runScoreStreamToConvergence({ ...common, kind: "perf" });
  return {
    personaId: cfg.persona.id,
    sex: cfg.persona.sex,
    sigmaMultiplier: cfg.sigmaMultiplier,
    model: cfg.model,
    expectedCorrelations: expectedCorrelations(cfg.model),
    health,
    performance,
  };
}
