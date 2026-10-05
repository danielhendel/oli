/**
 * Artifact + manifest contract (plan §23.9).
 *
 * Artifact root:  validation/body-composition/dual-score/wave1/<experiment-id>/<run-id>/
 * Every run writes: manifest.json, results.json, summary.md; grid/surface/table protocols
 * also results.csv. Optional plots must be listed in `artifactFiles`.
 * `createdAtUtc` is informational ONLY — never part of runId and never read by analysis.
 */

import * as fs from "fs";
import * as path from "path";

import {
  CANONICAL_SEED,
  EPS_CM,
  EPS_NUM,
  EPS_SURF,
  HEALTH_ENGINE_VERSION,
  IMPLEMENTATION_SHA,
  INTERPRETATION_CLASSES,
  MATHEMATICAL_FREEZE_SHA,
  MC_PROTOCOL,
  PARAMETER_SOURCE_TYPES,
  PERF_ENGINE_VERSION,
  PHI_STATUS,
  RHO_GRID,
  SCHEMA_VERSION,
  STREAM_CODES,
  VALIDATION_PLAN_SHA,
  WAVE1_PROTOCOL_IDS,
} from "./constants";
import type { InterpretationClass, ProtocolId } from "./constants";
import { parseRunId, makeRunId } from "./identity";
import type { McRunParams } from "./monteCarlo";

/* ---------------- manifest ---------------- */

export const MANIFEST_KEYS = [
  "schemaVersion",
  "experimentId",
  "protocolId",
  "runId",
  "engineVersion",
  "implementationSha",
  "mathematicalFreezeSha",
  "validationPlanSha",
  "validationCodeSha",
  "createdAtUtc",
  "seed",
  "streamCode",
  "inputDomains",
  "gridSteps",
  "epsilon",
  "monteCarloProtocol",
  "noiseParameters",
  "covarianceParameters",
  "scheduleId",
  "personaId",
  "parameterProvenance",
  "artifactFiles",
  "interpretationClass",
  "phiStatus",
  "notes",
] as const;

export type ParameterProvenanceEntry = {
  sourceType: (typeof PARAMETER_SOURCE_TYPES)[number];
  sourceId: string;
  value: unknown;
};

export type Manifest = {
  schemaVersion: typeof SCHEMA_VERSION;
  experimentId: string;
  protocolId: ProtocolId;
  runId: string;
  engineVersion: { health: string; performanceSupporting: string };
  implementationSha: string;
  mathematicalFreezeSha: string;
  validationPlanSha: string;
  validationCodeSha: string;
  createdAtUtc: string;
  seed: number;
  streamCode: number;
  inputDomains: unknown | null;
  gridSteps: unknown | null;
  epsilon: { EPS_NUM: number; EPS_SURF: number; EPS_CM: number } | null;
  monteCarloProtocol: typeof MC_PROTOCOL | null;
  noiseParameters: unknown | null;
  covarianceParameters: {
    model: "A_independent_dxa" | "B_correlated_dxa";
    sharedHeightError: boolean;
    correlatedPairs: string[][];
    rho: number | null;
  } | null;
  scheduleId: string | null;
  personaId: string | null;
  parameterProvenance: Record<string, ParameterProvenanceEntry>;
  artifactFiles: string[];
  interpretationClass: InterpretationClass;
  phiStatus: typeof PHI_STATUS;
  notes: string;
};

/** Per-run manifest fields supplied by the protocol (rest is filled by the writer). */
export type RunManifestFields = {
  inputDomains: unknown | null;
  gridSteps: unknown | null;
  monteCarloProtocol: typeof MC_PROTOCOL | null;
  noiseParameters: unknown | null;
  covarianceParameters: Manifest["covarianceParameters"];
  scheduleId: string | null;
  personaId: string | null;
  parameterProvenance: Record<string, ParameterProvenanceEntry>;
  notes: string;
  /** Include `epsilon` (default true). */
  epsilon?: boolean;
};

export type RunOutput = {
  protocolId: ProtocolId;
  experimentId: string;
  paramSetId: string;
  interpretationClass: InterpretationClass;
  results: unknown;
  csv?: string;
  summaryMd: string;
  /** Extra files relative to the run root (e.g. `plots/x.svg`). Listed in artifactFiles. */
  extraFiles?: Record<string, string>;
  manifest: RunManifestFields;
  /** Structural HARD FAIL (e.g. BCV-031 hidden path dependence). */
  hardFail?: boolean;
};

