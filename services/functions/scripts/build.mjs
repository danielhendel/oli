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

  // CRITICAL:
  // Do not bundle firebase-functions or firebase-admin into the output bundle.
  // Bundling firebase-functions pulls in its ESM runtime helpers which rely on import.meta.url,
  // and will crash when executed from a CommonJS bundle during Firebase CLI analysis.
  external: [
    "firebase-functions",
    "firebase-functions/*",
    "firebase-admin",
    "firebase-admin/*",
  ],
});

console.log(`Built ${outFile}`);
