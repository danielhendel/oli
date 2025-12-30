import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const entry = path.join(projectRoot, "src", "index.ts");
const outFile = path.join(projectRoot, "lib", "index.js");

fs.mkdirSync(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [entry],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
  // IMPORTANT: bundle workspace packages too (default behavior).
  // If you have native deps you must externalize them, but you likely don't here.
});

console.log(`Built ${outFile}`);
