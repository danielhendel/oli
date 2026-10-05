/**
 * BCV-016 — Temporal coherence (§23.11 S-01…S-15). Full resolver + score engines on the P-01 subject.
 * Compared against an independent oracle of the frozen 180d / 90d rules (schedules.expectedEligibility).
 */
import { personaById } from "../personas";
import { buildBundle, resolveAndScore } from "../scoringBundle";
import { viewFromScore } from "../engineView";
import { SCHEDULES, applySchedule, expectedEligibility, scheduleTimestamps } from "../schedules";
import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

const ELIGIBLE = "calculated_internal_not_public";

export function bcv016Rows() {
  const p = personaById("P-01");
  return SCHEDULES.map((s) => {
    const spec = applySchedule(
      { sex: p.sex, ageYears: p.age, heightCm: p.heightCm, whtr: p.whtr, fmi: p.fmi, almi: p.almi, ffmi: p.ffmi },
      s,
    );
    const view = viewFromScore(resolveAndScore(buildBundle(spec), { normalizeP1: true }));
    const exp = expectedEligibility(s);
    const healthEligible = view.healthStatus === ELIGIBLE;
    const perfEligible = view.perfStatus === ELIGIBLE;
    const t = scheduleTimestamps(s);
    return {
      scheduleId: s.id,
      definition: s.definition,
      timestamps: t,
      dxaScanRef: s.dxaScanRef,
      waistSourceEventId: s.waistSourceEventId,
      dxaSourceEventId: s.dxaSourceEventId,
      health: {
        eligible: healthEligible,
        score: view.healthScore,
        primaryReason: view.healthReason,
        ageGateHit: view.healthReason === "evidence_too_old",
        eraGateHit: view.healthReason === "evidence_era_mismatch",
      },
      performance: {
        eligible: perfEligible,
        score: view.perfScore,
        primaryReason: view.perfReason,
        ageGateHit: view.perfReason === "evidence_too_old",
        eraGateHit: view.perfReason === "evidence_era_mismatch",
      },
      expected: exp,
      structuralPass:
        exp.health.eligible === healthEligible &&
        exp.performance.eligible === perfEligible &&
        (exp.health.eligible || exp.health.reason === view.healthReason) &&
        (exp.performance.eligible || exp.performance.reason === view.perfReason),
    };
  });
}

export function bcv016Run(): RunOutput {
  const rows = bcv016Rows();
  const failing = rows.filter((r) => !r.structuralPass);
  return {
    protocolId: "BCV-016",
    experimentId: "BCV-016",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: { protocolId: "BCV-016", asOf: "2026-10-04T12:00:00.000Z", rows, failing: failing.map((r) => r.scheduleId) },
    summaryMd: [
      "# BCV-016 — Temporal coherence (S-01…S-15)",
      "",
      "| schedule | health eligible | health reason | perf eligible | perf reason | oracle match |",
      "|---|---|---|---|---|---|",
      ...rows.map(
        (r) =>
          `| ${r.scheduleId} | ${r.health.eligible} | ${r.health.primaryReason ?? ""} | ${r.performance.eligible} | ${r.performance.primaryReason ?? ""} | ${r.structuralPass} |`,
      ),
      "",
      failing.length === 0 ? "All schedules match the independent freeze-rule oracle." : `Mismatches: ${failing.map((r) => r.scheduleId).join(", ")}`,
    ].join("\n"),
    manifest: {
      inputDomains: { subject: "P-01", schedules: SCHEDULES.map((s) => s.id) },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: "S-01..S-15",
      personaId: "P-01",
      parameterProvenance: {
        schedules: provenance("validation_plan", "§23.11", SCHEDULES.map((s) => ({ id: s.id, definition: s.definition }))),
      },
      notes: "Eligibility vs independent oracle of the 180d input-age / 90d era-gap rules. P1 is normalized from the Resolver\'s natural policy_not_frozen (FFMI+FFM open precedence); see IMPLEMENTATION_SPEC.md.",
      epsilon: false,
    },
  };
}

export const bcv016: ProtocolDefinition = {
  protocolId: "BCV-016",
  experimentId: "BCV-016",
  streamCode: 16,
  title: "Temporal coherence",
  interpretationClass: "structural_invariant",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv016Run();
  },
};
