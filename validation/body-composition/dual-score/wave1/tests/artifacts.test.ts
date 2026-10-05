import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  MANIFEST_KEYS,
  buildManifest,
  csvEscape,
  frozenProvenance,
  provenance,
  relativeRunPath,
  runDirFor,
  toCsv,
  validateManifest,
  writeRun,
} from "../src/artifacts";
import type { Manifest, RunOutput } from "../src/artifacts";
import { MC_PROTOCOL, SIGMA_STAR } from "../src/constants";
import { covarianceParametersFor, modelAError, modelB } from "../src/models";
import { noiseParameterBlock, noiseProvenance, plannedNoiseConfigs } from "../src/noiseProtocol";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const CTX = { seed: 20261004, validationCodeSha: SHA, validationCodeShaShort8: "01234567" };

function structRun(over: Partial<RunOutput> = {}): RunOutput {
  return {
    protocolId: "BCV-006",
    experimentId: "BCV-006",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: { ok: true },
    summaryMd: "# t",
    csv: "a,b\n1,2\n",
    manifest: {
      inputDomains: { a: 1 },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {},
      notes: "n",
    },
    ...over,
  };
}

function manifestOf(run: RunOutput, files = ["manifest.json", "results.json", "summary.md"]): Manifest {
  return buildManifest({ run, ctx: CTX, artifactFiles: files, createdAtUtc: "2026-10-05T00:00:00.000Z" });
}

describe("manifest schema", () => {
  it("has exactly the frozen 25 keys", () => {
    expect([...MANIFEST_KEYS]).toEqual([
      "schemaVersion", "experimentId", "protocolId", "runId", "engineVersion", "implementationSha",
      "mathematicalFreezeSha", "validationPlanSha", "validationCodeSha", "createdAtUtc", "seed", "streamCode",
      "inputDomains", "gridSteps", "epsilon", "monteCarloProtocol", "noiseParameters", "covarianceParameters",
      "scheduleId", "personaId", "parameterProvenance", "artifactFiles", "interpretationClass", "phiStatus", "notes",
    ]);
  });
  it("built manifests validate and carry fixed enum values", () => {
    const m = manifestOf(structRun());
    expect(validateManifest(m)).toEqual({ ok: true, errors: [] });
    expect(m.schemaVersion).toBe("body_composition_dual_score_wave1_manifest_v1");
    expect(m.phiStatus).toBe("synthetic_no_phi");
    expect(m.streamCode).toBe(6);
    expect(m.engineVersion).toEqual({
      health: "body_composition_health_score_draft_v1",
      performanceSupporting: "body_composition_performance_supporting_score_draft_v1",
    });
    expect(Object.keys(m).sort()).toEqual([...MANIFEST_KEYS].sort());
  });
  it("rejects missing and unexpected keys", () => {
    const m = manifestOf(structRun()) as unknown as Record<string, unknown>;
    for (const k of MANIFEST_KEYS) {
      const c = { ...m };
      delete c[k];
      expect(validateManifest(c).errors).toContain(`missing_key:${k}`);
    }
    expect(validateManifest({ ...m, extra: 1 }).errors).toContain("unexpected_key:extra");
  });
  it.each([
    ["schemaVersion", "x", "schemaVersion_invalid"],
    ["phiStatus", "phi", "phiStatus_invalid"],
    ["interpretationClass", "other", "interpretationClass_invalid"],
    ["implementationSha", "0".repeat(40), "implementationSha_mismatch"],
    ["mathematicalFreezeSha", "0".repeat(40), "mathematicalFreezeSha_mismatch"],
    ["validationPlanSha", "0".repeat(40), "validationPlanSha_mismatch"],
    ["streamCode", 99, "streamCode_mismatch"],
    ["seed", 1.5, "seed_invalid"],
  ])("rejects invalid %s", (key, value, err) => {
    const m = { ...manifestOf(structRun()), [key]: value };
    expect(validateManifest(m).errors).toContain(err);
  });
  it("interpretationClass accepts only the three enum values", () => {
    for (const c of ["structural_invariant", "exploratory", "evidence_dependent_acceptance"] as const) {
      expect(validateManifest(manifestOf(structRun({ interpretationClass: c }))).ok).toBe(true);
    }
  });
  it("runId must follow the convention and must not embed createdAtUtc", () => {
    const m = manifestOf(structRun());
    expect(m.runId).toBe("BCV-006__01234567__s20261004__struct");
    expect(validateManifest({ ...m, runId: "BCV-006__01234567__s20261004__2026-10-05T00:00:00.000Z" }).ok).toBe(false);
    expect(validateManifest({ ...m, runId: "BCV-007__01234567__s20261004__struct" }).errors).toContain(
      "runId_protocol_mismatch",
    );
    expect(validateManifest({ ...m, runId: "BCV-006__deadbeef__s20261004__struct" }).errors).toContain("runId_sha_mismatch");
    expect(manifestOf(structRun()).runId).toBe(
      buildManifest({ run: structRun(), ctx: CTX, artifactFiles: [], createdAtUtc: "1999-01-01T00:00:00.000Z" }).runId,
    );
  });
  it("monteCarloProtocol must be null or the exact §23.9.3 object", () => {
    const run = structRun({ manifest: { ...structRun().manifest, monteCarloProtocol: MC_PROTOCOL } });
    expect(validateManifest(manifestOf(run)).ok).toBe(true);
    const bad = { ...manifestOf(run), monteCarloProtocol: { ...MC_PROTOCOL, minimumDraws: 5 } };
    expect(validateManifest(bad).errors).toContain("monteCarloProtocol_not_exact");
    expect(MC_PROTOCOL).toMatchObject({
      minimumDraws: 100000, maximumDraws: 1000000, checkpointEvery: 10000, batchCount: 20,
      requiredConsecutivePasses: 2, quantileEstimator: "hyndman_fan_type_7", batchSd: "sample_n_minus_1",
      prng: "mulberry32", gaussianTransform: "marsaglia_polar",
    });
  });
  it("artifactFiles must include the three mandatory files and be relative", () => {
    const m = manifestOf(structRun());
    expect(validateManifest({ ...m, artifactFiles: ["results.json"] }).errors).toEqual(
      expect.arrayContaining(["artifactFiles_missing:manifest.json", "artifactFiles_missing:summary.md"]),
    );
    expect(validateManifest({ ...m, artifactFiles: [...m.artifactFiles, "../x"] }).errors).toContain(
      "artifactFiles_not_relative:../x",
    );
  });
});

