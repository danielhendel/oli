/**
 * Shared driver for the three Monte Carlo protocols (BCV-002 / BCV-029 / BCV-030).
 *
 * One run directory per (persona × sigmaMultiplier × model[×rho]) configuration.
 * Configurations are executed ONE AT A TIME and only summary statistics are kept.
 */

import {
  PARAMETER_LABEL,
  MC_PROTOCOL,
  RHO_GRID,
  SIGMA_MULTIPLIERS,
  SIGMA_STAR,
  STREAM_CODES,
} from "./constants";
import type { ProtocolId } from "./constants";
import { contributionSummary } from "./contribution";
import type { ScoreFamily } from "./contribution";
import { noiseParamSetId } from "./identity";
import { covarianceParametersFor, modelAError, modelB } from "./models";
import type { NoiseModel } from "./models";
import { runNoiseConfig } from "./monteCarlo";
import type { NoiseRunSummary, ScoreMcSummary } from "./monteCarlo";
import { PERSONAS } from "./personas";
import type { Persona } from "./personas";
import { provenance } from "./artifacts";
import type { ProtocolContext, ProtocolDefinition, RunOutput } from "./artifacts";

export type NoiseConfigPlan = {
  persona: Persona;
  sigmaMultiplier: number;
  model: NoiseModel;
  paramSetId: string;
};

export function isPartialRun(ctx: Pick<ProtocolContext, "filters" | "mcParams">): boolean {
  const f = ctx.filters;
  return Boolean(f.personas || f.sigmas || f.models || f.rhos || ctx.mcParams);
}

/** Full frozen grid: 12 personas × 4 sigmas × (Model A + Model B × 7 rho) = 384 configs. */
export function plannedNoiseConfigs(ctx: Pick<ProtocolContext, "filters">): NoiseConfigPlan[] {
  const f = ctx.filters;
  const out: NoiseConfigPlan[] = [];
  const personas = PERSONAS.filter((p) => !f.personas || f.personas.includes(p.id));
  const sigmas = SIGMA_MULTIPLIERS.filter((s) => !f.sigmas || f.sigmas.includes(s));
  const wantA = !f.models || f.models.includes("A");
  const wantB = !f.models || f.models.includes("B");
  const rhos = RHO_GRID.filter((r) => !f.rhos || f.rhos.includes(r));
  for (const persona of personas) {
    for (const sigmaMultiplier of sigmas) {
      if (wantA) {
        out.push({
          persona,
          sigmaMultiplier,
          model: modelAError(),
          paramSetId: noiseParamSetId({ personaId: persona.id, sigmaMultiplier, model: "A", rho: null }),
        });
      }
      if (wantB) {
        for (const rho of rhos) {
          out.push({
            persona,
            sigmaMultiplier,
            model: modelB(rho),
            paramSetId: noiseParamSetId({ personaId: persona.id, sigmaMultiplier, model: "B", rho }),
          });
        }
      }
    }
  }
  return out;
}

function scoreBlock(s: ScoreMcSummary, family: ScoreFamily) {
  const scores: Record<string, number> = {};
  s.constructs.forEach((c, i) => {
    scores[c] = s.baselineConstructScores[i] as number;
  });
  const baselineContribution = contributionSummary(family, scores);
  return {
    score: s.score,
    constructs: s.constructs,
    weights: s.weights,
    seed: s.seed,
    substreamIndex: s.substreamIndex,
    s0: s.s0,
    baselineConstructScores: s.baselineConstructScores,
    baselineContribution,
    draws: s.draws,
    converged: s.converged,
    hardMaxReached: s.hardMaxReached,
    consecutivePasses: s.consecutivePasses,
    checkpointLog: s.checkpointLog,
    finalCheckpoint: s.finalCheckpoint,
    noisyAggregate: s.noisyAggregate,
    absDelta: s.absDelta,
    thresholdCrossing: s.thresholdCrossing,
    meanChangeContribution: s.meanChangeContribution,
    constructMean: s.constructMean,
    constructCovariance: s.constructCovariance,
    varianceOfAggregate: s.uncertainty.varianceOfAggregate,
    varianceContribution: s.uncertainty.varianceContribution,
    constructUncertaintyShare: s.uncertainty.constructUncertaintyShare,
    uncertaintyFlags: s.uncertainty.flags,
    directionalReversalProbability: s.reversal ? s.reversal.directionalReversalProbability : null,
    reversal: s.reversal,
  };
}

function fmt(x: number | null | undefined, d = 4): string {
  return x == null || !Number.isFinite(x) ? "n/a" : x.toFixed(d);
}

