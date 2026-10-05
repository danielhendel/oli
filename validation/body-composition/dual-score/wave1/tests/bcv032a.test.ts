import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Z95, bcv032aRun, changeMethodFormulas, collectSourceRows, sampleSdOf, TRIAD_CHECKLIST } from "../src/protocols/bcv032a";

describe("§23.17.6 formulas", () => {
  it("SEM_diff = SD(delta)/sqrt(2); SDC95 = 1.96*sqrt(2)*SEM; MDC95 = SDC95", () => {
    const f = changeMethodFormulas(2);
    expect(f.SEM_diff).toBeCloseTo(2 / Math.sqrt(2), 14);
    expect(f.SDC95_individual).toBeCloseTo(1.96 * Math.sqrt(2) * (2 / Math.sqrt(2)), 14);
    expect(f.SDC95_individual).toBeCloseTo(1.96 * 2, 12); // algebraic identity
    expect(f.MDC95_individual).toBe(f.SDC95_individual);
    expect(f.identityResidual).toBeLessThan(1e-12);
    expect(Z95).toBe(1.96);
  });
  it("sample SD of a delta vector uses divisor N−1", () => {
    expect(sampleSdOf([-1, 1])).toBeCloseTo(Math.sqrt(2), 12);
  });
  it("triad checklist keeps the three concepts separate; no clinical/user formula, no group-level SDC", () => {
    const by = Object.fromEntries(TRIAD_CHECKLIST.map((c) => [c.concept, c]));
    expect(by.clinical_meaningful_change!.formulas).toEqual([]);
    expect(by.user_perceived_meaningful_change!.formulas).toEqual([]);
    expect(by.group_level_SDC!.formulas).toEqual([]);
    expect(by.measurement_error_change!.formulas).toHaveLength(3);
  });
});

describe("BCV-032A artifact consumption", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w1-032a-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function writeSource(proto: string, name: string, sd: number) {
    const dir = path.join(tmp, proto, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "results.json"),
      JSON.stringify({
        personaId: "P-01",
        sigmaMultiplier: 1,
        model: { kind: "A" },
        health: { reversal: { sdRepeatedDelta: sd, nPairs: 100 } },
        performance: { reversal: { sdRepeatedDelta: sd * 2, nPairs: 100 } },
      }),
    );
  }

  it("derives SEM/SDC95/MDC95 from BCV-030 and BCV-029 deltas", () => {
    writeSource("BCV-030", "BCV-030__abcdef12__s20261004__p01_sig1_modelA", 1.5);
    writeSource("BCV-029", "BCV-029__abcdef12__s20261004__p01_sig1_modelA", 0.5);
    const rows = collectSourceRows(tmp, ["BCV-030", "BCV-029"], 20261004);
    expect(rows).toHaveLength(4);
    const h30 = rows.find((r) => r.sourceProtocol === "BCV-030" && r.score === "health")!;
    expect(h30.SDC95_individual).toBeCloseTo(1.96 * 1.5, 12);
    expect(h30.MDC95_individual).toBe(h30.SDC95_individual);
    const run = bcv032aRun(tmp, 20261004);
    const r = run.results as Record<string, unknown> & {
      inputsAvailable: boolean;
      groupLevelSDC: { calculated: boolean };
      clinicalMeaningfulChange: { formula: unknown };
      userPerceivedMeaningfulChange: { formula: unknown };
      triadEquivalent: boolean;
    };
    expect(r.inputsAvailable).toBe(true);
    expect(r.groupLevelSDC.calculated).toBe(false);
    expect(r.clinicalMeaningfulChange.formula).toBeNull();
    expect(r.userPerceivedMeaningfulChange.formula).toBeNull();
    expect(r.triadEquivalent).toBe(false);
  });
  it("ignores other seeds and emits formulas even without inputs", () => {
    writeSource("BCV-030", "BCV-030__abcdef12__s999__p01_sig1_modelA", 1);
    expect(collectSourceRows(tmp, ["BCV-030"], 20261004)).toEqual([]);
    const run = bcv032aRun(tmp, 20261004);
    expect((run.results as { inputsAvailable: boolean }).inputsAvailable).toBe(false);
    expect(run.summaryMd).toMatch(/SEM_diff/);
  });
});
