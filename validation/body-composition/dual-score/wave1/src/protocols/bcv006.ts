/**
 * BCV-006 — Age fairness (structural) (§23.12.2). Ages {20,40,60,80} × sex structural anchors.
 * Full resolver + score engines. Expected: identical scores (|Δ| <= EPS_NUM).
 */
import { EPS_NUM, STRUCTURAL_ANCHORS } from "../constants";
import type { Sex } from "../constants";
import { maxAbsViewDelta, engineView } from "../engineView";
import type { EngineView } from "../engineView";
import { dobForCompletedAge } from "../identity";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export const BCV006_AGES = [20, 40, 60, 80] as const;
const SEXES: Sex[] = ["male", "female"];

export function bcv006Rows() {
  const rows: Array<{ sex: Sex; age: number; dateOfBirth: string; view: EngineView }> = [];
  for (const sex of SEXES) {
    const a = STRUCTURAL_ANCHORS[sex];
    for (const age of BCV006_AGES) {
      rows.push({
        sex,
        age,
        dateOfBirth: dobForCompletedAge(age),
        view: engineView({
          sex,
          ageYears: age,
          heightCm: a.heightCm,
          whtr: a.whtr,
          fmi: a.fmi,
          almi: a.almi,
          ffmi: a.ffmi,
        }),
      });
    }
  }
  return rows;
}

export function bcv006Run(): RunOutput {
  const rows = bcv006Rows();
  const bySex = SEXES.map((sex) => {
    const sub = rows.filter((r) => r.sex === sex);
    const ref = sub[0]!.view;
    let maxDelta = 0;
    const pairwise: Array<{ ageA: number; ageB: number; maxAbsDelta: number }> = [];
    for (let i = 0; i < sub.length; i++) {
      for (let j = i + 1; j < sub.length; j++) {
        const d = maxAbsViewDelta(sub[i]!.view, sub[j]!.view);
        pairwise.push({ ageA: sub[i]!.age, ageB: sub[j]!.age, maxAbsDelta: d });
        maxDelta = Math.max(maxDelta, d);
      }
    }
    const allAvailable = sub.every((r) => r.view.healthScore != null && r.view.perfScore != null);
    return {
      sex,
      anchors: STRUCTURAL_ANCHORS[sex],
      referenceAge: sub[0]!.age,
      referenceScores: ref,
      pairwise,
      maxAbsDelta: maxDelta,
      allAvailable,
      invariancePass: allAvailable && maxDelta <= EPS_NUM,
    };
  });
  const pass = bySex.every((s) => s.invariancePass);
  const csv = toCsv(
    ["sex", "age", "dateOfBirth", "healthScore", "H1", "H2", "H3", "perfScore", "P1", "P3", "healthStatus", "perfStatus"],
    rows.map((r) => [
      r.sex, r.age, r.dateOfBirth, r.view.healthScore, r.view.H1, r.view.H2, r.view.H3,
      r.view.perfScore, r.view.P1, r.view.P3, r.view.healthStatus, r.view.perfStatus,
    ]),
  );
  return {
    protocolId: "BCV-006",
    experimentId: "BCV-006",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: { protocolId: "BCV-006", ages: BCV006_AGES, epsilon: EPS_NUM, rows, bySex, invariancePass: pass },
    csv,
    summaryMd: [
      "# BCV-006 — Age fairness (structural)",
      "",
      `Ages ${BCV006_AGES.join(", ")} at asOf; DOB = (2026 - age)-10-04.`,
      "",
      ...bySex.map((s) => `- ${s.sex}: max |Delta| = ${s.maxAbsDelta}; invariance pass = ${s.invariancePass}`),
      "",
      `Overall invariance pass (EPS_NUM): ${pass}`,
      "",
      "Structural result only; no empirical age-fairness claim.",
    ].join("\n"),
    manifest: {
      inputDomains: { ages: BCV006_AGES, anchors: STRUCTURAL_ANCHORS },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        ages: provenance("validation_plan", "§23.12.2", BCV006_AGES),
        anchors: provenance("validation_plan", "§23.12.1", STRUCTURAL_ANCHORS),
      },
      notes: "Structural age invariance via full resolver + engines. P1 is normalized from the Resolver\'s natural policy_not_frozen (FFMI+FFM open precedence); see IMPLEMENTATION_SPEC.md.",
    },
  };
}

export const bcv006: ProtocolDefinition = {
  protocolId: "BCV-006",
  experimentId: "BCV-006",
  streamCode: 6,
  title: "Age fairness (structural)",
  interpretationClass: "structural_invariant",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv006Run();
  },
};
