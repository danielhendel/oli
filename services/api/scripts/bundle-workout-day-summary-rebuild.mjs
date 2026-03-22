import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "../..");
const entry = path.join(__dirname, "workout-day-summary-rebuild.entry.ts");
const outFile = path.join(apiRoot, "src", "lib", "workoutDaySummaryRebuild.bundled.cjs");

fs.mkdirSync(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [entry],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  logLevel: "info",
  alias: {
    "@/lib": path.join(repoRoot, "lib"),
    "@oli/contracts": path.join(repoRoot, "lib/contracts/index.ts"),
  },
  external: ["firebase-admin", "firebase-admin/*"],
});

console.log(`Built ${outFile}`);
