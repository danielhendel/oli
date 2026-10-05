import { EPS_NUM, REFERENCE_ANCHORS } from "../src/constants";
import { PERSONAS } from "../src/personas";
import { RELATION_KEYS, bcv017Run, observedRelation, personaRelationRows, referenceViews } from "../src/protocols/bcv017";

describe("§23.17.7 directional rubric", () => {
  it("higher / lower / equal with EPS_NUM", () => {
    expect(observedRelation(70 + 2 * EPS_NUM, 70)).toBe("higher");
    expect(observedRelation(70 - 2 * EPS_NUM, 70)).toBe("lower");
    expect(observedRelation(70 + EPS_NUM / 2, 70)).toBe("equal");
    expect(observedRelation(70, 70)).toBe("equal");
    expect(observedRelation(50, 70)).toBe("lower");
    expect(observedRelation(90, 70)).toBe("higher");
  });
});

describe("BCV-017 persona battery", () => {
  const refs = referenceViews();
  it("reference = engine score generated from the §23.5.4 sex anchor", () => {
    expect(refs.male.H1).not.toBeNull();
    expect(refs.female.healthScore).not.toBeNull();
    expect(Object.keys(REFERENCE_ANCHORS)).toEqual(["male", "female"]);
  });
  it("12 personas with the seven expectedRelation columns", () => {
    expect(PERSONAS).toHaveLength(12);
    expect(RELATION_KEYS.map(([k]) => k)).toEqual([
      "H1", "H2", "H3", "HealthAggregate", "P1", "P3", "PerformanceAggregate",
    ]);
    for (const p of PERSONAS) for (const [k] of RELATION_KEYS) expect(p.expected[k]).toBeDefined();
  });
  it("every applicable relation passes (observed == expected)", () => {
    const run = bcv017Run();
    const r = run.results as { relationPass: number; relationDenominator: number; failures: string[] };
    expect(r.failures).toEqual([]);
    expect(r.relationPass).toBe(r.relationDenominator);
    expect(r.relationDenominator).toBeGreaterThan(0);
  });
  it("not_applicable rows are excluded from the pass denominator", () => {
    const p = { ...PERSONAS[0]!, expected: { ...PERSONAS[0]!.expected, H1: "not_applicable" as const } };
    const rows = personaRelationRows(p, refs.male).relations;
    const h1 = rows.find((r) => r.key === "H1")!;
    expect(h1.applicable).toBe(false);
    expect(h1.pass).toBeNull();
  });
  it("a deliberately wrong expectation fails", () => {
    const p = { ...PERSONAS[0]!, expected: { ...PERSONAS[0]!.expected, H1: "lower" as const } };
    const h1 = personaRelationRows(p, refs.male).relations.find((r) => r.key === "H1")!;
    expect(h1.pass).toBe(false);
  });
  it("emits §23.17.1 contribution fields and adverse-hide flags", () => {
    const row = personaRelationRows(PERSONAS[7]!, refs.male); // P-08
    expect(row.healthContribution!.dominantAdverseConstruct).toBeDefined();
    expect(row.healthContribution!.rows[0]).toHaveProperty("absoluteContribution");
    expect(row.healthContribution!.rows[0]).toHaveProperty("marginalContributionPerConstructPoint");
    expect(row.healthContribution!.rows[0]).toHaveProperty("weightedDeficit");
    expect(typeof row.healthAdverseHide).toBe("boolean");
  });
});
