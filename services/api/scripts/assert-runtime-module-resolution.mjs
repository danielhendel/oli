#!/usr/bin/env node
/**
 * Fail-closed guard: Cloud Run-reachable emitted API JavaScript must not retain
 * unresolved TypeScript path aliases (`@/...`).
 *
 * Scans services/api/dist production JS (excludes __tests__ and *.test.js).
 * Reports only file paths and counts — never file contents or env values.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const apiRoot = resolve(__dirname, "..");
const distRoot = resolve(apiRoot, "dist");

/** Match require("@/..."), require.resolve("@/..."), import("@/...") */
const UNRESOLVED_ALIAS_RE =
  /(?:require\.resolve|require|import)\(\s*(['"])@\/[^'"]*\1\s*\)/g;

function shouldScan(filePath) {
  const parts = filePath.split(/[/\\]/);
  if (parts.includes("__tests__")) return false;
  if (filePath.endsWith(".test.js") || filePath.endsWith(".spec.js")) return false;
  if (filePath.endsWith(".js.map")) return false;
  return filePath.endsWith(".js");
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (shouldScan(full)) out.push(full);
  }
  return out;
}

export function findUnresolvedRuntimeAliases(root = distRoot) {
  const files = walk(root).sort((a, b) => a.localeCompare(b));
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    // Strip block and line comments to reduce source-map / comment false positives.
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const matches = stripped.match(UNRESOLVED_ALIAS_RE);
    if (matches && matches.length > 0) {
      hits.push({
        file: relative(root, file) || file,
        count: matches.length,
      });
    }
  }
  return hits;
}

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

const isDirect =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main();
}
