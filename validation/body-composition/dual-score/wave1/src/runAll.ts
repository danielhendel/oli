/**
 * Wave 1 runner.
 *
 *   npx tsx --tsconfig validation/body-composition/dual-score/wave1/tsconfig.json \
 *     validation/body-composition/dual-score/wave1/src/runAll.ts [options]
 *
 * Options
 *   --dry-run            Assert identity, print the plan (protocols, run counts, paramSetIds). No compute, no writes.
 *   --protocols A,B      Subset of protocols (default: all 16, dependency order; BCV-032A last).
 *   --out DIR            Artifact root (default: the wave1 directory).
 *   --plots              Emit optional SVG plots (BCV-001).
 *   --personas P-01,...  MC protocols only: persona filter   (marks runs PARTIAL)
 *   --sigmas 1,2         MC protocols only: sigma multiplier filter (PARTIAL)
 *   --models A,B         MC protocols only: model filter (PARTIAL)
 *   --rhos 0,0.25        MC protocols only: Model-B rho filter (PARTIAL)
 *   --smoke-mc           Use a tiny MC budget (PARTIAL; pipeline check only — NOT the frozen protocol)
 *   --allow-dirty        Permit running with uncommitted validation code (validationCodeSha = HEAD).
 *
 * Exit code 1 on identity failure, BCV-031 HARD FAIL (hidden-path dependence), or any error.
 */

import { CANONICAL_SEED, WAVE1_PROTOCOL_IDS } from "./constants";
import type { ProtocolId } from "./constants";
import {
  assertScoringModuleMatchesImplementationSha,
  shortSha8,
  validationCodeSha,
  validationTreeDirty,
} from "./identity";
import type { GitExec } from "./identity";
import { defaultArtifactRoot, writeRun } from "./artifacts";
import type { ProtocolContext } from "./artifacts";
import { FROZEN_CONVERGENCE_PARAMS } from "./stats";
import type { McRunParams } from "./monteCarlo";
import { EXECUTION_ORDER, PROTOCOLS, assertRegistryComplete, protocolById } from "./protocols";

export type CliOptions = {
  dryRun: boolean;
  protocols: ProtocolId[];
  out: string;
  plots: boolean;
  personas?: string[];
  sigmas?: number[];
  models?: Array<"A" | "B">;
  rhos?: number[];
  smokeMc: boolean;
  allowDirty: boolean;
};

export const SMOKE_MC_PARAMS: McRunParams = {
  minimumDraws: 2000,
  maximumDraws: 4000,
  checkpointEvery: 1000,
  convergence: FROZEN_CONVERGENCE_PARAMS,
};

function list(v: string | undefined): string[] {
  if (!v) throw new Error("option_requires_value");
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const o: CliOptions = {
    dryRun: false,
    protocols: [...EXECUTION_ORDER],
    out: defaultArtifactRoot(),
    plots: false,
    smokeMc: false,
    allowDirty: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    const next = () => argv[++i];
    switch (a) {
      case "--dry-run":
        o.dryRun = true;
        break;
      case "--plots":
        o.plots = true;
        break;
      case "--smoke-mc":
        o.smokeMc = true;
        break;
      case "--allow-dirty":
        o.allowDirty = true;
        break;
      case "--out": {
        const v = next();
        if (!v) throw new Error("--out requires a value");
        o.out = v;
        break;
      }
      case "--protocols": {
        const ids = list(next()).map((s) => s.toUpperCase()) as ProtocolId[];
        for (const id of ids) if (!WAVE1_PROTOCOL_IDS.includes(id)) throw new Error(`unknown_protocol:${id}`);
        o.protocols = EXECUTION_ORDER.filter((p) => ids.includes(p));
        break;
      }
      case "--personas":
        o.personas = list(next());
        break;
      case "--sigmas":
        o.sigmas = list(next()).map(Number);
        break;
      case "--rhos":
        o.rhos = list(next()).map(Number);
        break;
      case "--models": {
        const m = list(next()).map((s) => s.toUpperCase());
        for (const x of m) if (x !== "A" && x !== "B") throw new Error(`unknown_model:${x}`);
        o.models = m as Array<"A" | "B">;
        break;
      }
      default:
        throw new Error(`unknown_option:${a}`);
    }
  }
  return o;
}

