/**
 * Synthetic fixture tests for the Cloud Run runtime module-resolution guard.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { findUnresolvedRuntimeAliases } = require("../../../scripts/assert-runtime-module-resolution-lib.cjs");

describe("assert-runtime-module-resolution", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oli-runtime-alias-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("flags CommonJS require(\"@/...\")", () => {
    writeFileSync(join(root, "bad.js"), 'const x = require("@/lib/foo");\n');
    const hits = findUnresolvedRuntimeAliases(root);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.file).toBe("bad.js");
  });

  test("flags require.resolve(\"@/...\")", () => {
    writeFileSync(join(root, "bad.js"), 'require.resolve("@/lib/foo");\n');
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(1);
  });

  test("flags dynamic import(\"@/...\")", () => {
    writeFileSync(join(root, "bad.js"), 'import("@/lib/foo");\n');
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(1);
  });

  test("allows relative require", () => {
    writeFileSync(join(root, "ok.js"), 'require("../../lib/domain/workouts/core");\n');
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(0);
  });

  test("allows npm scoped packages", () => {
    writeFileSync(join(root, "ok.js"), 'require("@oli/contracts");\n');
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(0);
  });

  test("ignores aliases inside block comments", () => {
    writeFileSync(
      join(root, "ok.js"),
      "/* require(\"@/lib/foo\") */\nrequire(\"./relative\");\n",
    );
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(0);
  });

  test("skips __tests__ directories", () => {
    mkdirSync(join(root, "__tests__"), { recursive: true });
    writeFileSync(join(root, "__tests__", "bad.js"), 'require("@/lib/foo");\n');
    writeFileSync(join(root, "ok.js"), 'require("./x");\n');
    expect(findUnresolvedRuntimeAliases(root)).toHaveLength(0);
  });

  test("reports deterministic file ordering", () => {
    writeFileSync(join(root, "z.js"), 'require("@/z");\n');
    writeFileSync(join(root, "a.js"), 'require("@/a");\n');
    const hits = findUnresolvedRuntimeAliases(root);
    expect(hits.map((h: { file: string }) => h.file)).toEqual(["a.js", "z.js"]);
  });
});
