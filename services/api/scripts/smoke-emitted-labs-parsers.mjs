#!/usr/bin/env node
/**
 * Load the emitted Labs document parser registry under Node (same layout as Cloud Run).
 * Catches relative-contract require breakages that only surface at process boot.
 * No network, secrets, or server listen — module-resolution proof only.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const documentParsersJs = join(
  apiRoot,
  "dist/services/api/src/lib/documents/documentParsers.js",
);

if (!existsSync(documentParsersJs)) {
  console.error(
    "smoke-emitted-labs-parsers: missing emitted documentParsers.js — run API build first",
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  require(documentParsersJs);
  console.log("smoke-emitted-labs-parsers: OK");
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "ERROR";
  const message = err instanceof Error ? err.message : String(err);
  // Never print PDF/path payloads — module id + code only.
  console.error(`smoke-emitted-labs-parsers: FAIL (${code}) ${message.split("\n")[0]}`);
  process.exit(1);
}
