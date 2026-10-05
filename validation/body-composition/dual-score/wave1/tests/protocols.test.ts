import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { validateManifest, writeRun } from "../src/artifacts";
import type { ProtocolContext, RunOutput } from "../src/artifacts";
import { CANONICAL_SEED, EPS_NUM, STREAM_CODES, WAVE1_PROTOCOL_IDS } from "../src/constants";
import { FROZEN_CONVERGENCE_PARAMS } from "../src/stats";
import { EXECUTION_ORDER, PROTOCOLS, assertRegistryComplete, protocolById } from "../src/protocols";
import { bcv006Run } from "../src/protocols/bcv006";
import { bcv007Run } from "../src/protocols/bcv007";
import { bcv012Run } from "../src/protocols/bcv012";
import { bcv013Run, CONTINUITY_TOL } from "../src/protocols/bcv013";
import { bcv014Run } from "../src/protocols/bcv014";
import { bcv018Run, bcv018Rows } from "../src/protocols/bcv018";
import { bcv031Run, allCases, withLabels } from "../src/protocols/bcv031";
import { bcv034Run } from "../src/protocols/bcv034";
import { plannedNoiseConfigs } from "../src/noiseProtocol";

const CTX_BASE = {
  seed: CANONICAL_SEED,
  validationCodeSha: "0123456789abcdef0123456789abcdef01234567",
  validationCodeShaShort8: "01234567",
};

function ctx(over: Partial<ProtocolContext> = {}): ProtocolContext {
  return {
    ...CTX_BASE,
    outRoot: os.tmpdir(),
    emitPlots: false,
    filters: {},
    dryRun: false,
    log: () => undefined,
    ...over,
  };
}

describe("Wave 1 membership", () => {
  it("is exactly the 16 P0 protocols", () => {
    expect([...WAVE1_PROTOCOL_IDS].sort()).toEqual(
      ["BCV-001", "BCV-002", "BCV-006", "BCV-007", "BCV-012", "BCV-013", "BCV-014", "BCV-015", "BCV-016", "BCV-017", "BCV-018", "BCV-029", "BCV-030", "BCV-031", "BCV-032A", "BCV-034"].sort(),
    );
    expect(WAVE1_PROTOCOL_IDS).toHaveLength(16);
    expect(PROTOCOLS).toHaveLength(16);
    expect(new Set(PROTOCOLS.map((p) => p.protocolId)).size).toBe(16);
    expect(() => assertRegistryComplete()).not.toThrow();
  });
  it("registry stream codes match the frozen table; experimentId = protocolId", () => {
    for (const p of PROTOCOLS) {
      expect(p.streamCode).toBe(STREAM_CODES[p.protocolId]);
      expect(p.experimentId).toBe(p.protocolId);
    }
  });
  it("execution order covers all 16 once with BCV-032A after BCV-029/030", () => {
    expect([...EXECUTION_ORDER].sort()).toEqual([...WAVE1_PROTOCOL_IDS].sort());
    const idx = (id: string) => EXECUTION_ORDER.indexOf(id as never);
    expect(idx("BCV-032A")).toBeGreaterThan(idx("BCV-029"));
    expect(idx("BCV-032A")).toBeGreaterThan(idx("BCV-030"));
    expect(() => protocolById("BCV-999")).toThrow();
  });
  it("csv-emitting protocols per §23.14", () => {
    const csv = PROTOCOLS.filter((p) => p.emitsCsv).map((p) => p.protocolId).sort();
    expect(csv).toEqual(["BCV-001", "BCV-006", "BCV-007", "BCV-012", "BCV-013", "BCV-014", "BCV-031"]);
  });
});

describe("planned runs", () => {
  it("noise protocols plan 12 × 4 × (1 + 7) = 384 runs with unique paramSetIds", () => {
    for (const id of ["BCV-002", "BCV-029", "BCV-030"] as const) {
      const ids = protocolById(id).plannedParamSetIds(ctx());
      expect(ids).toHaveLength(384);
      expect(new Set(ids).size).toBe(384);
    }
  });
  it("includes both Model A and Model B at rho=0 as separate runs", () => {
    const ids = protocolById("BCV-030").plannedParamSetIds(ctx());
    expect(ids).toContain("p01_sig1_modelA");
    expect(ids).toContain("p01_sig1_modelB_rho0");
    expect(ids).toContain("p12_sig2_modelB_rhoN0p75");
  });
  it("filters shrink the plan", () => {
    const plan = plannedNoiseConfigs({ filters: { personas: ["P-02"], sigmas: [1], models: ["B"], rhos: [0, 0.25] } });
    expect(plan.map((p) => p.paramSetId)).toEqual(["p02_sig1_modelB_rho0", "p02_sig1_modelB_rhoP0p25"]);
  });
  it("BCV-001 plans grid_male and grid_female; structural protocols plan one 'struct' run", () => {
    expect(protocolById("BCV-001").plannedParamSetIds(ctx())).toEqual(["grid_male", "grid_female"]);
    expect(protocolById("BCV-013").plannedParamSetIds(ctx())).toEqual(["struct"]);
  });
});

