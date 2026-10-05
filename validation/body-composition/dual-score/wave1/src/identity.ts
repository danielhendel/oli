/**
 * Frozen identity, runId and DOB conventions (plan §23.1, §23.9).
 *
 * RUN ID
 *   runId = `${protocolId}__${validationCodeShaShort8}__s${seed}__${paramSetId}`
 *   `createdAtUtc` MUST NOT appear in runId.
 *
 * DOB
 *   For completed age N at asOf 2026-10-04: dateOfBirth = `${2026 - N}-10-04`
 *   (e.g. age 30 → 1996-10-04).
 */

import { execFileSync } from "child_process";
import * as path from "path";

import {
  AS_OF_MONTH_DAY,
  AS_OF_YEAR,
  CANONICAL_SEED,
  HEALTH_ENGINE_VERSION,
  IMPLEMENTATION_SHA,
  MATHEMATICAL_FREEZE_SHA,
  PERF_ENGINE_VERSION,
  VALIDATION_PLAN_SHA,
  WAVE1_PROTOCOL_IDS,
} from "./constants";
import type { ProtocolId } from "./constants";

export const FROZEN_IDENTITY = {
  implementationSha: IMPLEMENTATION_SHA,
  mathematicalFreezeSha: MATHEMATICAL_FREEZE_SHA,
  validationPlanSha: VALIDATION_PLAN_SHA,
  engineVersions: [HEALTH_ENGINE_VERSION, PERF_ENGINE_VERSION],
  canonicalSeed: CANONICAL_SEED,
} as const;

/** Files / directories whose content must equal `implementationSha`. */
export const GUARDED_PATHS: readonly string[] = [
  "lib/data/body/evidence/scoring",
  "lib/data/body/evidence/resolver",
  "lib/data/body/evidence/formulas.ts",
  "lib/data/body/evidence/metricRegistry.ts",
  "lib/contracts/bodyCompositionScores.ts",
  "lib/contracts/bodyCompositionEvidence.ts",
  "lib/contracts/bodyCompositionEvidenceResolver.ts",
];

export class ScoringIdentityError extends Error {
  readonly differing: string[];
  constructor(message: string, differing: string[] = []) {
    super(message);
    this.name = "ScoringIdentityError";
    this.differing = differing;
  }
}

export type GitExec = (args: string[], cwd: string) => string;

export const defaultGitExec: GitExec = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Repo root = five levels above `src/` (…/validation/body-composition/dual-score/wave1/src). */
export function defaultRepoRoot(): string {
  return path.resolve(__dirname, "..", "..", "..", "..", "..");
}

/**
 * Throw unless every guarded path matches `implementationSha`:
 *  - `git diff --name-only <sha> -- <paths>` must be empty (index + working tree vs sha)
 *  - no untracked files under guarded paths
 *  - the SHA commit must exist in the repository
 */
export function assertScoringModuleMatchesImplementationSha(
  opts: { repoRoot?: string; exec?: GitExec; sha?: string; paths?: readonly string[] } = {},
): { sha: string; checkedPaths: readonly string[] } {
  const repoRoot = opts.repoRoot ?? defaultRepoRoot();
  const exec = opts.exec ?? defaultGitExec;
  const sha = opts.sha ?? IMPLEMENTATION_SHA;
  const paths = opts.paths ?? GUARDED_PATHS;

  try {
    exec(["cat-file", "-e", `${sha}^{commit}`], repoRoot);
  } catch {
    throw new ScoringIdentityError(`implementationSha_not_found_in_repo:${sha}`);
  }

  let diff: string;
  try {
    diff = exec(["diff", "--name-only", sha, "--", ...paths], repoRoot);
  } catch (e) {
    throw new ScoringIdentityError(`git_diff_failed:${(e as Error).message}`);
  }
  let untracked: string;
  try {
    untracked = exec(["ls-files", "--others", "--exclude-standard", "--", ...paths], repoRoot);
  } catch (e) {
    throw new ScoringIdentityError(`git_ls_files_failed:${(e as Error).message}`);
  }
  const differing = [...diff.split("\n"), ...untracked.split("\n")]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (differing.length > 0) {
    throw new ScoringIdentityError(
      `scoring_module_differs_from_implementationSha:${sha}:${differing.join(",")}`,
      differing,
    );
  }
  return { sha, checkedPaths: paths };
}

