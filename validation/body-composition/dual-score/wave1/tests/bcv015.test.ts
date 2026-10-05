import {
  BCV015_BASELINE_PERSONAS,
  BCV015_EXECUTABLE_FAMILY_COUNT,
  BCV015_FAMILY_COUNT,
  BCV015_MATRIX,
  BCV015_NOT_APPLICABLE_INSTANCE_COUNT,
  BCV015_RUNNABLE_INSTANCE_COUNT,
  conflictDelta,
} from "../src/fixtures015Matrix";
import { runBcv015 } from "../src/fixtures015";

const REQUIRED_FIELDS = [
  "fixtureId", "baselinePersonaId", "engine", "targetConstruct", "targetChannel", "resolverStatus",
  "missingnessMutation", "demographicMutation", "candidateCount", "candidateRelationship",
  "expectedAvailability", "expectedPrimaryReason", "observedAvailability", "observedPrimaryReason",
];

describe("BCV-015 matrix (§23.17.4.8)", () => {
  it("has 81 families: 80 executable + H1_MISSING_SEX not_applicable", () => {
    expect(BCV015_MATRIX).toHaveLength(81);
    expect(BCV015_FAMILY_COUNT).toBe(81);
    expect(BCV015_EXECUTABLE_FAMILY_COUNT).toBe(80);
    expect(BCV015_MATRIX.filter((f) => f.executable)).toHaveLength(80);
    const na = BCV015_MATRIX.filter((f) => !f.executable);
    expect(na.map((f) => f.fixtureId)).toEqual(["H1_MISSING_SEX"]);
    expect(na[0]!.expectedAvailability).toBe("not_applicable");
  });
  it("fixture ids are unique", () => {
    const ids = BCV015_MATRIX.map((f) => f.fixtureId);
    expect(new Set(ids).size).toBe(81);
  });
  it("H1 multiple_valid has TWO distinct fixtures (no governed WHtR / governed WHtR); no bare H1_MULTIPLE_VALID", () => {
    const ids = BCV015_MATRIX.map((f) => f.fixtureId);
    expect(ids).toContain("H1_MULTIPLE_VALID_NO_GOVERNED_WHTR");
    expect(ids).toContain("H1_MULTIPLE_VALID_GOVERNED_WHTR");
    expect(ids).not.toContain("H1_MULTIPLE_VALID");
  });
  it("includes the exact demographic fixtures only", () => {
    const ids = BCV015_MATRIX.map((f) => f.fixtureId);
    for (const id of ["H1_MISSING_SEX", "HEALTH_MISSING_DOB", "PERF_MISSING_DOB"]) expect(ids).toContain(id);
    expect(ids.filter((i) => i.includes("MISSING_REQUIRED_DEMOGRAPHIC"))).toEqual([]);
    for (const prefix of ["H2", "H3_ALMI", "H3_FFMI", "P1", "P3"]) {
      expect(ids).toContain(`${prefix}_MISSING_SEX`);
      expect(ids).toContain(`${prefix}_MISSING_HEIGHT`);
    }
  });
  it("covers every target construct/channel", () => {
    for (const prefix of ["H1_", "H2_", "H3_ALMI_", "H3_FFMI_", "P1_", "P3_"]) {
      expect(BCV015_MATRIX.some((f) => f.fixtureId.startsWith(prefix))).toBe(true);
    }
  });
  it("baselines are P-01 (male) and P-11 (female) only", () => {
    expect([...BCV015_BASELINE_PERSONAS]).toEqual(["P-01", "P-11"]);
    expect(BCV015_RUNNABLE_INSTANCE_COUNT).toBe(160);
    expect(BCV015_NOT_APPLICABLE_INSTANCE_COUNT).toBe(2);
  });
  it("conflictDelta = max(EPS_SURF, 0.10*|baseline|); 0 → EPS_SURF", () => {
    expect(conflictDelta(0)).toBe(1e-4);
    expect(conflictDelta(0.438)).toBeCloseTo(0.0438, 12);
    expect(conflictDelta(-20)).toBe(2);
    expect(conflictDelta(0.0005)).toBe(1e-4);
  });
});

describe("BCV-015 execution", () => {
  const { rows, summary } = runBcv015();
  it("emits 162 instance rows: 160 executed + 2 listed-not-executed", () => {
    expect(rows).toHaveLength(162);
    expect(summary.executedInstances).toBe(160);
    expect(summary.notApplicableInstances).toBe(2);
    const na = rows.filter((r) => !r.executable);
    expect(na.map((r) => r.fixtureInstanceId).sort()).toEqual(["H1_MISSING_SEX__P-01", "H1_MISSING_SEX__P-11"]);
    for (const r of na) {
      expect(r.observedAvailability).toBeNull();
      expect(r.structuralPass).toBeNull();
      expect(r.executionMode).toBe("not_executed_not_applicable");
    }
  });
  it("every row carries all 14 required result fields", () => {
    for (const r of rows) for (const f of REQUIRED_FIELDS) expect(Object.keys(r)).toContain(f);
  });
  it("all executed instances structurally pass (expected availability/reason == observed)", () => {
    expect(summary.structuralFail).toBe(0);
    expect(summary.failingInstanceIds).toEqual([]);
    for (const r of rows.filter((x) => x.executable)) {
      expect(r.observedAvailability).toBe(r.expectedAvailability);
      expect(r.observedPrimaryReason).toBe(r.expectedPrimaryReason);
    }
  });
  it("records every status patch and baseline normalization (never silent)", () => {
    const patched = rows.filter((r) => r.resolverStatusPatched);
    expect(patched.length).toBe(summary.statusPatchedInstances);
    for (const r of patched) {
      expect(r.resolverStatusPatchReason).not.toBeNull();
      expect(r.resolverStatusObservedNatural).not.toBeNull();
    }
  });
  it("only P-01 and P-11 appear as baselines", () => {
    expect(new Set(rows.map((r) => r.baselinePersonaId))).toEqual(new Set(["P-01", "P-11"]));
  });
  it("is deterministic", () => {
    expect(JSON.stringify(runBcv015().rows)).toBe(JSON.stringify(rows));
  });
});