export type ProtocolContext = {
  seed: number;
  validationCodeSha: string;
  validationCodeShaShort8: string;
  outRoot: string;
  emitPlots: boolean;
  filters: {
    personas?: string[];
    sigmas?: number[];
    models?: Array<"A" | "B">;
    rhos?: number[];
  };
  mcParams?: McRunParams;
  /** Dry-run: protocols describe planned runs without heavy compute. */
  dryRun: boolean;
  log: (msg: string) => void;
};

export type ProtocolDefinition = {
  protocolId: ProtocolId;
  experimentId: string;
  streamCode: number;
  title: string;
  interpretationClass: InterpretationClass;
  emitsCsv: boolean;
  /** Planned paramSetIds (cheap; used by dry-run + tests). */
  plannedParamSetIds(ctx: ProtocolContext): string[];
  /** Lazily yield run outputs, ONE configuration at a time. */
  run(ctx: ProtocolContext): Generator<RunOutput, void, void>;
};

/* ---------------- standard fields ---------------- */

export function standardEpsilon(): NonNullable<Manifest["epsilon"]> {
  return { EPS_NUM, EPS_SURF, EPS_CM };
}

export function provenance(
  sourceType: ParameterProvenanceEntry["sourceType"],
  sourceId: string,
  value: unknown,
): ParameterProvenanceEntry {
  return { sourceType, sourceId, value };
}

/** Standard provenance for frozen identity + epsilon policy. */
export function frozenProvenance(): Record<string, ParameterProvenanceEntry> {
  return {
    canonicalSeed: provenance("validation_plan", "§23.2", CANONICAL_SEED),
    implementationSha: provenance("mathematical_freeze", "§23.1", IMPLEMENTATION_SHA),
    EPS_NUM: provenance("validation_plan", "§23.4", EPS_NUM),
    EPS_SURF: provenance("validation_plan", "§23.4", EPS_SURF),
    EPS_CM: provenance("validation_plan", "§23.4", EPS_CM),
  };
}

export function buildManifest(args: {
  run: RunOutput;
  ctx: Pick<ProtocolContext, "seed" | "validationCodeSha" | "validationCodeShaShort8">;
  artifactFiles: string[];
  createdAtUtc: string;
}): Manifest {
  const { run, ctx } = args;
  const runId = makeRunId({
    protocolId: run.protocolId,
    validationCodeShaShort8: ctx.validationCodeShaShort8,
    seed: ctx.seed,
    paramSetId: run.paramSetId,
  });
  const m = run.manifest;
  return {
    schemaVersion: SCHEMA_VERSION,
    experimentId: run.experimentId,
    protocolId: run.protocolId,
    runId,
    engineVersion: { health: HEALTH_ENGINE_VERSION, performanceSupporting: PERF_ENGINE_VERSION },
    implementationSha: IMPLEMENTATION_SHA,
    mathematicalFreezeSha: MATHEMATICAL_FREEZE_SHA,
    validationPlanSha: VALIDATION_PLAN_SHA,
    validationCodeSha: ctx.validationCodeSha,
    createdAtUtc: args.createdAtUtc,
    seed: ctx.seed,
    streamCode: STREAM_CODES[run.protocolId],
    inputDomains: m.inputDomains,
    gridSteps: m.gridSteps,
    epsilon: m.epsilon === false ? null : standardEpsilon(),
    monteCarloProtocol: m.monteCarloProtocol,
    noiseParameters: m.noiseParameters,
    covarianceParameters: m.covarianceParameters,
    scheduleId: m.scheduleId,
    personaId: m.personaId,
    parameterProvenance: { ...frozenProvenance(), ...m.parameterProvenance },
    artifactFiles: args.artifactFiles,
    interpretationClass: run.interpretationClass,
    phiStatus: PHI_STATUS,
    notes: m.notes,
  };
}

/* ---------------- validation ---------------- */

const SHA40 = /^[0-9a-f]{40}$/;

