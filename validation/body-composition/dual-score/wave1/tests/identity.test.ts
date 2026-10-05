import {
  GUARDED_PATHS,
  ScoringIdentityError,
  assertScoringModuleMatchesImplementationSha,
  dobForCompletedAge,
  makeRunId,
  noiseParamSetId,
  parseRunId,
  rhoLabel,
  shortSha8,
  sigmaLabel,
  validationCodeSha,
} from "../src/identity";
import type { GitExec } from "../src/identity";
import { IMPLEMENTATION_SHA, MATHEMATICAL_FREEZE_SHA, VALIDATION_PLAN_SHA, AS_OF } from "../src/constants";

describe("frozen identity", () => {
  it("pins", () => {
    expect(IMPLEMENTATION_SHA).toBe("d940b1616b341e98b19e82f2cd6a6242dfe41691");
    expect(MATHEMATICAL_FREEZE_SHA).toBe("e258267d109d1d05e20270f205e5fdb29ae2aca6");
    expect(VALIDATION_PLAN_SHA).toBe("4900f6e56f1eb83799513452cc4b5d2dcc20601d");
    expect(AS_OF).toBe("2026-10-04T12:00:00.000Z");
  });
});

describe("scoring identity assertion (injected git)", () => {
  const ok: GitExec = () => "";
  it("passes when no guarded path differs and nothing is untracked", () => {
    expect(assertScoringModuleMatchesImplementationSha({ exec: ok }).sha).toBe(IMPLEMENTATION_SHA);
  });
  it("throws ScoringIdentityError when a guarded file differs", () => {
    const exec: GitExec = (args) => (args[0] === "diff" ? "lib/data/body/evidence/scoring/transforms.ts\n" : "");
    expect(() => assertScoringModuleMatchesImplementationSha({ exec })).toThrow(ScoringIdentityError);
    try {
      assertScoringModuleMatchesImplementationSha({ exec });
    } catch (e) {
      expect((e as ScoringIdentityError).differing).toEqual(["lib/data/body/evidence/scoring/transforms.ts"]);
    }
  });
  it("throws when an untracked file appears under a guarded path", () => {
    const exec: GitExec = (args) => (args[0] === "ls-files" ? "lib/data/body/evidence/scoring/new.ts\n" : "");
    expect(() => assertScoringModuleMatchesImplementationSha({ exec })).toThrow(/differs_from_implementationSha/);
  });
  it("throws when the pinned commit is absent", () => {
    const exec: GitExec = (args) => {
      if (args[0] === "cat-file") throw new Error("missing");
      return "";
    };
    expect(() => assertScoringModuleMatchesImplementationSha({ exec })).toThrow(/not_found/);
  });
  it("queries the scoring dir, the resolver, and the contracts", () => {
    const calls: string[][] = [];
    assertScoringModuleMatchesImplementationSha({
      exec: (a) => {
        calls.push(a);
        return "";
      },
    });
    const diff = calls.find((c) => c[0] === "diff")!;
    expect(diff).toContain(IMPLEMENTATION_SHA);
    expect(diff).toContain("lib/data/body/evidence/scoring");
    expect(GUARDED_PATHS).toContain("lib/contracts/bodyCompositionScores.ts");
    expect(GUARDED_PATHS).toContain("lib/data/body/evidence/resolver");
  });
  it("validationCodeSha reads HEAD", () => {
    const sha = "a".repeat(40);
    expect(validationCodeSha({ exec: () => sha + "\n" })).toBe(sha);
    expect(() => validationCodeSha({ exec: () => "nope" })).toThrow();
  });
});

describe("runId convention", () => {
  const base = { protocolId: "BCV-030", validationCodeShaShort8: "abcdef12", seed: 20261004 };
  it("= protocolId__sha8__s<seed>__paramSetId", () => {
    expect(makeRunId({ ...base, paramSetId: "p01_sig1_modelA" })).toBe("BCV-030__abcdef12__s20261004__p01_sig1_modelA");
    expect(makeRunId({ ...base, protocolId: "BCV-001", paramSetId: "grid_male" })).toBe(
      "BCV-001__abcdef12__s20261004__grid_male",
    );
    expect(makeRunId({ ...base, paramSetId: "struct" })).toBe("BCV-030__abcdef12__s20261004__struct");
  });
  it("never contains a creation timestamp", () => {
    const id = makeRunId({ ...base, paramSetId: "struct" });
    expect(id).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(id).not.toMatch(/T\d{2}/);
  });
  it("round-trips through parseRunId", () => {
    const id = makeRunId({ ...base, protocolId: "BCV-032A", paramSetId: "struct" });
    expect(parseRunId(id)).toEqual({
      protocolId: "BCV-032A",
      validationCodeShaShort8: "abcdef12",
      seed: 20261004,
      paramSetId: "struct",
    });
    expect(parseRunId("garbage")).toBeNull();
    expect(parseRunId("BCV-999__abcdef12__s1__x")).toBeNull();
  });
  it("validates inputs", () => {
    expect(() => makeRunId({ ...base, validationCodeShaShort8: "XYZ", paramSetId: "a" })).toThrow();
    expect(() => makeRunId({ ...base, paramSetId: "bad id" })).toThrow();
    expect(() => makeRunId({ ...base, seed: -1, paramSetId: "a" })).toThrow();
  });
  it("shortSha8 takes the first 8 hex chars", () => {
    expect(shortSha8("4900f6e56f1eb83799513452cc4b5d2dcc20601d")).toBe("4900f6e5");
  });
  it("paramSetId builders", () => {
    expect(sigmaLabel(0.5)).toBe("sig0p5");
    expect(sigmaLabel(1)).toBe("sig1");
    expect(sigmaLabel(1.5)).toBe("sig1p5");
    expect(rhoLabel(0)).toBe("rho0");
    expect(rhoLabel(-0.75)).toBe("rhoN0p75");
    expect(rhoLabel(0.25)).toBe("rhoP0p25");
    expect(noiseParamSetId({ personaId: "P-01", sigmaMultiplier: 1, model: "A", rho: null })).toBe("p01_sig1_modelA");
    expect(noiseParamSetId({ personaId: "P-01", sigmaMultiplier: 1, model: "B", rho: 0 })).toBe("p01_sig1_modelB_rho0");
    expect(noiseParamSetId({ personaId: "P-12", sigmaMultiplier: 2, model: "B", rho: -0.5 })).toBe("p12_sig2_modelB_rhoN0p5");
    expect(() => noiseParamSetId({ personaId: "P-01", sigmaMultiplier: 1, model: "B", rho: null })).toThrow();
  });
});

describe("DOB convention", () => {
  it("completed age N at asOf → (2026-N)-10-04", () => {
    expect(dobForCompletedAge(30)).toBe("1996-10-04");
    expect(dobForCompletedAge(20)).toBe("2006-10-04");
    expect(dobForCompletedAge(80)).toBe("1946-10-04");
  });
  it("rejects invalid ages", () => {
    expect(() => dobForCompletedAge(-1)).toThrow();
    expect(() => dobForCompletedAge(30.5)).toThrow();
  });
});
