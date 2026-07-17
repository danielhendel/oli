#!/usr/bin/env node
/**
 * Fail-closed guard: Cloud Run-reachable emitted API JavaScript must not retain
 * unresolved TypeScript path aliases (`@/...`).
 *
 * Scans services/api/dist production JS (excludes __tests__ and *.test.js).
 * Reports only file paths and counts — never file contents or env values.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { findUnresolvedRuntimeAliases } = require("./assert-runtime-module-resolution-lib.cjs");

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const distRoot = resolve(apiRoot, "dist");

function main() {
  if (!existsSync(distRoot)) {
    console.error(
      "assert-runtime-module-resolution: missing dist/ — run API build first",
    );
    process.exit(1);
  }
  const hits = findUnresolvedRuntimeAliases(distRoot);
  if (hits.length > 0) {
    console.error(
      `assert-runtime-module-resolution: FAIL — ${hits.length} file(s) retain unresolved @/ runtime alias(es)`,
    );
    for (const h of hits) {
      console.error(`  ${h.file} (${h.count})`);
    }
    process.exit(1);
  }
  console.log(
    "assert-runtime-module-resolution: OK (no unresolved @/ aliases in Cloud Run-reachable emitted JS)",
  );
}

main();
