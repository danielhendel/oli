/**
 * Verifies that a fresh esbuild of the workout summary rebuild bundle matches the
 * committed SHA-256 checksum. Does not rely on an on-disk `.bundled.cjs` artifact.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkoutSummaryRebuildBundleToBuffer } from "./workout-summary-rebuild-bundle-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const checksumFile = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs.sha256");

if (!fs.existsSync(checksumFile)) {
  console.error(`verify-workout-summary-rebuild-bundle: missing ${checksumFile}`);
  process.exit(1);
}

const expectedLine = fs.readFileSync(checksumFile, "utf8").trim();
const expected = expectedLine.split(/\s+/)[0];
if (!/^[a-f0-9]{64}$/i.test(expected)) {
  console.error(`verify-workout-summary-rebuild-bundle: invalid checksum line in ${checksumFile}`);
  process.exit(1);
}

const buf = await buildWorkoutSummaryRebuildBundleToBuffer();
const actual = crypto.createHash("sha256").update(buf).digest("hex");

if (actual !== expected.toLowerCase()) {
  console.error("verify-workout-summary-rebuild-bundle: SHA-256 mismatch");
  console.error(`  computed: ${actual}`);
  console.error(`  expected: ${expected.toLowerCase()}`);
  console.error("  Run: npm run -w api bundle:workout-summary-rebuild:checksum");
  process.exit(1);
}

console.log("verify-workout-summary-rebuild-bundle: OK");
