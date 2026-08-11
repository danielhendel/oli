#!/usr/bin/env node
/**
 * Deterministic @oli/contracts build gate.
 *
 * Root cause (Stage 1A / 2026-08-10 audit):
 * - Package exports and Node resolution point at lib/contracts/dist (generated, gitignored).
 * - contracts tsconfig is composite + incremental (tsbuildinfo under node_modules/.cache).
 * - `tsc -b` / `tsc -p` can exit 0 while dist is incomplete when tsbuildinfo says "up to date"
 *   but emit files were deleted, interrupted, or never written for a new source module
 *   (reproduced: deleting dist/bodyCompositionGoal.js leaves typecheck green until --force).
 * - CI already ran `npm run -w @oli/contracts build` before checks; local `npm run typecheck`
 *   did not, so stale local dist/tsbuildinfo diverged from CI.
 *
 * This script rebuilds when dist is missing/stale relative to source, forces rebuild when
 * incomplete, then asserts Node can resolve required exports (including bodyCompositionGoal).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONTRACTS_DIR = path.join(ROOT, "lib", "contracts");
const DIST_DIR = path.join(CONTRACTS_DIR, "dist");
const FORCE = process.argv.includes("--force");

function fail(message) {
  console.error(`\n❌ ensure-contracts-built failed:\n${message}\n`);
  process.exit(1);
}

function listContractSourceBasenames() {
  return fs
    .readdirSync(CONTRACTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name.replace(/\.ts$/, ""))
    .filter((base) => base !== "tsconfig" && !base.endsWith(".d"))
    .sort();
}

function missingDistOutputs(bases) {
  const missing = [];
  for (const base of bases) {
    const js = path.join(DIST_DIR, `${base}.js`);
    const dts = path.join(DIST_DIR, `${base}.d.ts`);
    if (!fs.existsSync(js) || !fs.existsSync(dts)) missing.push(base);
  }
  return missing;
}

function isDistStale(bases) {
  if (!fs.existsSync(DIST_DIR)) return true;
  for (const base of bases) {
    const src = path.join(CONTRACTS_DIR, `${base}.ts`);
    const js = path.join(DIST_DIR, `${base}.js`);
    const dts = path.join(DIST_DIR, `${base}.d.ts`);
    if (!fs.existsSync(js) || !fs.existsSync(dts)) return true;
    const srcMtime = fs.statSync(src).mtimeMs;
    if (fs.statSync(js).mtimeMs < srcMtime || fs.statSync(dts).mtimeMs < srcMtime) {
      return true;
    }
  }
  return false;
}

function runContractsBuild({ force }) {
  const args = force
    ? ["tsc", "-b", "tsconfig.json", "--force"]
    : ["tsc", "-b", "tsconfig.json"];
  console.log(`> @oli/contracts build (${args.slice(1).join(" ")})`);
  const result = spawnSync("npx", args, {
    cwd: CONTRACTS_DIR,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertResolvedExports(bases) {
  const stillMissing = missingDistOutputs(bases);
  if (stillMissing.length > 0) {
    fail(
      `contracts dist still missing after build: ${stillMissing.join(", ")}\n` +
        `Expected emit under ${path.relative(ROOT, DIST_DIR)} for every lib/contracts/*.ts source.`,
    );
  }

  const requireFromRoot = createRequire(path.join(ROOT, "package.json"));
  let contractsRoot;
  let bodyGoal;
  try {
    contractsRoot = requireFromRoot("@oli/contracts");
    bodyGoal = requireFromRoot("@oli/contracts/bodyCompositionGoal");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Node could not resolve @oli/contracts from package exports:\n${message}`);
  }

  if (typeof contractsRoot?.bodyCompositionGoalV1Schema?.safeParse !== "function") {
    fail(
      "@oli/contracts root export is missing bodyCompositionGoalV1Schema after build. " +
        "Dependent packages and Jest (via Node package resolution to dist) will fail to load.",
    );
  }
  if (typeof bodyGoal?.bodyCompositionGoalV1Schema?.safeParse !== "function") {
    fail(
      "@oli/contracts/bodyCompositionGoal export is missing bodyCompositionGoalV1Schema after build.",
    );
  }

  const resolvedRoot = requireFromRoot.resolve("@oli/contracts");
  const resolvedGoal = requireFromRoot.resolve("@oli/contracts/bodyCompositionGoal");
  if (!resolvedRoot.includes(`${path.sep}dist${path.sep}`) || !resolvedGoal.includes(`${path.sep}dist${path.sep}`)) {
    fail(
      `Expected @oli/contracts to resolve into lib/contracts/dist, got:\n` +
        `  ${resolvedRoot}\n  ${resolvedGoal}`,
    );
  }

  console.log(
    `✅ @oli/contracts dist complete (${bases.length} modules); bodyCompositionGoal resolves via package exports.`,
  );
}

function main() {
  if (!fs.existsSync(path.join(CONTRACTS_DIR, "tsconfig.json"))) {
    fail(`missing ${path.relative(ROOT, path.join(CONTRACTS_DIR, "tsconfig.json"))}`);
  }

  const bases = listContractSourceBasenames();
  if (bases.length === 0) fail("no lib/contracts/*.ts sources found");
  if (!bases.includes("bodyCompositionGoal")) {
    fail("lib/contracts/bodyCompositionGoal.ts is missing from source — refusing to proceed");
  }
  if (!bases.includes("index")) {
    fail("lib/contracts/index.ts is missing from source — refusing to proceed");
  }

  const incomplete = missingDistOutputs(bases);
  const stale = isDistStale(bases);
  const shouldForce = FORCE || incomplete.length > 0 || stale;

  if (incomplete.length > 0) {
    console.log(
      `contracts dist incomplete (${incomplete.length} missing, e.g. ${incomplete.slice(0, 5).join(", ")}); forcing rebuild`,
    );
  } else if (stale) {
    console.log("contracts dist stale vs source; rebuilding");
  } else if (FORCE) {
    console.log("contracts rebuild forced via --force");
  } else {
    console.log("contracts dist present and fresh; verifying exports");
  }

  runContractsBuild({ force: shouldForce });
  assertResolvedExports(bases);
}

main();
