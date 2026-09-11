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
  "Ordinary `npm run -w api build` copies this artifact to dist/ and writes a runtime sidecar there (tracked src .sha256 is unchanged).",
);
console.log(
  "To refresh the tracked canonical checksum intentionally: npm run -w api bundle:workout-summary-rebuild:checksum (prefer Linux/CI).",
);