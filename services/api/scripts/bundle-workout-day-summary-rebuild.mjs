import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { writeWorkoutSummaryRebuildBundle } from "./workout-summary-rebuild-bundle-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRoot = path.resolve(__dirname, "..");
const outFile = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs");

fs.mkdirSync(path.dirname(outFile), { recursive: true });

await writeWorkoutSummaryRebuildBundle(outFile);

console.log(`Built ${outFile}`);
console.log(
  "Next: npm run -w api bundle:workout-summary-rebuild:checksum (or full `npm run -w api build`, which hashes this artifact automatically).",
);
