import { FROZEN_MC_RUN_PARAMS, runNoiseConfig } from "../src/monteCarlo";
import type { McRunParams } from "../src/monteCarlo";
import { MC_PROTOCOL, THRESHOLDS } from "../src/constants";
import { modelAError, modelB } from "../src/models";
import { personaById } from "../src/personas";
import { FROZEN_CONVERGENCE_PARAMS } from "../src/stats";

const SMALL: McRunParams = {
  minimumDraws: 2000,
  maximumDraws: 6000,
  checkpointEvery: 1000,
  convergence: FROZEN_CONVERGENCE_PARAMS,
};

describe("frozen MC run parameters", () => {
  it("min 1e5, max 1e6, checkpoint 1e4, two consecutive passes", () => {
    expect(FROZEN_MC_RUN_PARAMS.minimumDraws).toBe(100000);
    expect(FROZEN_MC_RUN_PARAMS.maximumDraws).toBe(1000000);
    expect(FROZEN_MC_RUN_PARAMS.checkpointEvery).toBe(10000);
    expect(FROZEN_MC_RUN_PARAMS.convergence.requiredConsecutivePasses).toBe(2);
    expect(MC_PROTOCOL.requiredConsecutivePasses).toBe(2);
  });
});

describe("runNoiseConfig (small budget)", () => {
  const cfg = {
    protocolId: "BCV-030" as const,
    persona: personaById("P-04"),
    sigmaMultiplier: 1,
    model: modelB(0.5),
    withReversal: true,
    params: SMALL,
  };
  const r = runNoiseConfig(cfg);

  it("returns summaries for both score families with the frozen constructs/weights", () => {
    expect(r.health.constructs).toEqual(["H1", "H2", "H3"]);
    expect(r.health.weights).toEqual([0.45, 0.35, 0.2]);
    expect(r.performance.constructs).toEqual(["P1", "P3"]);
    expect(r.performance.weights).toEqual([0.5, 0.5]);
  });
  it("uses separate substreams (Health 0, Perf 1)", () => {
    expect(r.health.substreamIndex).toBe(0);
    expect(r.performance.substreamIndex).toBe(1);
    expect(r.performance.seed - r.health.seed).toBe(1);
  });
  it("draws are within [min, max] and a multiple of the checkpoint interval", () => {
    for (const s of [r.health, r.performance]) {
      expect(s.draws).toBeGreaterThanOrEqual(SMALL.minimumDraws);
      expect(s.draws).toBeLessThanOrEqual(SMALL.maximumDraws);
      expect(s.draws % SMALL.checkpointEvery).toBe(0);
      expect(s.converged || s.hardMaxReached).toBe(true);
    }
  });
  it("stores summary statistics only (no raw draws)", () => {
    const json = JSON.stringify(r);
    expect(json.length).toBeLessThan(60000);
    expect(Object.keys(r.health)).not.toContain("draws_raw");
  });
  it("reports Type-7 quantiles, central intervals, |Δ| stats and 9 threshold rates", () => {
    const q = r.health.noisyAggregate.quantiles;
    expect(q.p05).toBeLessThanOrEqual(q.p10);
    expect(q.p10).toBeLessThanOrEqual(q.p25);
    expect(q.p25).toBeLessThanOrEqual(q.p50);
    expect(q.p50).toBeLessThanOrEqual(q.p75);
    expect(q.p75).toBeLessThanOrEqual(q.p90);
    expect(q.p90).toBeLessThanOrEqual(q.p95);
    const ci = r.health.noisyAggregate.centralIntervals;
    expect(ci.c95[0]).toBeLessThanOrEqual(ci.c90[0]);
    expect(ci.c95[1]).toBeGreaterThanOrEqual(ci.c90[1]);
    expect(r.health.absDelta.p95).toBeGreaterThanOrEqual(r.health.absDelta.median);
    expect(r.health.thresholdCrossing.map((t) => t.threshold)).toEqual([...THRESHOLDS]);
    for (const t of r.health.thresholdCrossing) {
      expect(t.rate).toBeGreaterThanOrEqual(0);
      expect(t.rate).toBeLessThanOrEqual(1);
      expect(t.se).toBeGreaterThanOrEqual(0);
    }
  });
  it("uncertainty shares sum to 1 (when Var(A) > EPS_NUM) and are signed", () => {
    for (const s of [r.health, r.performance]) {
      expect(s.uncertainty.flags).toEqual([]);
      const total = s.uncertainty.constructUncertaintyShare.reduce<number>((a, x) => a + (x ?? 0), 0);
      expect(total).toBeCloseTo(1, 9);
      expect(s.uncertainty.varianceContribution.reduce((a, x) => a + x, 0)).toBeCloseTo(
        s.uncertainty.varianceOfAggregate,
        9,
      );
    }
  });
  it("reversal block: N_pairs = converged draws; probability in [0,1]; SD(delta) positive", () => {
    for (const s of [r.health, r.performance]) {
      expect(s.reversal).not.toBeNull();
      expect(s.reversal!.nPairs).toBe(s.draws);
      expect(s.reversal!.directionalReversalProbability).toBeGreaterThanOrEqual(0);
      expect(s.reversal!.directionalReversalProbability).toBeLessThanOrEqual(1);
      expect(s.reversal!.sdRepeatedDelta).toBeGreaterThan(0);
    }
    expect(r.health.reversal!.scoreBase).toBe(100);
    expect(r.performance.reversal!.scoreBase).toBe(200);
  });
  it("is fully deterministic", () => {
    expect(JSON.stringify(runNoiseConfig(cfg))).toBe(JSON.stringify(r));
  });
  it("Model A ≠ Model B(rho=0) — distinct streams give distinct summaries", () => {
    const a = runNoiseConfig({ ...cfg, model: modelAError() });
    const b = runNoiseConfig({ ...cfg, model: modelB(0) });
    expect(a.health.seed).not.toBe(b.health.seed);
    expect(a.health.absDelta.p95).not.toBe(b.health.absDelta.p95);
    expect(a.expectedCorrelations).toEqual({ corrFmFfm: 0, corrFfmAlm: 0, corrFmAlm: 0 });
  });
  it("withReversal=false omits the reversal block", () => {
    expect(runNoiseConfig({ ...cfg, withReversal: false }).health.reversal).toBeNull();
  });
  it("larger sigma gives larger |Δ|", () => {
    const lo = runNoiseConfig({ ...cfg, sigmaMultiplier: 0.5, withReversal: false });
    const hi = runNoiseConfig({ ...cfg, sigmaMultiplier: 2, withReversal: false });
    expect(hi.health.absDelta.p95).toBeGreaterThan(lo.health.absDelta.p95);
  });
});