export function validateManifest(m: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (m == null || typeof m !== "object" || Array.isArray(m)) {
    return { ok: false, errors: ["manifest_not_object"] };
  }
  const o = m as Record<string, unknown>;
  for (const k of MANIFEST_KEYS) if (!(k in o)) errors.push(`missing_key:${k}`);
  for (const k of Object.keys(o)) {
    if (!(MANIFEST_KEYS as readonly string[]).includes(k)) errors.push(`unexpected_key:${k}`);
  }
  if (errors.length > 0) return { ok: false, errors };

  if (o.schemaVersion !== SCHEMA_VERSION) errors.push("schemaVersion_invalid");
  if (o.phiStatus !== PHI_STATUS) errors.push("phiStatus_invalid");
  if (!INTERPRETATION_CLASSES.includes(o.interpretationClass as InterpretationClass)) {
    errors.push("interpretationClass_invalid");
  }
  if (o.implementationSha !== IMPLEMENTATION_SHA) errors.push("implementationSha_mismatch");
  if (o.mathematicalFreezeSha !== MATHEMATICAL_FREEZE_SHA) errors.push("mathematicalFreezeSha_mismatch");
  if (o.validationPlanSha !== VALIDATION_PLAN_SHA) errors.push("validationPlanSha_mismatch");
  if (typeof o.validationCodeSha !== "string" || !SHA40.test(o.validationCodeSha)) {
    errors.push("validationCodeSha_invalid");
  }
  if (typeof o.createdAtUtc !== "string" || Number.isNaN(Date.parse(o.createdAtUtc))) {
    errors.push("createdAtUtc_invalid");
  }
  if (!Number.isInteger(o.seed)) errors.push("seed_invalid");

  const protocolId = o.protocolId as ProtocolId;
  if (!WAVE1_PROTOCOL_IDS.includes(protocolId)) errors.push("protocolId_not_wave1_member");
  else if (o.streamCode !== STREAM_CODES[protocolId]) errors.push("streamCode_mismatch");

  const ev = o.engineVersion as { health?: string; performanceSupporting?: string } | null;
  if (!ev || ev.health !== HEALTH_ENGINE_VERSION || ev.performanceSupporting !== PERF_ENGINE_VERSION) {
    errors.push("engineVersion_invalid");
  }

  // runId convention
  if (typeof o.runId !== "string") errors.push("runId_invalid");
  else {
    const parsed = parseRunId(o.runId);
    if (!parsed) errors.push("runId_unparseable");
    else {
      if (parsed.protocolId !== o.protocolId) errors.push("runId_protocol_mismatch");
      if (parsed.seed !== o.seed) errors.push("runId_seed_mismatch");
      if (
        typeof o.validationCodeSha === "string" &&
        parsed.validationCodeShaShort8 !== o.validationCodeSha.slice(0, 8)
      ) {
        errors.push("runId_sha_mismatch");
      }
    }
    if (typeof o.createdAtUtc === "string" && o.runId.includes(o.createdAtUtc)) {
      errors.push("runId_contains_createdAtUtc");
    }
    if (/\d{4}-\d{2}-\d{2}T/.test(o.runId) || /\d{8}T\d{6}/.test(o.runId)) {
      errors.push("runId_contains_timestamp");
    }
  }
  if (o.experimentId !== o.protocolId) errors.push("experimentId_must_equal_protocolId");

  // monteCarloProtocol: null OR exact
  if (o.monteCarloProtocol !== null) {
    if (JSON.stringify(sortKeys(o.monteCarloProtocol)) !== JSON.stringify(sortKeys(MC_PROTOCOL))) {
      errors.push("monteCarloProtocol_not_exact");
    }
  }

  // covarianceParameters: null OR model A / model B
  const cp = o.covarianceParameters as Manifest["covarianceParameters"] | null;
  if (cp !== null) {
    if (cp.model === "A_independent_dxa") {
      if (cp.sharedHeightError !== true || cp.correlatedPairs.length !== 0 || cp.rho !== null) {
        errors.push("covarianceParameters_modelA_invalid");
      }
    } else if (cp.model === "B_correlated_dxa") {
      const pairs = JSON.stringify(cp.correlatedPairs);
      if (
        cp.sharedHeightError !== true ||
        pairs !== JSON.stringify([["FM", "FFM"], ["FFM", "ALM"]]) ||
        cp.rho == null ||
        !(RHO_GRID as readonly number[]).includes(cp.rho)
      ) {
        errors.push("covarianceParameters_modelB_invalid");
      }
    } else errors.push("covarianceParameters_model_invalid");
  }

  // provenance
  const pp = o.parameterProvenance as Record<string, ParameterProvenanceEntry> | null;
  if (!pp || typeof pp !== "object") errors.push("parameterProvenance_invalid");
  else {
    for (const [k, v] of Object.entries(pp)) {
      if (!PARAMETER_SOURCE_TYPES.includes(v?.sourceType)) errors.push(`provenance_sourceType_invalid:${k}`);
      if (typeof v?.sourceId !== "string" || v.sourceId.length === 0) errors.push(`provenance_sourceId_invalid:${k}`);
      if (!("value" in (v ?? {}))) errors.push(`provenance_value_missing:${k}`);
    }
    // No unprovenanced noise / covariance parameter.
    const np = o.noiseParameters as { sigmaStar?: Record<string, unknown>; sigmaMultiplier?: number } | null;
    if (np) {
      for (const k of Object.keys(np.sigmaStar ?? {})) {
        if (!(`sigmaStar_${k}` in pp)) errors.push(`noise_param_unprovenanced:sigmaStar_${k}`);
      }
      if (np.sigmaMultiplier != null && !("sigmaMultiplier" in pp)) {
        errors.push("noise_param_unprovenanced:sigmaMultiplier");
      }
    }
    if (cp && cp.model === "B_correlated_dxa" && !("rho" in pp)) {
      errors.push("covariance_param_unprovenanced:rho");
    }
  }

  // artifactFiles
  const af = o.artifactFiles as string[] | null;
  if (!Array.isArray(af)) errors.push("artifactFiles_invalid");
  else {
    for (const req of ["manifest.json", "results.json", "summary.md"]) {
      if (!af.includes(req)) errors.push(`artifactFiles_missing:${req}`);
    }
    for (const f of af) {
      if (path.isAbsolute(f) || f.split("/").includes("..")) errors.push(`artifactFiles_not_relative:${f}`);
    }
  }
  if (typeof o.notes !== "string") errors.push("notes_invalid");
  return { ok: errors.length === 0, errors };
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/* ---------------- paths / writing ---------------- */

/** wave1 root directory (…/validation/body-composition/dual-score/wave1). */
export function defaultArtifactRoot(): string {
  return path.resolve(__dirname, "..");
}

export function runDirFor(root: string, experimentId: string, runId: string): string {
  return path.join(root, experimentId, runId);
}

/** Relative artifact path: `<experiment-id>/<run-id>` (always forward slashes). */
export function relativeRunPath(experimentId: string, runId: string): string {
  return `${experimentId}/${runId}`;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  return lines.join("\n") + "\n";
}

/** Tiny dependency-free SVG polyline chart (optional plots; not source of truth). */
export function svgLineChart(
  title: string,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  size: { w: number; h: number } = { w: 320, h: 160 },
): string {
  const n = xs.length;
  if (n === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}"/>`;
  let xmin = Infinity;
  let xmax = -Infinity;
  for (let i = 0; i < n; i++) {
    xmin = Math.min(xmin, xs[i] as number);
    xmax = Math.max(xmax, xs[i] as number);
  }
  const ymin = 0;
  const ymax = 100;
  const px = (x: number) => 8 + ((x - xmin) / (xmax - xmin || 1)) * (size.w - 16);
  const py = (y: number) => size.h - 16 - ((y - ymin) / (ymax - ymin)) * (size.h - 32);
  const pts: string[] = [];
  for (let i = 0; i < n; i++) pts.push(`${px(xs[i] as number).toFixed(2)},${py(ys[i] as number).toFixed(2)}`);
  const esc = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}">` +
    `<text x="8" y="12" font-size="10" font-family="monospace">${esc}</text>` +
    `<polyline fill="none" stroke="#1f77b4" stroke-width="1" points="${pts.join(" ")}"/></svg>\n`
  );
}