export type PlanEntry = { protocolId: ProtocolId; runs: number; paramSetIds: string[] };

export function buildContext(
  o: CliOptions,
  sha: string,
  log: (m: string) => void,
): ProtocolContext {
  const filters: ProtocolContext["filters"] = {};
  if (o.personas) filters.personas = o.personas;
  if (o.sigmas) filters.sigmas = o.sigmas;
  if (o.models) filters.models = o.models;
  if (o.rhos) filters.rhos = o.rhos;
  return {
    seed: CANONICAL_SEED,
    validationCodeSha: sha,
    validationCodeShaShort8: shortSha8(sha),
    outRoot: o.out,
    emitPlots: o.plots,
    filters,
    ...(o.smokeMc ? { mcParams: SMOKE_MC_PARAMS } : {}),
    dryRun: o.dryRun,
    log,
  };
}

export function buildPlan(ctx: ProtocolContext, protocols: readonly ProtocolId[]): PlanEntry[] {
  return protocols.map((id) => {
    const ids = protocolById(id).plannedParamSetIds(ctx);
    return { protocolId: id, runs: ids.length, paramSetIds: ids };
  });
}

export type MainDeps = {
  exec?: GitExec;
  repoRoot?: string;
  out?: (line: string) => void;
};

export function main(argv: readonly string[], deps: MainDeps = {}): number {
  const out = deps.out ?? ((l: string) => process.stdout.write(l + "\n"));
  try {
    assertRegistryComplete();
    const o = parseArgs(argv);

    // Mandatory: the scoring module must be byte-identical to implementationSha.
    const idOpts = {
      ...(deps.exec ? { exec: deps.exec } : {}),
      ...(deps.repoRoot ? { repoRoot: deps.repoRoot } : {}),
    };
    const checked = assertScoringModuleMatchesImplementationSha(idOpts);
    out(`identity OK: scoring module matches implementationSha ${checked.sha}`);

    const sha = validationCodeSha(idOpts);
    const dirty = validationTreeDirty(idOpts);
    if (dirty) {
      out("WARNING: validation code has uncommitted changes; validationCodeSha is HEAD and does NOT describe this code.");
      if (!o.dryRun && !o.allowDirty) {
        throw new Error("validation_tree_dirty: commit validation code or pass --allow-dirty");
      }
    }
    const ctx = buildContext(o, sha, (m) => out(m));
    const plan = buildPlan(ctx, o.protocols);

    if (o.dryRun) {
      out(`DRY RUN — validationCodeSha=${sha} seed=${CANONICAL_SEED} out=${o.out}`);
      let total = 0;
      for (const p of plan) {
        total += p.runs;
        out(`  ${p.protocolId}: ${p.runs} run(s) e.g. ${p.paramSetIds.slice(0, 3).join(", ")}${p.runs > 3 ? ", …" : ""}`);
      }
      out(`  total runs: ${total} (no compute performed, nothing written)`);
      return 0;
    }

    let hardFail = false;
    let written = 0;
    for (const id of o.protocols) {
      const def = protocolById(id);
      for (const run of def.run(ctx)) {
        const w = writeRun({ run, ctx });
        written++;
        if (run.hardFail) {
          hardFail = true;
          out(`HARD FAIL ${id}: ${w.runDir}`);
        }
      }
      out(`done ${id}`);
    }
    out(`wrote ${written} run(s) under ${o.out}`);
    if (hardFail) {
      out("BCV-031 HARD FAIL: hidden-path dependence detected.");
      return 1;
    }
    return 0;
  } catch (e) {
    out(`ERROR: ${(e as Error).message}`);
    return 1;
  }
}

export { PROTOCOLS };

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