/** Current validation code SHA (HEAD). */
export function validationCodeSha(opts: { repoRoot?: string; exec?: GitExec } = {}): string {
  const out = (opts.exec ?? defaultGitExec)(["rev-parse", "HEAD"], opts.repoRoot ?? defaultRepoRoot());
  const sha = out.trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`validation_code_sha_invalid:${sha}`);
  return sha;
}

export function shortSha8(sha: string): string {
  if (!/^[0-9a-f]{8,40}$/.test(sha)) throw new Error(`sha_invalid:${sha}`);
  return sha.slice(0, 8);
}

/** Whether validation code has uncommitted changes (informational; goes in manifest notes). */
export function validationTreeDirty(opts: { repoRoot?: string; exec?: GitExec } = {}): boolean {
  const out = (opts.exec ?? defaultGitExec)(
    ["status", "--porcelain", "--", "validation/body-composition/dual-score/wave1"],
    opts.repoRoot ?? defaultRepoRoot(),
  );
  return out.trim().length > 0;
}

/* ---------------- runId ---------------- */

export const PARAM_SET_ID_PATTERN = /^[A-Za-z0-9_]+$/;

export function makeRunId(args: {
  protocolId: string;
  validationCodeShaShort8: string;
  seed: number;
  paramSetId: string;
}): string {
  if (!/^[0-9a-f]{8}$/.test(args.validationCodeShaShort8)) {
    throw new Error(`validationCodeShaShort8_invalid:${args.validationCodeShaShort8}`);
  }
  if (!PARAM_SET_ID_PATTERN.test(args.paramSetId)) {
    throw new Error(`paramSetId_invalid:${args.paramSetId}`);
  }
  if (!Number.isInteger(args.seed) || args.seed < 0) throw new Error(`seed_invalid:${args.seed}`);
  return `${args.protocolId}__${args.validationCodeShaShort8}__s${args.seed}__${args.paramSetId}`;
}

export const RUN_ID_REGEX = /^(BCV-\d{3}[A-Z]?)__([0-9a-f]{8})__s(\d+)__([A-Za-z0-9_]+)$/;

export function parseRunId(runId: string): {
  protocolId: ProtocolId;
  validationCodeShaShort8: string;
  seed: number;
  paramSetId: string;
} | null {
  const m = RUN_ID_REGEX.exec(runId);
  if (!m) return null;
  const protocolId = m[1] as ProtocolId;
  if (!WAVE1_PROTOCOL_IDS.includes(protocolId)) return null;
  return {
    protocolId,
    validationCodeShaShort8: m[2] as string,
    seed: Number(m[3]),
    paramSetId: m[4] as string,
  };
}

/* ---------------- paramSetId builders ---------------- */

export function sigmaLabel(multiplier: number): string {
  return `sig${String(multiplier).replace(".", "p")}`;
}

export function rhoLabel(rho: number): string {
  if (rho === 0) return "rho0";
  const a = String(Math.abs(rho)).replace(".", "p");
  return rho < 0 ? `rhoN${a}` : `rhoP${a}`;
}

/** e.g. `p01_sig1_modelA`, `p01_sig1_modelB_rho0`. */
export function noiseParamSetId(args: {
  personaId: string;
  sigmaMultiplier: number;
  model: "A" | "B";
  rho: number | null;
}): string {
  const pp = `p${String(Number(args.personaId.slice(2))).padStart(2, "0")}`;
  const base = `${pp}_${sigmaLabel(args.sigmaMultiplier)}`;
  if (args.model === "A") return `${base}_modelA`;
  if (args.rho == null) throw new Error("rho_required_for_model_B");
  return `${base}_modelB_${rhoLabel(args.rho)}`;
}

/* ---------------- DOB ---------------- */

export function dobForCompletedAge(ageYears: number): string {
  if (!Number.isInteger(ageYears) || ageYears < 0 || ageYears > 150) {
    throw new Error(`age_invalid:${ageYears}`);
  }
  return `${AS_OF_YEAR - ageYears}-${AS_OF_MONTH_DAY}`;
}