function summaryMd(protocolId: ProtocolId, title: string, plan: NoiseConfigPlan, r: NoiseRunSummary): string {
  const rho = plan.model.kind === "B" ? plan.model.rho : null;
  const lines = [
    `# ${protocolId} — ${title}`,
    "",
    `- persona: ${plan.persona.id} (${plan.persona.sex}), sigma multiplier: ${plan.sigmaMultiplier}`,
    `- model: ${plan.model.kind === "A" ? "A (independent DXA; NOT Model B at rho=0)" : `B (rho=${rho})`}`,
    `- expected correlations: corr(FM,FFM)=${r.expectedCorrelations.corrFmFfm}, corr(FFM,ALM)=${r.expectedCorrelations.corrFfmAlm}, corr(FM,ALM)=${r.expectedCorrelations.corrFmAlm} (= rho^2 for Model B)`,
    `- parameter label: ${PARAMETER_LABEL} (exploratory; not empirical)`,
    "",
    "| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const s of [r.health, r.performance]) {
    lines.push(
      `| ${s.score} | ${fmt(s.s0)} | ${s.draws} | ${s.converged} | ${fmt(s.absDelta.median)} | ${fmt(s.absDelta.p95)} | ${fmt(s.reversal?.directionalReversalProbability ?? null)} | ${fmt(s.uncertainty.varianceOfAggregate)} |`,
    );
  }
  lines.push("", "Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):", "");
  for (const s of [r.health, r.performance]) {
    lines.push(
      `- ${s.score}: ` +
        s.constructs.map((c, i) => `${c}=${fmt(s.uncertainty.constructUncertaintyShare[i] ?? null)}`).join(", "),
    );
  }
  lines.push("", "No product bands, no clinical claims. Synthetic fallback parameters only.");
  return lines.join("\n");
}

export function noiseParameterBlock(plan: NoiseConfigPlan) {
  return {
    label: PARAMETER_LABEL,
    sigmaStar: { ...SIGMA_STAR },
    sigmaMultiplier: plan.sigmaMultiplier,
    effectiveSigma: Object.fromEntries(
      Object.entries(SIGMA_STAR).map(([k, v]) => [k, v * plan.sigmaMultiplier]),
    ),
    sharedHeightError: true,
    drawOrder: ["Height", "FM", "FFM", "ALM", "Waist"],
  };
}

export function noiseProvenance(plan: NoiseConfigPlan) {
  const p: Record<string, ReturnType<typeof provenance>> = {
    parameterLabel: provenance("synthetic_fallback", "§23.6", PARAMETER_LABEL),
    sigmaMultiplier: provenance("validation_plan", "§23.6", plan.sigmaMultiplier),
  };
  for (const [k, v] of Object.entries(SIGMA_STAR)) {
    p[`sigmaStar_${k}`] = provenance("synthetic_fallback", "§23.6", v);
  }
  if (plan.model.kind === "B") p.rho = provenance("synthetic_fallback", "§23.6", plan.model.rho);
  return p;
}

export function buildNoiseRun(
  protocolId: ProtocolId,
  title: string,
  ctx: ProtocolContext,
  plan: NoiseConfigPlan,
  result: NoiseRunSummary,
): RunOutput {
  const partial = isPartialRun(ctx);
  return {
    protocolId,
    experimentId: protocolId,
    paramSetId: plan.paramSetId,
    interpretationClass: "exploratory",
    results: {
      protocolId,
      paramSetId: plan.paramSetId,
      personaId: plan.persona.id,
      sex: plan.persona.sex,
      sigmaMultiplier: plan.sigmaMultiplier,
      model: plan.model,
      parameterLabel: PARAMETER_LABEL,
      expectedCorrelations: result.expectedCorrelations,
      correlationNote: "corr(FM,ALM)=rho^2 for Model B; all zero for Model A (Model A is NOT Model B at rho=0).",
      health: scoreBlock(result.health, "health"),
      performance: scoreBlock(result.performance, "performance"),
    },
    summaryMd: summaryMd(protocolId, title, plan, result),
    manifest: {
      inputDomains: {
        personaId: plan.persona.id,
        heightCm: plan.persona.heightCm,
        waistCm: plan.persona.waistCm,
        whtr: plan.persona.whtr,
        fmi: plan.persona.fmi,
        almi: plan.persona.almi,
        ffmi: plan.persona.ffmi,
      },
      gridSteps: null,
      monteCarloProtocol: MC_PROTOCOL,
      noiseParameters: noiseParameterBlock(plan),
      covarianceParameters: covarianceParametersFor(plan.model),
      scheduleId: null,
      personaId: plan.persona.id,
      parameterProvenance: noiseProvenance(plan),
      notes:
        `${title}. Pure-transform scoring (approved transforms); summary statistics only.` +
        (partial ? " PARTIAL RUN: CLI filters or reduced MC params were used; not the full frozen grid." : ""),
    },
  };
}

export function makeNoiseProtocol(args: {
  protocolId: ProtocolId;
  title: string;
}): ProtocolDefinition {
  const { protocolId, title } = args;
  return {
    protocolId,
    experimentId: protocolId,
    streamCode: STREAM_CODES[protocolId],
    title,
    interpretationClass: "exploratory",
    emitsCsv: false,
    plannedParamSetIds: (ctx) => plannedNoiseConfigs(ctx).map((p) => p.paramSetId),
    *run(ctx) {
      for (const plan of plannedNoiseConfigs(ctx)) {
        ctx.log(`${protocolId} ${plan.paramSetId}`);
        const result = runNoiseConfig({
          protocolId,
          persona: plan.persona,
          sigmaMultiplier: plan.sigmaMultiplier,
          model: plan.model,
          withReversal: true,
          ...(ctx.mcParams ? { params: ctx.mcParams } : {}),
        });
        yield buildNoiseRun(protocolId, title, ctx, plan, result);
      }
    },
  };
}
