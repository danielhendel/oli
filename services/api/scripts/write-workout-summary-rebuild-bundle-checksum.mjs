/**
 * Writes `workoutDaySummaryRebuild.bundled.cjs.sha256` from current sources.
 * Run after changing any code that affects the rebuild bundle entry graph.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkoutSummaryRebuildBundleToBuffer } from "./workout-summary-rebuild-bundle-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const outChecksum = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs.sha256");

const buf = await buildWorkoutSummaryRebuildBundleToBuffer();
const hex = crypto.createHash("sha256").update(buf).digest("hex");

fs.mkdirSync(path.dirname(outChecksum), { recursive: true });
fs.writeFileSync(outChecksum, `${hex}\n`, "utf8");

console.log(`Wrote ${outChecksum}`);
console.log(hex);