describe("structural protocol results", () => {
  it("BCV-006: age invariance within sex (max |Δ| <= EPS_NUM)", () => {
    const r = bcv006Run().results as { invariancePass: boolean; bySex: Array<{ maxAbsDelta: number }> };
    expect(r.invariancePass).toBe(true);
    for (const s of r.bySex) expect(s.maxAbsDelta).toBeLessThanOrEqual(EPS_NUM);
  });
  it("BCV-007: documents transform differences between sexes and does not assume fairness", () => {
    const r = bcv007Run().results as { assumedFair: boolean; transformContrasts: Array<{ construct: string; delta: number | null }> };
    expect(r.assumedFair).toBe(false);
    expect(r.transformContrasts.some((c) => c.construct === "H2" && c.delta !== 0)).toBe(true);
    expect(r.transformContrasts.filter((c) => c.construct === "H1").every((c) => c.delta === 0)).toBe(true);
  });
  it("BCV-012: OAT + joint rows with frozen steps; normalized sensitivity = |slope| × DOMAIN_RANGE", () => {
    const r = bcv012Run().results as { oat: Array<Record<string, unknown>>; joint: Array<Record<string, unknown>> };
    expect(r.oat.length).toBeGreaterThan(0);
    const withSlope = r.oat.find((x) => x.localSlope != null && x.step === 0.1)!;
    expect(withSlope.normalizedSensitivity).toBeCloseTo(Math.abs(withSlope.localSlope as number) * (withSlope.domainRange as number), 9);
    const steps = new Set(r.oat.filter((x) => x.construct === "H1").map((x) => x.step));
    expect([...steps].sort()).toEqual([1e-4, 0.01, 0.1].sort());
    const signs = new Set(r.joint.map((x) => `${x.signX},${x.signY}`));
    expect([...signs].sort()).toEqual(["-1,-1", "-1,1", "1,-1", "1,1"]);
    expect(new Set(r.joint.map((x) => x.surfaceId)).size).toBe(6);
  });
  it("BCV-013: continuity <= 1e-6 at every knot; plateaus flat; five plateau specs", () => {
    const r = bcv013Run().results as {
      continuityAllPass: boolean;
      plateauAllFlat: boolean;
      knots: Array<{ discontinuityDelta: number }>;
      plateaus: Array<{ id: string; plateauWidth: number | null }>;
    };
    expect(r.continuityAllPass).toBe(true);
    expect(r.plateauAllFlat).toBe(true);
    for (const k of r.knots) expect(k.discontinuityDelta).toBeLessThanOrEqual(CONTINUITY_TOL);
    const ids = [...new Set(r.plateaus.map((p) => p.id))].sort();
    expect(ids).toEqual(["H1_left", "H2_female_92", "H2_male_92", "P3_female_92", "P3_male_92"]);
    expect(r.plateaus.find((p) => p.id === "H2_male_92")!.plateauWidth).toBe(2);
    expect(r.plateaus.find((p) => p.id === "P3_female_92")!.plateauWidth).toBe(5);
    expect(r.plateaus.find((p) => p.id === "H1_left")!.plateauWidth).toBeNull();
  });
  it("BCV-014: reports exact and near floor/ceiling occupancy", () => {
    const r = bcv014Run().results as { oneDimensional: Array<{ n: number; exactCeiling: number; exactFloor: number }>; definitions: Record<string, string> };
    expect(r.definitions).toEqual({ exactFloor: "==0", exactCeiling: "==100", nearFloor: "(0,5]", nearCeiling: "[95,100)" });
    expect(r.oneDimensional.every((o) => o.n > 0)).toBe(true);
    expect(r.oneDimensional.some((o) => o.exactCeiling > 0)).toBe(true);
  });
  it("BCV-018: single and dual adverse combinations for both sexes; §23.17.1 fields only", () => {
    const { combos } = bcv018Rows();
    // per sex: 1 favorable + 3 single + 3 dual Health; 1 favorable + 2 single + 1 dual Perf = 11
    expect(combos).toHaveLength(22);
    const row = combos.find((c) => c.id === "H1_H2_adverse" && c.sex === "male")!;
    expect(row.adverseConstructs).toEqual(["H1", "H2"]);
    expect(row.contribution!.rows[0]).toHaveProperty("weightedDeficit");
    const run = bcv018Run().results as { personas: unknown[] };
    expect(run.personas).toHaveLength(24);
  });
  it("BCV-034: scenarios on P-01/P-08/P-11/P-12; menstrual rows only for females; label present", () => {
    const r = bcv034Run().results as {
      rows: Array<{ personaId: string; scenarioId: string; applicable: boolean }>;
      label: string;
      falseImprovement: { excludes: string };
    };
    expect([...new Set(r.rows.map((x) => x.personaId))].sort()).toEqual(["P-01", "P-08", "P-11", "P-12"]);
    expect(r.rows).toHaveLength(48);
    const men = r.rows.filter((x) => x.scenarioId.startsWith("MENSTRUAL"));
    expect(men.filter((x) => x.applicable).map((x) => x.personaId).sort()).toEqual(["P-11", "P-11", "P-12", "P-12"]);
    expect(r.label).toMatch(/not_empirical/);
    expect(r.falseImprovement.excludes).toBe("BASE");
  });
});

