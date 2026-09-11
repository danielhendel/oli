/**
 * Verifies workout-summary rebuild bundle integrity.
 *
 * Default (local + first CI step):
 *   Prefer dist/ (post-build / Cloud Run layout); fall back to src/lib.
 *   Confirm the on-disk bundle bytes match the sidecar next to that bundle.
 *
 * With --canonical (CI canonical step):
 *   Also confirm the built bundle hash matches the **tracked** canonical
 *   `src/lib/*.sha256`. Ordinary local builds do not rewrite that file;
 *   macOS esbuild output may differ from Linux, so do not rely on CI=true alone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BUNDLE_NAME,
  CHECKSUM_NAME,
  hashBundleFile,
  parseChecksumSidecarText,
  verifyBundleMatchesChecksumFile,
} = require("./workout-summary-rebuild-checksum-lib.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");

const wantCanonical = process.argv.includes("--canonical");

const distBundle = path.join(apiRoot, "dist", "services", "api", "src", "lib", BUNDLE_NAME);
const distChecksum = path.join(apiRoot, "dist", "services", "api", "src", "lib", CHECKSUM_NAME);
const srcBundle = path.join(apiRoot, "src", "lib", BUNDLE_NAME);
const srcChecksum = path.join(apiRoot, "src", "lib", CHECKSUM_NAME);

let bundlePath;
let checksumPath;
if (fs.existsSync(distBundle) && fs.existsSync(distChecksum)) {
  bundlePath = distBundle;
  checksumPath = distChecksum;
} else if (fs.existsSync(srcBundle) && fs.existsSync(srcChecksum)) {
  bundlePath = srcBundle;
  checksumPath = srcChecksum;
} else if (fs.existsSync(distBundle)) {
  console.error(
    "verify-workout-summary-rebuild-bundle: dist bundle exists but runtime sidecar .sha256 is missing.",
  );
  console.error(`  bundle: ${distBundle}`);
  console.error("  Re-run: npm run -w api build (copy step writes the runtime sidecar).");
  process.exit(1);
} else {
  console.error(
    "verify-workout-summary-rebuild-bundle: expected dist/services/api/src/lib (bundle + runtime .sha256) or src/lib (bundle + checksum).",
  );
  console.error(`  tried dist: ${distBundle}`);
  console.error(`  tried src: ${srcBundle}`);
  process.exit(1);
}

let result;
try {
  result = verifyBundleMatchesChecksumFile(bundlePath, checksumPath);
} catch (e) {
  console.error(`verify-workout-summary-rebuild-bundle: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

if (!result.ok) {
  console.error("verify-workout-summary-rebuild-bundle: SHA-256 mismatch (bundle bytes vs sidecar file)");
  console.error(`  bundle:   ${bundlePath}`);
  console.error(`  checksum: ${checksumPath}`);
  console.error(`  computed: ${result.computed}`);
  console.error(`  expected: ${result.expected}`);
  console.error("  Run a full API build: npm run -w api build");
  process.exit(1);
}

console.log(`verify-workout-summary-rebuild-bundle: OK sidecar match (${bundlePath})`);

if (wantCanonical) {
  if (!fs.existsSync(srcChecksum)) {
    console.error(
      `verify-workout-summary-rebuild-bundle: canonical check requested but missing tracked ${srcChecksum}`,
    );
    process.exit(1);
  }
  const canonical = parseChecksumSidecarText(fs.readFileSync(srcChecksum, "utf8"));
  if (canonical == null) {
    console.error(`verify-workout-summary-rebuild-bundle: invalid tracked canonical checksum at ${srcChecksum}`);
    process.exit(1);
  }
  const { hex: actual } = hashBundleFile(bundlePath);
  if (actual !== canonical) {
    console.error(
      "verify-workout-summary-rebuild-bundle: CANONICAL mismatch (built bundle vs tracked src checksum)",
    );
    console.error(`  bundle:    ${bundlePath}`);
    console.error(`  canonical: ${srcChecksum}`);
    console.error(`  computed:  ${actual}`);
    console.error(`  expected:  ${canonical}`);
    console.error(
      "  Refresh on Linux/CI after changing bundled sources:",
    );
    console.error("    npm run -w api bundle:workout-summary-rebuild");
    console.error("    npm run -w api bundle:workout-summary-rebuild:checksum");
    console.error("    git add services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256");
    process.exit(1);
  }
  console.log(`verify-workout-summary-rebuild-bundle: OK canonical match (${srcChecksum})`);
}
