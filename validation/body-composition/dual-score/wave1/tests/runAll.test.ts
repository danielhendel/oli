import { IMPLEMENTATION_SHA } from "../src/constants";
import type { GitExec } from "../src/identity";
import { buildContext, buildPlan, main, parseArgs, SMOKE_MC_PARAMS } from "../src/runAll";

const HEAD = "a".repeat(40);

function fakeGit(over: { diff?: string; untracked?: string; status?: string; hasCommit?: boolean } = {}): GitExec {
  return (args) => {
    switch (args[0]) {
      case "cat-file":
        if (over.hasCommit === false) throw new Error("bad object");
        return "";
      case "diff":
        return over.diff ?? "";
      case "ls-files":
        return over.untracked ?? "";
      case "rev-parse":
        return HEAD + "\n";
      case "status":
        return over.status ?? "";
      default:
        throw new Error(`unexpected git ${args.join(" ")}`);
    }
  };
}

function run(argv: string[], exec: GitExec) {
  const lines: string[] = [];
  const code = main(argv, { exec, repoRoot: "/nonexistent", out: (l) => lines.push(l) });
  return { code, lines };
}

describe("parseArgs", () => {
  it("defaults to all 16 protocols in dependency order", () => {
    const o = parseArgs([]);
    expect(o.protocols).toHaveLength(16);
    expect(o.dryRun).toBe(false);
    expect(o.protocols.at(-1)).toBe("BCV-032A");
  });
  it("parses filters and flags", () => {
    const o = parseArgs(["--dry-run", "--protocols", "bcv-030,BCV-002", "--personas", "P-01,P-02", "--sigmas", "1,2", "--models", "a", "--rhos", "0,0.25", "--smoke-mc", "--plots"]);
    expect(o.dryRun).toBe(true);
    expect(o.protocols).toEqual(["BCV-002", "BCV-030"]);
    expect(o.personas).toEqual(["P-01", "P-02"]);
    expect(o.sigmas).toEqual([1, 2]);
    expect(o.models).toEqual(["A"]);
    expect(o.rhos).toEqual([0, 0.25]);
    expect(o.smokeMc && o.plots).toBe(true);
  });
  it("rejects unknown options/protocols/models", () => {
    expect(() => parseArgs(["--nope"])).toThrow();
    expect(() => parseArgs(["--protocols", "BCV-999"])).toThrow();
    expect(() => parseArgs(["--models", "C"])).toThrow();
  });
  it("buildContext/buildPlan reflect the options", () => {
    const o = parseArgs(["--protocols", "BCV-030", "--personas", "P-01", "--sigmas", "1", "--smoke-mc"]);
    const c = buildContext(o, HEAD, () => undefined);
    expect(c.validationCodeShaShort8).toBe("aaaaaaaa");
    expect(c.mcParams).toEqual(SMOKE_MC_PARAMS);
    expect(buildPlan(c, o.protocols)[0]!.runs).toBe(8);
  });
});

describe("main --dry-run", () => {
  it("asserts identity, prints the plan, computes nothing", () => {
    const { code, lines } = run(["--dry-run"], fakeGit());
    expect(code).toBe(0);
    expect(lines[0]).toContain(`identity OK`);
    expect(lines[0]).toContain(IMPLEMENTATION_SHA);
    const text = lines.join("\n");
    expect(text).toMatch(/BCV-030: 384 run\(s\)/);
    expect(text).toMatch(/total runs: 1166/);
    expect(text).toMatch(/nothing written/);
  });
  it("fails (exit 1) when the scoring module differs from implementationSha", () => {
    const { code, lines } = run(["--dry-run"], fakeGit({ diff: "lib/data/body/evidence/scoring/transforms.ts\n" }));
    expect(code).toBe(1);
    expect(lines.join("\n")).toMatch(/scoring_module_differs_from_implementationSha/);
  });
  it("fails when the implementation commit is missing", () => {
    expect(run(["--dry-run"], fakeGit({ hasCommit: false })).code).toBe(1);
  });
  it("warns on a dirty validation tree in dry-run but refuses a real run without --allow-dirty", () => {
    const dirty = fakeGit({ status: " M validation/x.ts\n" });
    const dry = run(["--dry-run"], dirty);
    expect(dry.code).toBe(0);
    expect(dry.lines.join("\n")).toMatch(/WARNING/);
    const real = run(["--protocols", "BCV-013", "--out", "/nonexistent-out-dir-never-created"], dirty);
    expect(real.code).toBe(1);
    expect(real.lines.join("\n")).toMatch(/validation_tree_dirty/);
  });
});
