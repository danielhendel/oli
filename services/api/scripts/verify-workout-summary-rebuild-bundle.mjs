/**
 * Verifies that the bundled CJS on disk matches its sidecar `.sha256`.
 * Prefers `dist/` (post-`npm run build`) so CI checks the same artifact layout as Cloud Run;
 * falls back to `src/lib/` when dist is absent (e.g. partial local workflow).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");

const bundleName = "workoutDaySummaryRebuild.bundled.cjs";
const checksumName = "workoutDaySummaryRebuild.bundled.cjs.sha256";

const distBundle = path.join(apiRoot, "dist", "services", "api", "src", "lib", bundleName);
const distChecksum = path.join(apiRoot, "dist", "services", "api", "src", "lib", checksumName);
const srcBundle = path.join(apiRoot, "src", "lib", bundleName);
const srcChecksum = path.join(apiRoot, "src", "lib", checksumName);

let bundlePath;
let checksumPath;
if (fs.existsSync(distBundle) && fs.existsSync(distChecksum)) {
  bundlePath = distBundle;
  checksumPath = distChecksum;
} else if (fs.existsSync(srcBundle) && fs.existsSync(srcChecksum)) {
  bundlePath = srcBundle;
  checksumPath = srcChecksum;
} else {
  console.error(
    "verify-workout-summary-rebuild-bundle: expected dist/services/api/src/lib or src/lib to contain both bundle and .sha256.",
  );
  console.error(`  tried dist: ${distBundle}`);
  console.error(`  tried src: ${srcBundle}`);
  process.exit(1);
}

const expectedLine = fs.readFileSync(checksumPath, "utf8").trim();
const expected = expectedLine.split(/\s+/)[0];
if (!/^[a-f0-9]{64}$/i.test(expected)) {
  console.error(`verify-workout-summary-rebuild-bundle: invalid checksum line in ${checksumPath}`);
  process.exit(1);
}

const bytes = fs.readFileSync(bundlePath);
const actual = crypto.createHash("sha256").update(bytes).digest("hex");

if (actual !== expected.toLowerCase()) {
  console.error("verify-workout-summary-rebuild-bundle: SHA-256 mismatch (bundle bytes vs sidecar file)");
  console.error(`  bundle:   ${bundlePath}`);
  console.error(`  checksum: ${checksumPath}`);
  console.error(`  computed: ${actual}`);
  console.error(`  expected: ${expected.toLowerCase()}`);
  console.error("  Run a full API build: npm run -w api build");
  process.exit(1);
}

console.log(`verify-workout-summary-rebuild-bundle: OK (${bundlePath})`);
