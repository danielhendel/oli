/**
 * Writes a **gitignored** runtime sidecar next to the src bundle for local `dev` /
 * ts-node. Does not modify the tracked canonical `.sha256`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BUNDLE_NAME,
  writeRuntimeChecksumBesideBundle,
} = require("./workout-summary-rebuild-checksum-lib.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const bundlePath = path.join(apiRoot, "src", "lib", BUNDLE_NAME);
const outChecksum = path.join(apiRoot, "src", "lib", `${BUNDLE_NAME}.runtime.sha256`);

if (!fs.existsSync(bundlePath)) {
  console.error(
    `write-workout-summary-rebuild-bundle-runtime-checksum: missing ${bundlePath}. Run bundle:workout-summary-rebuild first.`,
  );
  process.exit(1);
}

const { hex, byteLength } = writeRuntimeChecksumBesideBundle(bundlePath, outChecksum);
console.log(
  `write-workout-summary-rebuild-bundle-runtime-checksum: wrote gitignored runtime sidecar (${byteLength} bytes)`,
);
console.log(`  bundle: ${bundlePath}`);
console.log(`  wrote:  ${outChecksum}`);
console.log(`  sha256: ${hex}`);
