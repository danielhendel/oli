#!/usr/bin/env node
/**
 * Load the emitted Timeline normalizer under Node (same layout as Cloud Run).
 * No network, secrets, or server listen — module-resolution proof only.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const normalizeDayJs = join(
  apiRoot,
  "dist/services/api/src/lib/timeline/normalizeDay.js",
);

if (!existsSync(normalizeDayJs)) {
  console.error(
    "smoke-emitted-timeline-normalize: missing emitted normalizeDay.js — run API build first",
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  require(normalizeDayJs);
  console.log("smoke-emitted-timeline-normalize: OK");
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "ERROR";
  console.error(`smoke-emitted-timeline-normalize: FAIL (${code})`);
  process.exit(1);
}
