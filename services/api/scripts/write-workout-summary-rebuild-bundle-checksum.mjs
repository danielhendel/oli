/**
 * Explicitly updates the **tracked** canonical checksum from the on-disk bundle.
 *
 * Ordinary `npm run -w api build` does **not** run this. Use only when intentionally
 * refreshing committed truth (prefer Linux/CI — macOS esbuild output can differ).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BUNDLE_NAME,
  CHECKSUM_NAME,
  writeCanonicalChecksumFromBundle,
} = require("./workout-summary-rebuild-checksum-lib.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const bundlePath = path.join(apiRoot, "src", "lib", BUNDLE_NAME);
const outChecksum = path.join(apiRoot, "src", "lib", CHECKSUM_NAME);

if (!fs.existsSync(bundlePath)) {
  console.error(
    `write-workout-summary-rebuild-bundle-checksum: missing ${bundlePath}. Run bundle:workout-summary-rebuild first.`,
  );
  process.exit(1);
}

const { hex, byteLength } = writeCanonicalChecksumFromBundle(bundlePath, outChecksum);

console.log(`write-workout-summary-rebuild-bundle-checksum: wrote tracked canonical checksum`);
console.log(`  bundle: ${bundlePath}`);
console.log(`  wrote:  ${outChecksum}`);
console.log(`  bytes:  ${byteLength}`);
console.log(`  sha256: ${hex}`);
console.log(
  "  Note: macOS vs Linux esbuild output may differ. Commit this file from Linux/CI when refreshing canonical truth.",
);
