/**
 * BCV-017 — Paradoxical persona battery (§23.10, §23.17.7).
 * Observed relation of each persona construct/aggregate versus the sex-specific §23.5.4 reference
 * (aggregate reference = aggregate generated from the reference anchor). Pass iff observed == expected;
 * not_applicable rows are excluded from the denominator.
 */
import { EPS_NUM, REFERENCE_ANCHORS } from "../constants";
import type { Sex } from "../constants";
import { adverseHide, contributionSummary } from "../contribution";
import { engineView } from "../engineView";
import type { EngineView } from "../engineView";
import { PERSONAS } from "../personas";
import type { Persona, Relation } from "../personas";
import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export function observedRelation(persona: number, reference: number): "higher" | "lower" | "equal" {
  if (persona > reference + EPS_NUM) return "higher";
  if (persona < reference - EPS_NUM) return "lower";
  return "equal";
}

export const RELATION_KEYS = [
  ["H1", "H1"],
  ["H2", "H2"],
  ["H3", "H3"],
  ["HealthAggregate", "healthScore"],
  ["P1", "P1"],
  ["P3", "P3"],
  ["PerformanceAggregate", "perfScore"],
] as const;

export function referenceViews(): Record<Sex, EngineView> {
  const mk = (sex: Sex): EngineView => {
    const r = REFERENCE_ANCHORS[sex];
    return engineView({ sex, ageYears: 30, heightCm: sex === "male" ? 175 : 165, ...r });
  };
  return { male: mk("male"), female: mk("female") };
}

export function personaRelationRows(p: Persona, ref: EngineView) {
  const view = engineView({
    sex: p.sex,
    ageYears: p.age,
    heightCm: p.heightCm,
    whtr: p.whtr,
    fmi: p.fmi,
    almi: p.almi,
    ffmi: p.ffmi,
  });
  const relations = RELATION_KEYS.map(([key, vk]) => {
    const expected: Relation = p.expected[key];
    const s = view[vk];
    const r = ref[vk];
    const observed = s == null || r == null ? null : observedRelation(s, r);
    return {
      key,
      expectedRelation: expected,
      personaScore: s,
      referenceScore: r,
      observedRelation: observed,
      applicable: expected !== "not_applicable",
      pass: expected === "not_applicable" ? null : observed === expected,
    };
  });
  const hs = view.H1 != null && view.H2 != null && view.H3 != null ? { H1: view.H1, H2: view.H2, H3: view.H3 } : null;
  const ps = view.P1 != null && view.P3 != null ? { P1: view.P1, P3: view.P3 } : null;
  return {
    view,
    relations,
    healthContribution: hs ? contributionSummary("health", hs) : null,
    performanceContribution: ps ? contributionSummary("performance", ps) : null,
    healthAdverseHide: hs && view.healthScore != null ? adverseHide([hs.H1, hs.H2, hs.H3], view.healthScore) : null,
    performanceAdverseHide: ps && view.perfScore != null ? adverseHide([ps.P1, ps.P3], view.perfScore) : null,
  };
}

export function bcv017Run(): RunOutput {
  const refs = referenceViews();
  const rows = PERSONAS.map((p) => ({ personaId: p.id, sex: p.sex, notes: p.notes, ...personaRelationRows(p, refs[p.sex]) }));
  let pass = 0;
  let denom = 0;
  const failures: string[] = [];
  for (const r of rows) {
    for (const rel of r.relations) {
      if (!rel.applicable) continue;
      denom++;
      if (rel.pass) pass++;
      else failures.push(`${r.personaId}:${rel.key}`);
    }
  }
  return {
    protocolId: "BCV-017",
    experimentId: "BCV-017",
    paramSetId: "struct",
    interpretationClass: "exploratory",
    results: { protocolId: "BCV-017", references: refs, rows, relationPass: pass, relationDenominator: denom, failures },
    summaryMd: [
      "# BCV-017 — Paradoxical persona battery",
      "",
      `Directional relation pass: ${pass} / ${denom} (not_applicable excluded).`,
      failures.length ? `Failing relations: ${failures.join(", ")}` : "No failing relations.",
      "",
      "Pass/fail uses only the §23.17.7 predicate with EPS_NUM; the reference is the §23.5.4 anchor.",
    ].join("\n"),
    manifest: {
      inputDomains: { personas: PERSONAS.map((p) => p.id) },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        personas: provenance("validation_plan", "§23.10", PERSONAS.map((p) => ({ id: p.id, expected: p.expected }))),
        references: provenance("validation_plan", "§23.5.4", REFERENCE_ANCHORS),
      },
      notes: "Full resolver + engines at persona table indices (WHtR from table). P1 is normalized from the Resolver\'s natural policy_not_frozen (FFMI+FFM open precedence); see IMPLEMENTATION_SPEC.md.",
    },
  };
}

export const bcv017: ProtocolDefinition = {
  protocolId: "BCV-017",
  experimentId: "BCV-017",
  streamCode: 17,
  title: "Paradoxical persona battery",
  interpretationClass: "exploratory",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv017Run();
  },
};
