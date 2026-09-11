import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BUNDLE = "workoutDaySummaryRebuild.bundled.cjs";
/** Gitignored local-dev sidecar; preferred over the tracked canonical `.sha256` when present. */
const RUNTIME_CHECKSUM = `${BUNDLE}.runtime.sha256`;
const CANONICAL_CHECKSUM = `${BUNDLE}.sha256`;

const EXPECTED_EXPORTS = [
  "rebuildWorkoutDaySummariesForRange",
  "recomputeWorkoutMonthSummariesForYear",
  "rebuildWorkoutMonthSummariesForMonthRange",
] as const;

export type WorkoutSummaryRebuildBundle = {
  rebuildWorkoutDaySummariesForRange: unknown;
  recomputeWorkoutMonthSummariesForYear: unknown;
  rebuildWorkoutMonthSummariesForMonthRange: unknown;
};

function readExpectedChecksumSha256(checksumPath: string): string | null {
  if (!fs.existsSync(checksumPath)) return null;
  const line = fs.readFileSync(checksumPath, "utf8").trim();
  const hex = line.split(/\s+/)[0] ?? "";
  return /^[a-f0-9]{64}$/i.test(hex) ? hex.toLowerCase() : null;
}

function resolveChecksumPath(libDir: string): string | null {
  const runtimePath = path.join(libDir, RUNTIME_CHECKSUM);
  if (fs.existsSync(runtimePath)) return runtimePath;
  const canonicalPath = path.join(libDir, CANONICAL_CHECKSUM);
  if (fs.existsSync(canonicalPath)) return canonicalPath;
  return null;
}

/**
 * Resolves next to `server.js` (`dist/services/api/src` or `src` under ts-node): `lib/workoutDaySummaryRebuild.bundled.cjs`.
 * Fails fast if the file is missing, unreadable, or exports the wrong surface.
 * If a checksum sidecar exists, verifies SHA-256 (cheap one-time read at startup):
 * - prefers gitignored `*.bundled.cjs.runtime.sha256` (local `dev` / platform-local bytes)
 * - else uses tracked/dist `*.bundled.cjs.sha256`
 */
export function assertWorkoutSummaryRebuildBundleReady(serverSrcDir: string): void {
  const bundlePath = path.join(serverSrcDir, "lib", BUNDLE);
  if (!fs.existsSync(bundlePath)) {
    throw new Error(
      `Workout summary rebuild bundle missing at ${bundlePath}. Run \`npm run -w api build\` before start; the build must copy the bundle into dist (see copy-workout-summary-rebuild-bundle-to-dist).`,
    );
  }

  const bytes = fs.readFileSync(bundlePath);
  const checksumPath = resolveChecksumPath(path.join(serverSrcDir, "lib"));
  const expectedHex = checksumPath != null ? readExpectedChecksumSha256(checksumPath) : null;
  if (expectedHex != null) {
    const actualHex = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actualHex !== expectedHex) {
      throw new Error(
        `Workout summary rebuild bundle checksum mismatch at ${bundlePath}. Expected ${expectedHex}, got ${actualHex} (sidecar ${checksumPath}). For local \`dev\`, ensure the gitignored runtime sidecar was written; for production, re-run \`npm run -w api build\` so dist gets a matching runtime sidecar. Do not commit a macOS hash over the Linux canonical fingerprint.`,
      );
    }
  }

  let loaded: WorkoutSummaryRebuildBundle;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate dynamic load of generated CJS
    const mod: unknown = require(bundlePath);
    loaded = mod as WorkoutSummaryRebuildBundle;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Workout summary rebuild bundle failed to load from ${bundlePath}: ${msg}`,
    );
  }

  for (const name of EXPECTED_EXPORTS) {
    if (typeof loaded[name] !== "function") {
      throw new Error(
        `Workout summary rebuild bundle at ${bundlePath} is invalid: missing or non-function export "${name}".`,
      );
    }
  }
}
