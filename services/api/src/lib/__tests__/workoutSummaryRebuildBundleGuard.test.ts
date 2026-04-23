import { describe, expect, it } from "@jest/globals";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertWorkoutSummaryRebuildBundleReady } from "../workoutSummaryRebuildBundleGuard";

const MINIMAL_BUNDLE_SRC = `
module.exports = {
  rebuildWorkoutDaySummariesForRange: async () => ({}),
  recomputeWorkoutMonthSummariesForYear: async () => ({}),
  rebuildWorkoutMonthSummariesForMonthRange: async () => ({}),
};
`;

describe("assertWorkoutSummaryRebuildBundleReady", () => {
  it("throws when bundle file is absent", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-bundle-guard-a-"));
    expect(() => assertWorkoutSummaryRebuildBundleReady(dir)).toThrow(/Workout summary rebuild bundle missing/);
  });

  it("loads a minimal bundle and verifies checksum when present", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-bundle-guard-b-"));
    const lib = path.join(dir, "lib");
    fs.mkdirSync(lib, { recursive: true });
    const bundlePath = path.join(lib, "workoutDaySummaryRebuild.bundled.cjs");
    fs.writeFileSync(bundlePath, MINIMAL_BUNDLE_SRC, "utf8");
    const hex = crypto.createHash("sha256").update(fs.readFileSync(bundlePath)).digest("hex");
    fs.writeFileSync(path.join(lib, "workoutDaySummaryRebuild.bundled.cjs.sha256"), `${hex}\n`);
    expect(() => assertWorkoutSummaryRebuildBundleReady(dir)).not.toThrow();
  });

  it("throws when checksum does not match file bytes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-bundle-guard-c-"));
    const lib = path.join(dir, "lib");
    fs.mkdirSync(lib, { recursive: true });
    const bundlePath = path.join(lib, "workoutDaySummaryRebuild.bundled.cjs");
    fs.writeFileSync(bundlePath, MINIMAL_BUNDLE_SRC, "utf8");
    fs.writeFileSync(
      path.join(lib, "workoutDaySummaryRebuild.bundled.cjs.sha256"),
      `${"a".repeat(64)}\n`,
    );
    expect(() => assertWorkoutSummaryRebuildBundleReady(dir)).toThrow(/checksum mismatch/);
  });

  it("throws when bundle exports are missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-bundle-guard-d-"));
    const lib = path.join(dir, "lib");
    fs.mkdirSync(lib, { recursive: true });
    fs.writeFileSync(path.join(lib, "workoutDaySummaryRebuild.bundled.cjs"), "module.exports = {};\n", "utf8");
    expect(() => assertWorkoutSummaryRebuildBundleReady(dir)).toThrow(/missing or non-function export/);
  });
});
