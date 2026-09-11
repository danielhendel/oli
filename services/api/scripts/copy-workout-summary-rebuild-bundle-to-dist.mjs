/**
 * Copies the esbuild artifact into dist/ and writes a **runtime** sidecar checksum
 * beside the dist bundle from the copied bytes.
 *
 * Does **not** modify the tracked `src/lib/*.sha256` canonical fingerprint.
 * Runtime integrity (Cloud Run / `node dist/...`) uses the dist sidecar.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BUNDLE_NAME,
  CHECKSUM_NAME,
  writeRuntimeChecksumBesideBundle,
} = require("./workout-summary-rebuild-checksum-lib.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");

const srcDir = path.join(apiRoot, "src", "lib");
const destDir = path.join(apiRoot, "dist", "services", "api", "src", "lib");

const srcBundle = path.join(srcDir, BUNDLE_NAME);
if (!fs.existsSync(srcBundle)) {
  console.error(
    `copy-workout-summary-rebuild-bundle-to-dist: missing ${srcBundle}. Run bundle:workout-summary-rebuild first (via npm run build).`,
  );
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
const destBundle = path.join(destDir, BUNDLE_NAME);
const destChecksum = path.join(destDir, CHECKSUM_NAME);
fs.copyFileSync(srcBundle, destBundle);

const { hex, byteLength } = writeRuntimeChecksumBesideBundle(destBundle, destChecksum);

console.log(`Copied ${BUNDLE_NAME} to ${destDir}`);
console.log(`Wrote runtime ${CHECKSUM_NAME} beside dist bundle (${byteLength} bytes, sha256 ${hex})`);
console.log(`Tracked src canonical checksum was not modified.`);
