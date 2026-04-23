import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BUNDLE = "workoutDaySummaryRebuild.bundled.cjs";

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

/**
 * Resolves next to `server.js` (`dist/src` or `src` under ts-node): `lib/workoutDaySummaryRebuild.bundled.cjs`.
 * Fails fast if the file is missing, unreadable, or exports the wrong surface.
 * If `lib/workoutDaySummaryRebuild.bundled.cjs.sha256` exists, verifies SHA-256 (cheap one-time read at startup).
 */
export function assertWorkoutSummaryRebuildBundleReady(serverSrcDir: string): void {
  const bundlePath = path.join(serverSrcDir, "lib", BUNDLE);
  if (!fs.existsSync(bundlePath)) {
    throw new Error(
      `Workout summary rebuild bundle missing at ${bundlePath}. Run \`npm run -w api build\` before start; the build must copy the bundle into dist (see copy-workout-summary-rebuild-bundle-to-dist).`,
    );
  }

  const bytes = fs.readFileSync(bundlePath);
  const checksumPath = path.join(serverSrcDir, "lib", `${BUNDLE}.sha256`);
  const expectedHex = readExpectedChecksumSha256(checksumPath);
  if (expectedHex != null) {
    const actualHex = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actualHex !== expectedHex) {
      throw new Error(
        `Workout summary rebuild bundle checksum mismatch at ${bundlePath}. Expected ${expectedHex}, got ${actualHex}. Rebuild with npm run -w api build and ensure dist copy is in sync.`,
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
