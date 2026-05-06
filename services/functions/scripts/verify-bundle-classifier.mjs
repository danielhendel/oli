/**
 * Fail the Functions build if the esbundle does not include workout classification.
 * Prevents deploying a bundle where @/lib alias broke silently or an old graph was cached.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.join(__dirname, "..", "lib");

const needle = "function classifyWorkoutSportForDailyFactsRollup";
const bundles = ["index.js", "recomputeForDayExport.js"];

let failed = false;
for (const name of bundles) {
  const p = path.join(libDir, name);
  if (!fs.existsSync(p)) {
    console.error(`verify-bundle-classifier: missing ${p}`);
    failed = true;
    continue;
  }
  const body = fs.readFileSync(p, "utf8");
  if (!body.includes(needle)) {
    console.error(
      `verify-bundle-classifier: ${name} does not include workout classification (${needle}). Rebuild may have dropped @/lib/shared/workoutClassification.`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log("verify-bundle-classifier: OK (classifier present in all bundles)");
