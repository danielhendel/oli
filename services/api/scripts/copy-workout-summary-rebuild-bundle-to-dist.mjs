/**
 * Copies the esbuild artifact (and checksum, when present) into dist/ so production
 * `require("../lib/workoutDaySummaryRebuild.bundled.cjs")` from dist/src/routes resolves.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");

const srcDir = path.join(apiRoot, "src", "lib");
const destDir = path.join(apiRoot, "dist", "src", "lib");
const bundleName = "workoutDaySummaryRebuild.bundled.cjs";
const checksumName = "workoutDaySummaryRebuild.bundled.cjs.sha256";

const srcBundle = path.join(srcDir, bundleName);
if (!fs.existsSync(srcBundle)) {
  console.error(
    `copy-workout-summary-rebuild-bundle-to-dist: missing ${srcBundle}. Run bundle:workout-summary-rebuild first (via npm run build).`,
  );
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcBundle, path.join(destDir, bundleName));

const srcChecksum = path.join(srcDir, checksumName);
if (!fs.existsSync(srcChecksum)) {
  console.error(
    `copy-workout-summary-rebuild-bundle-to-dist: missing ${srcChecksum}. The API build must run write-workout-summary-rebuild-bundle-checksum after esbuild (see npm run build in services/api/package.json).`,
  );
  process.exit(1);
}
fs.copyFileSync(srcChecksum, path.join(destDir, checksumName));

console.log(`Copied ${bundleName} and ${checksumName} to ${destDir}`);