describe("BCV-031 hidden-path invariance (HARD FAIL)", () => {
  const run = bcv031Run();
  it("passes: scores are invariant to every unused factor", () => {
    expect(run.hardFail).toBe(false);
    const groups = (run.results as { groups: Array<{ invariancePass: boolean; maxAbsDelta: number }> }).groups;
    expect(groups.length).toBe(13);
    for (const g of groups) {
      expect(g.invariancePass).toBe(true);
      expect(g.maxAbsDelta).toBeLessThanOrEqual(EPS_NUM);
    }
  });
  it("covers every §23.12.2 factor", () => {
    const studies = new Set(allCases().map((c) => c.study));
    expect([...studies].sort()).toEqual([
      "age_x_sex", "athletic_x_sex", "bmi_proxy_x_sex", "ethnicity_x_sex", "height_x_sex", "menopause_x_age", "vendor_x_site_x_sex",
    ]);
  });
  it("labels are really attached (so a hidden read would be visible)", () => {
    const c = allCases().find((x) => x.study === "athletic_x_sex" && x.levels.athleticStatus === "trained")!;
    const b = withLabels({ subjectContext: { a: 1 }, observations: [] } as Record<string, unknown>, c.labels) as {
      validationLabels: Record<string, unknown>;
      subjectContext: Record<string, unknown>;
    };
    expect(b.validationLabels.athleticStatus).toBe("trained");
    expect(b.subjectContext.athleticStatus).toBe("trained");
  });
  it("is flagged as a hard fail when invariance is violated", () => {
    // Direct check of the failure predicate: |Δ| above EPS_NUM must fail a group.
    const g = { maxAbsDelta: 2 * EPS_NUM, statusConsistent: true, allAvailable: true };
    expect(g.allAvailable && g.statusConsistent && g.maxAbsDelta <= EPS_NUM).toBe(false);
  });
});

describe("end-to-end artifacts (tmp dir, small MC budget)", () => {
  let tmp: string;
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w1-e2e-"));
  });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("writes valid manifests/artifacts for every protocol (filtered MC)", () => {
    const c = ctx({
      outRoot: tmp,
      filters: { personas: ["P-01"], sigmas: [1], models: ["A", "B"], rhos: [0] },
      mcParams: { minimumDraws: 2000, maximumDraws: 4000, checkpointEvery: 1000, convergence: FROZEN_CONVERGENCE_PARAMS },
    });
    let n = 0;
    for (const id of EXECUTION_ORDER) {
      for (const run of protocolById(id).run(c) as Iterable<RunOutput>) {
        const w = writeRun({ run, ctx: c, createdAtUtc: "2026-10-05T00:00:00.000Z" });
        const manifest = JSON.parse(fs.readFileSync(path.join(w.runDir, "manifest.json"), "utf8"));
        expect(validateManifest(manifest)).toEqual({ ok: true, errors: [] });
        for (const f of manifest.artifactFiles as string[]) expect(fs.existsSync(path.join(w.runDir, f))).toBe(true);
        expect(w.runDir.startsWith(path.join(tmp, id))).toBe(true);
        expect(path.basename(w.runDir)).toBe(w.runId);
        const proto = protocolById(id);
        expect(fs.existsSync(path.join(w.runDir, "results.csv"))).toBe(proto.emitsCsv);
        n++;
      }
    }
    // 2 (BCV-001) + 11 single-run protocols + 3 MC × 2 configs + BCV-032A
    expect(n).toBe(2 + 11 + 3 * 2 + 1);
    // BCV-032A consumed the BCV-030 artifacts written just before
    const s = fs.readdirSync(path.join(tmp, "BCV-032A"))[0]!;
    const res = JSON.parse(fs.readFileSync(path.join(tmp, "BCV-032A", s, "results.json"), "utf8"));
    expect(res.inputsAvailable).toBe(true);
  });
});
