/**
 * BCV-032A — Change-triad methodology consistency audit (§23.13, §23.17.6).
 *
 * ONLY the §23.17.6 measurement-error formulas are computed:
 *   SEM_diff         = SD(delta) / sqrt(2),   delta = repeatedMeasurement2 - repeatedMeasurement1
 *   SDC95_individual = 1.96 * sqrt(2) * SEM_diff  (= 1.96 * SD(delta))
 *   MDC95_individual = SDC95_individual           (terminology alias only)
 * Group-level SDC is NOT calculated. Clinical / user-perceived meaningful change have NO formula
 * (evidence-dependent, unresolved) and are reported as null.
 *
 * SD(delta) is read from BCV-030 / BCV-029 artifacts on disk (reversal.sdRepeatedDelta, divisor N-1).
 */
import * as fs from "fs";
import * as path from "path";

import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export const Z95 = 1.96;

export function changeMethodFormulas(sdDelta: number): {
  SEM_diff: number;
  SDC95_individual: number;
  MDC95_individual: number;
  identityResidual: number;
} {
  const SEM_diff = sdDelta / Math.sqrt(2);
  const SDC95_individual = Z95 * Math.sqrt(2) * SEM_diff;
  const MDC95_individual = SDC95_individual;
  return {
    SEM_diff,
    SDC95_individual,
    MDC95_individual,
    identityResidual: Math.abs(SDC95_individual - Z95 * sdDelta),
  };
}

/** Sample SD (N-1) of an explicit delta vector; used for the synthetic formula self-check only. */
export function sampleSdOf(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return Number.NaN;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1));
}

export const TRIAD_CHECKLIST = [
  {
    concept: "measurement_error_change",
    formulas: ["SEM_diff", "SDC95_individual", "MDC95_individual (alias of SDC95_individual)"],
    status: "computed_from_BCV-029_030_envelopes",
  },
  { concept: "group_level_SDC", formulas: [], status: "NOT_CALCULATED_in_Wave1_no_empirical_N" },
  { concept: "clinical_meaningful_change", formulas: [], status: "NO_FORMULA_evidence_dependent_unresolved" },
  { concept: "user_perceived_meaningful_change", formulas: [], status: "NO_FORMULA_evidence_dependent_unresolved" },
] as const;

export type SourceRow = {
  sourceProtocol: string;
  runId: string;
  personaId: string;
  sigmaMultiplier: number;
  model: unknown;
  score: "health" | "performance";
  nPairs: number;
  sdDelta: number;
  SEM_diff: number;
  SDC95_individual: number;
  MDC95_individual: number;
};

export function collectSourceRows(outRoot: string, sourceProtocols: readonly string[], seed: number): SourceRow[] {
  const rows: SourceRow[] = [];
  for (const proto of sourceProtocols) {
    const dir = path.join(outRoot, proto);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.startsWith(`${proto}__`) || !name.includes(`__s${seed}__`)) continue;
      const file = path.join(dir, name, "results.json");
      if (!fs.existsSync(file)) continue;
      const res = JSON.parse(fs.readFileSync(file, "utf8")) as {
        personaId: string;
        sigmaMultiplier: number;
        model: unknown;
        health?: { reversal?: { sdRepeatedDelta: number; nPairs: number } | null };
        performance?: { reversal?: { sdRepeatedDelta: number; nPairs: number } | null };
      };
      for (const score of ["health", "performance"] as const) {
        const rev = res[score]?.reversal;
        if (!rev || !Number.isFinite(rev.sdRepeatedDelta)) continue;
        const f = changeMethodFormulas(rev.sdRepeatedDelta);
        rows.push({
          sourceProtocol: proto,
          runId: name,
          personaId: res.personaId,
          sigmaMultiplier: res.sigmaMultiplier,
          model: res.model,
          score,
          nPairs: rev.nPairs,
          sdDelta: rev.sdRepeatedDelta,
          SEM_diff: f.SEM_diff,
          SDC95_individual: f.SDC95_individual,
          MDC95_individual: f.MDC95_individual,
        });
      }
    }
  }
  return rows;
}

export function bcv032aRun(outRoot: string, seed: number): RunOutput {
  const rows = collectSourceRows(outRoot, ["BCV-030", "BCV-029"], seed);
  // Deterministic synthetic self-check of the formulas (explicit delta vector, no randomness).
  const selfCheckDeltas = [-2, -1, 0, 1, 2, 3];
  const sd = sampleSdOf(selfCheckDeltas);
  const selfCheck = { deltas: selfCheckDeltas, sdDelta: sd, ...changeMethodFormulas(sd) };
  const maxResidual = rows.reduce((m, r) => Math.max(m, Math.abs(r.SDC95_individual - Z95 * r.sdDelta)), selfCheck.identityResidual);
  return {
    protocolId: "BCV-032A",
    experimentId: "BCV-032A",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: {
      protocolId: "BCV-032A",
      formulas: {
        SEM_diff: "SD(delta) / sqrt(2)",
        SDC95_individual: "1.96 * sqrt(2) * SEM_diff = 1.96 * SD(delta)",
        MDC95_individual: "= SDC95_individual (terminology alias only)",
        delta: "repeatedMeasurement2 - repeatedMeasurement1",
      },
      inputsAvailable: rows.length > 0,
      sourceRows: rows,
      groupLevelSDC: { calculated: false, reason: "SHALL NOT calculate in Wave 1 (no empirical study N)" },
      clinicalMeaningfulChange: { formula: null, status: "evidence_dependent_unresolved" },
      userPerceivedMeaningfulChange: { formula: null, status: "evidence_dependent_unresolved" },
      triadChecklist: TRIAD_CHECKLIST,
      triadEquivalent: false,
      syntheticFormulaSelfCheck: selfCheck,
      algebraicIdentityMaxResidual: maxResidual,
    },
    summaryMd: [
      "# BCV-032A — Change-triad methodology audit",
      "",
      "- SEM_diff = SD(delta) / sqrt(2); SDC95_individual = 1.96 * sqrt(2) * SEM_diff = 1.96 * SD(delta); MDC95_individual = SDC95_individual (alias).",
      "- Group-level SDC: NOT calculated. Clinical and user-perceived meaningful change: NO formula (unresolved).",
      `- Source rows from BCV-030/BCV-029 artifacts: ${rows.length}${rows.length === 0 ? " (run BCV-030/BCV-029 first; formulas and checklist are still emitted)" : ""}.`,
      `- Algebraic identity max residual: ${maxResidual}.`,
      "",
      "The three change concepts are separate and no clinical or user threshold is manufactured here.",
    ].join("\n"),
    manifest: {
      inputDomains: { sources: ["BCV-030", "BCV-029"] },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        formulas: provenance("validation_plan", "§23.17.6", { z95: Z95 }),
      },
      notes: "Inherits noise/seed from BCV-029/030 artifacts; reads results.json from the artifact root.",
      epsilon: false,
    },
  };
}

export const bcv032a: ProtocolDefinition = {
  protocolId: "BCV-032A",
  experimentId: "BCV-032A",
  streamCode: 3201,
  title: "Change-triad methodology audit",
  interpretationClass: "structural_invariant",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run(ctx) {
    yield bcv032aRun(ctx.outRoot, ctx.seed);
  },
};