export function writeRun(args: {
  run: RunOutput;
  ctx: Pick<ProtocolContext, "seed" | "validationCodeSha" | "validationCodeShaShort8" | "outRoot">;
  createdAtUtc?: string;
}): { runDir: string; runId: string; manifest: Manifest } {
  const { run, ctx } = args;
  const runId = makeRunId({
    protocolId: run.protocolId,
    validationCodeShaShort8: ctx.validationCodeShaShort8,
    seed: ctx.seed,
    paramSetId: run.paramSetId,
  });
  const dir = runDirFor(ctx.outRoot, run.experimentId, runId);
  fs.mkdirSync(dir, { recursive: true });

  const files: string[] = ["manifest.json", "results.json", "summary.md"];
  if (run.csv !== undefined) files.push("results.csv");
  for (const f of Object.keys(run.extraFiles ?? {})) files.push(f);

  fs.writeFileSync(path.join(dir, "results.json"), stableJson(run.results));
  fs.writeFileSync(path.join(dir, "summary.md"), run.summaryMd.endsWith("\n") ? run.summaryMd : run.summaryMd + "\n");
  if (run.csv !== undefined) fs.writeFileSync(path.join(dir, "results.csv"), run.csv);
  for (const [rel, content] of Object.entries(run.extraFiles ?? {})) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  const manifest = buildManifest({
    run,
    ctx,
    artifactFiles: files.sort(),
    createdAtUtc: args.createdAtUtc ?? new Date().toISOString(),
  });
  const v = validateManifest(manifest);
  if (!v.ok) throw new Error(`manifest_invalid:${runId}:${v.errors.join(",")}`);
  fs.writeFileSync(path.join(dir, "manifest.json"), stableJson(manifest));
  return { runDir: dir, runId, manifest };
}
