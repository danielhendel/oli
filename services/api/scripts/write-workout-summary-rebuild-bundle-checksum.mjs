/**
 * Writes `workoutDaySummaryRebuild.bundled.cjs.sha256` from the **on-disk** bundle bytes.
 * Must run after `bundle-workout-day-summary-rebuild.mjs` so the fingerprint matches the artifact
 * that is copied into `dist/` (Linux Docker vs macOS produce different bundles; checksum must follow the file).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const bundlePath = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs");
const outChecksum = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs.sha256");

if (!fs.existsSync(bundlePath)) {
  console.error(
    `write-workout-summary-rebuild-bundle-checksum: missing ${bundlePath}. Run bundle:workout-summary-rebuild first.`,
  );
  process.exit(1);
}

const bytes = fs.readFileSync(bundlePath);
const hex = crypto.createHash("sha256").update(bytes).digest("hex");

fs.mkdirSync(path.dirname(outChecksum), { recursive: true });
fs.writeFileSync(outChecksum, `${hex}\n`, "utf8");

console.log(`write-workout-summary-rebuild-bundle-checksum: hashed on-disk bundle (${bytes.length} bytes)`);
console.log(`  bundle: ${bundlePath}`);
console.log(`  wrote:  ${outChecksum}`);
console.log(`  sha256: ${hex}`);