describe("parameterProvenance", () => {
  it("every entry has a legal sourceType, a sourceId and a value", () => {
    const m = manifestOf(structRun());
    for (const v of Object.values(m.parameterProvenance)) {
      expect(["mathematical_freeze", "validation_plan", "evidence_review", "synthetic_fallback"]).toContain(v.sourceType);
      expect(v.sourceId.length).toBeGreaterThan(0);
      expect("value" in v).toBe(true);
    }
    expect(Object.keys(frozenProvenance())).toEqual(
      expect.arrayContaining(["canonicalSeed", "implementationSha", "EPS_NUM", "EPS_SURF", "EPS_CM"]),
    );
  });
  it("rejects an illegal sourceType", () => {
    const m = manifestOf(structRun());
    const bad = { ...m, parameterProvenance: { x: { sourceType: "guess", sourceId: "s", value: 1 } } };
    expect(validateManifest(bad).errors).toContain("provenance_sourceType_invalid:x");
  });
  it("noise runs provenance-cover every sigma*, the multiplier and rho (Model B)", () => {
    const plan = plannedNoiseConfigs({ filters: { personas: ["P-01"], sigmas: [1.5], models: ["B"], rhos: [-0.25] } })[0]!;
    const prov = noiseProvenance(plan);
    for (const k of Object.keys(SIGMA_STAR)) expect(prov[`sigmaStar_${k}`]!.sourceType).toBe("synthetic_fallback");
    expect(prov.rho!.value).toBe(-0.25);
    expect(prov.sigmaMultiplier!.value).toBe(1.5);
    const run = structRun({
      protocolId: "BCV-030",
      experimentId: "BCV-030",
      manifest: {
        ...structRun().manifest,
        monteCarloProtocol: MC_PROTOCOL,
        noiseParameters: noiseParameterBlock(plan),
        covarianceParameters: covarianceParametersFor(plan.model),
        parameterProvenance: prov,
      },
    });
    expect(validateManifest(manifestOf(run)).ok).toBe(true);
    // removing one provenance entry must be caught
    const m = manifestOf(run);
    const pp = { ...m.parameterProvenance };
    delete pp.sigmaStar_waistCm;
    expect(validateManifest({ ...m, parameterProvenance: pp }).errors).toContain(
      "noise_param_unprovenanced:sigmaStar_waistCm",
    );
    const pp2 = { ...m.parameterProvenance };
    delete pp2.rho;
    expect(validateManifest({ ...m, parameterProvenance: pp2 }).errors).toContain("covariance_param_unprovenanced:rho");
  });
  it("covarianceParameters: Model A vs Model B shapes", () => {
    const a = manifestOf(structRun({ manifest: { ...structRun().manifest, covarianceParameters: covarianceParametersFor(modelAError()) } }));
    expect(validateManifest(a).ok).toBe(true);
    const b = manifestOf(
      structRun({
        manifest: {
          ...structRun().manifest,
          covarianceParameters: covarianceParametersFor(modelB(0.5)),
          parameterProvenance: { rho: provenance("synthetic_fallback", "§23.6", 0.5) },
        },
      }),
    );
    expect(validateManifest(b).ok).toBe(true);
    expect(validateManifest({ ...b, covarianceParameters: { ...b.covarianceParameters!, rho: 0.1 } }).errors).toContain(
      "covarianceParameters_modelB_invalid",
    );
    expect(
      validateManifest({
        ...b,
        covarianceParameters: { ...b.covarianceParameters!, correlatedPairs: [["FM", "ALM"]] },
      }).errors,
    ).toContain("covarianceParameters_modelB_invalid");
  });
});

