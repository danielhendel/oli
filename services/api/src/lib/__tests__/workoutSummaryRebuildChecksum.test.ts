/**
 * Unit tests for workout-summary rebuild checksum helpers and verifier contract.
 */
import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = require("../../../scripts/workout-summary-rebuild-checksum-lib.cjs") as {
  sha256Hex: (bytes: Buffer | string) => string;
  parseChecksumSidecarText: (text: string) => string | null;
  formatChecksumSidecar: (hex: string) => string;
  hashBundleFile: (bundlePath: string) => { hex: string; byteLength: number };
  writeCanonicalChecksumFromBundle: (
    bundlePath: string,
    checksumPath: string,
  ) => { hex: string; byteLength: number };
  verifyBundleMatchesChecksumFile: (
    bundlePath: string,
    checksumPath: string,
  ) => { ok: true; hex: string } | { ok: false; computed: string; expected: string };
  findAbsolutePathLeaks: (bytes: Buffer) => string[];
};

const SCRIPTS = path.resolve(__dirname, "../../../scripts");

describe("workout-summary-rebuild-checksum-lib", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-ws-checksum-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("hashes deterministically when run twice on the same bytes", () => {
    const payload = Buffer.from('module.exports = { ok: true };\n', "utf8");
    expect(lib.sha256Hex(payload)).toBe(lib.sha256Hex(payload));
    expect(lib.sha256Hex(payload)).toBe(
      crypto.createHash("sha256").update(payload).digest("hex"),
    );
  });

  it("normalizes checksum sidecar newlines and shasum-style suffixes", () => {
    const hex = "a".repeat(64);
    expect(lib.parseChecksumSidecarText(`${hex}\r\n`)).toBe(hex);
    expect(lib.parseChecksumSidecarText(`${hex}  workoutDaySummaryRebuild.bundled.cjs\n`)).toBe(hex);
    expect(lib.formatChecksumSidecar(hex.toUpperCase())).toBe(`${hex}\n`);
  });

  it("changes the checksum when semantic bundle bytes change", () => {
    const a = lib.sha256Hex("module.exports = { v: 1 };\n");
    const b = lib.sha256Hex("module.exports = { v: 2 };\n");
    expect(a).not.toBe(b);
  });

  it("verifier passes on matching output and fails on mismatch", () => {
    const bundlePath = path.join(dir, "bundle.cjs");
    const checksumPath = path.join(dir, "bundle.cjs.sha256");
    fs.writeFileSync(bundlePath, "module.exports = {};\n", "utf8");
    const { hex } = lib.writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
    expect(lib.verifyBundleMatchesChecksumFile(bundlePath, checksumPath)).toEqual({
      ok: true,
      hex,
    });

    fs.writeFileSync(checksumPath, `${"b".repeat(64)}\n`, "utf8");
    const bad = lib.verifyBundleMatchesChecksumFile(bundlePath, checksumPath);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.expected).toBe("b".repeat(64));
      expect(bad.computed).toBe(hex);
    }
  });

  it("writeCanonicalChecksumFromBundle is idempotent for identical bytes", () => {
    const bundlePath = path.join(dir, "bundle.cjs");
    const checksumPath = path.join(dir, "bundle.cjs.sha256");
    fs.writeFileSync(bundlePath, "exports.x = 1;\n", "utf8");
    const first = lib.writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
    const second = lib.writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
    expect(first).toEqual(second);
    expect(fs.readFileSync(checksumPath, "utf8")).toBe(`${first.hex}\n`);
  });

  it("flags absolute developer path leaks in generated output", () => {
    const clean = Buffer.from('module.exports = { path: "relative/only" };\n', "utf8");
    expect(lib.findAbsolutePathLeaks(clean)).toEqual([]);
    const dirty = Buffer.from('const p = "/Users/developer/oli/secret";\n', "utf8");
    expect(lib.findAbsolutePathLeaks(dirty).some((h) => h.includes("/Users/"))).toBe(true);
  });
});

describe("workout-summary rebuild checksum scripts (integration)", () => {
  it("explicit checksum writer updates a file and ordinary verify can fail on mismatch", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oli-ws-script-"));
    try {
      const bundlePath = path.join(dir, "workoutDaySummaryRebuild.bundled.cjs");
      const checksumPath = path.join(dir, "workoutDaySummaryRebuild.bundled.cjs.sha256");
      fs.writeFileSync(bundlePath, "module.exports = { a: 1 };\n", "utf8");
      const { hex } = lib.writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
      expect(fs.readFileSync(checksumPath, "utf8").trim()).toBe(hex);

      fs.writeFileSync(bundlePath, "module.exports = { a: 2 };\n", "utf8");
      const mismatch = lib.verifyBundleMatchesChecksumFile(bundlePath, checksumPath);
      expect(mismatch.ok).toBe(false);

      // Re-run explicit generation — updates expected truth
      const updated = lib.writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
      expect(updated.hex).not.toBe(hex);
      expect(lib.verifyBundleMatchesChecksumFile(bundlePath, checksumPath).ok).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verify script binary exists and requires --canonical for the Linux truth gate", () => {
    const verifyPath = path.join(SCRIPTS, "verify-workout-summary-rebuild-bundle.mjs");
    expect(fs.existsSync(verifyPath)).toBe(true);
    const source = fs.readFileSync(verifyPath, "utf8");
    expect(source).toContain("--canonical");
    expect(source).toContain("process.argv.includes(\"--canonical\")");
    expect(source).not.toContain('process.env.CI === "true"');
  });

  it("api package build script does not invoke the tracked checksum writer", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).not.toContain("write-workout-summary-rebuild-bundle-checksum");
    expect(pkg.scripts.build).toContain("copy-workout-summary-rebuild-bundle-to-dist");
    expect(pkg.scripts["bundle:workout-summary-rebuild:checksum"]).toContain(
      "write-workout-summary-rebuild-bundle-checksum",
    );
  });
});

describe("assertWorkoutSummaryRebuildBundleReady runtime sidecar preference", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { assertWorkoutSummaryRebuildBundleReady } = require("../workoutSummaryRebuildBundleGuard") as {
    assertWorkoutSummaryRebuildBundleReady: (serverSrcDir: string) => void;
  };

  const MINIMAL = `
module.exports = {
  rebuildWorkoutDaySummariesForRange: async () => ({}),
  recomputeWorkoutMonthSummariesForYear: async () => ({}),
  rebuildWorkoutMonthSummariesForMonthRange: async () => ({}),
};
`;

  it("prefers gitignored runtime sidecar over mismatched canonical checksum", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "oli-bundle-guard-runtime-"));
    const libDir = path.join(root, "lib");
    fs.mkdirSync(libDir, { recursive: true });
    const bundlePath = path.join(libDir, "workoutDaySummaryRebuild.bundled.cjs");
    fs.writeFileSync(bundlePath, MINIMAL, "utf8");
    const hex = crypto.createHash("sha256").update(fs.readFileSync(bundlePath)).digest("hex");
    fs.writeFileSync(path.join(libDir, "workoutDaySummaryRebuild.bundled.cjs.sha256"), `${"c".repeat(64)}\n`);
    fs.writeFileSync(
      path.join(libDir, "workoutDaySummaryRebuild.bundled.cjs.runtime.sha256"),
      `${hex}\n`,
    );
    expect(() => assertWorkoutSummaryRebuildBundleReady(root)).not.toThrow();
  });
});
