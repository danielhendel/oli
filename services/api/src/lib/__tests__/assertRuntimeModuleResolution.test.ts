/**
 * Synthetic fixture tests for the Cloud Run runtime module-resolution guard.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SCRIPT = join(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "assert-runtime-module-resolution.mjs",
);

async function loadFinder() {
  const mod = await import(SCRIPT);
  return mod.findUnresolvedRuntimeAliases as (root?: string) => {
    file: string;
    count: number;
  }[];
}

describe("assert-runtime-module-resolution", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oli-runtime-alias-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("flags CommonJS require(\"@/...\")", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "bad.js"), 'const x = require("@/lib/foo");\n');
    const hits = find(root);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.file).toBe("bad.js");
  });

  test("flags require.resolve(\"@/...\")", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "bad.js"), 'require.resolve("@/lib/foo");\n');
    expect(find(root)).toHaveLength(1);
  });

  test("flags dynamic import(\"@/...\")", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "bad.js"), 'import("@/lib/foo");\n');
    expect(find(root)).toHaveLength(1);
  });

  test("allows relative require", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "ok.js"), 'require("../../lib/domain/workouts/core");\n');
    expect(find(root)).toHaveLength(0);
  });

  test("allows npm scoped packages", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "ok.js"), 'require("@oli/contracts");\n');
    expect(find(root)).toHaveLength(0);
  });

  test("ignores aliases inside block comments", async () => {
    const find = await loadFinder();
    writeFileSync(
      join(root, "ok.js"),
      "/* require(\"@/lib/foo\") */\nrequire(\"./relative\");\n",
    );
    expect(find(root)).toHaveLength(0);
  });

  test("skips __tests__ directories", async () => {
    const find = await loadFinder();
    mkdirSync(join(root, "__tests__"), { recursive: true });
    writeFileSync(join(root, "__tests__", "bad.js"), 'require("@/lib/foo");\n');
    writeFileSync(join(root, "ok.js"), 'require("./x");\n');
    expect(find(root)).toHaveLength(0);
  });

  test("reports deterministic file ordering", async () => {
    const find = await loadFinder();
    writeFileSync(join(root, "z.js"), 'require("@/z");\n');
    writeFileSync(join(root, "a.js"), 'require("@/a");\n');
    const hits = find(root);
    expect(hits.map((h) => h.file)).toEqual(["a.js", "z.js"]);
  });
});