describe("artifact paths and writing", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w1-art-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("root layout: <root>/<experiment-id>/<run-id>/", () => {
    expect(runDirFor("/r", "BCV-001", "BCV-001__abcdef12__s1__grid_male")).toBe(
      "/r/BCV-001/BCV-001__abcdef12__s1__grid_male",
    );
    expect(relativeRunPath("BCV-001", "BCV-001__abcdef12__s1__x")).toBe("BCV-001/BCV-001__abcdef12__s1__x");
  });
  it("writes manifest.json, results.json, summary.md (+ results.csv when provided)", () => {
    const w = writeRun({ run: structRun(), ctx: { ...CTX, outRoot: tmp }, createdAtUtc: "2026-10-05T00:00:00.000Z" });
    expect(w.runDir).toBe(path.join(tmp, "BCV-006", "BCV-006__01234567__s20261004__struct"));
    for (const f of ["manifest.json", "results.json", "summary.md", "results.csv"]) {
      expect(fs.existsSync(path.join(w.runDir, f))).toBe(true);
    }
    const onDisk = JSON.parse(fs.readFileSync(path.join(w.runDir, "manifest.json"), "utf8"));
    expect(validateManifest(onDisk).ok).toBe(true);
    expect(onDisk.artifactFiles).toEqual(["manifest.json", "results.csv", "results.json", "summary.md"]);
    expect(onDisk.createdAtUtc).toBe("2026-10-05T00:00:00.000Z");
  });
  it("omits results.csv for non-tabular protocols and lists extra files", () => {
    const run = structRun({ csv: undefined as unknown as string, extraFiles: { "plots/a.svg": "<svg/>" } });
    delete (run as { csv?: string }).csv;
    const w = writeRun({ run, ctx: { ...CTX, outRoot: tmp } });
    expect(fs.existsSync(path.join(w.runDir, "results.csv"))).toBe(false);
    expect(fs.existsSync(path.join(w.runDir, "plots", "a.svg"))).toBe(true);
    expect(w.manifest.artifactFiles).toContain("plots/a.svg");
  });
  it("same inputs → identical runId regardless of createdAtUtc", () => {
    const a = writeRun({ run: structRun(), ctx: { ...CTX, outRoot: tmp }, createdAtUtc: "2026-01-01T00:00:00.000Z" });
    const b = writeRun({ run: structRun(), ctx: { ...CTX, outRoot: tmp }, createdAtUtc: "2027-01-01T00:00:00.000Z" });
    expect(a.runId).toBe(b.runId);
    expect(a.runDir).toBe(b.runDir);
  });
});

describe("csv helpers", () => {
  it("escapes commas, quotes and newlines; blanks null/NaN", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(Number.NaN)).toBe("");
    expect(csvEscape(1.5)).toBe("1.5");
    expect(toCsv(["x", "y"], [[1, "a,b"]])).toBe('x,y\n1,"a,b"\n');
  });
});
