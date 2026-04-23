/**
 * Shared esbuild config for the workout summary rebuild bundle (single source for
 * {@link bundle-workout-day-summary-rebuild.mjs} and verify/checksum scripts).
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "../..");
const entry = path.join(__dirname, "workout-day-summary-rebuild.entry.ts");

const shared = {
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  alias: {
    "@/lib": path.join(repoRoot, "lib"),
    "@oli/contracts": path.join(repoRoot, "lib/contracts/index.ts"),
  },
  external: ["firebase-admin", "firebase-admin/*"],
};

/**
 * @param {string} outFile absolute path for on-disk output
 */
export async function writeWorkoutSummaryRebuildBundle(outFile) {
  await build({
    ...shared,
    outfile: outFile,
    logLevel: "info",
  });
}

/** @returns {Promise<Buffer>} */
export async function buildWorkoutSummaryRebuildBundleToBuffer() {
  const result = await build({
    ...shared,
    write: false,
    logLevel: "silent",
  });
  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error("workout_summary_rebuild_bundle: esbuild produced no output");
  }
  return Buffer.from(result.outputFiles[0].contents);
}
