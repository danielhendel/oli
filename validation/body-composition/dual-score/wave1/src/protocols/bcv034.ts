/**
 * BCV-034 — Acute-state sensitivity simulation (§23.13, §23.17.8). Deterministic scenario matrix.
 * Baselines P-01, P-08, P-11, P-12. Synthetic fallback perturbations — NOT empirical.
 * falseImprovementRate excludes the BASE scenario (BASE vs BASE is identically 0).
 */
import { ACUTE_BASELINE_PERSONAS, ACUTE_LABEL, ACUTE_SCENARIOS, applyScenario, falseImprovementIndicator, falseImprovementRate, scenarioApplies } from "../acute";
import { changeContributions } from "../contribution";
import { personaById } from "../personas";
import { scoreHealthPure, scorePerfPure } from "../scoringPure";
import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

type Triple = { H1: number; H2: number; H3: number } | null;
type Pair = { P1: number; P3: number } | null;

export function bcv034Rows() {
  const rows: Array<Record<string, unknown>> = [];
  for (const pid of ACUTE_BASELINE_PERSONAS) {
    const p = personaById(pid);
    const score = (s: (typeof ACUTE_SCENARIOS)[number]) => {
      const x = applyScenario(p, s);
      const h = scoreHealthPure(p.sex, { whtr: x.whtr, fmi: x.fmi, h3Kind: "ALMI", h3Value: x.almi });
      const f = scorePerfPure(p.sex, { ffmi: x.ffmi, fmi: x.fmi });
      const ht: Triple = h.H1 != null && h.H2 != null && h.H3 != null ? { H1: h.H1, H2: h.H2, H3: h.H3 } : null;
      const pt: Pair = f.P1 != null && f.P3 != null ? { P1: f.P1, P3: f.P3 } : null;
      return { x, h, f, ht, pt };
    };
    const base = score(ACUTE_SCENARIOS[0]!);
    for (const s of ACUTE_SCENARIOS) {
      if (!scenarioApplies(s, p)) {
        rows.push({ personaId: pid, sex: p.sex, scenarioId: s.id, applicable: false, reason: "menstrual scenarios apply to female baselines only" });
        continue;
      }
      const cur = score(s);
      const dHealth = cur.h.aggregate != null && base.h.aggregate != null ? cur.h.aggregate - base.h.aggregate : null;
      const dPerf = cur.f.aggregate != null && base.f.aggregate != null ? cur.f.aggregate - base.f.aggregate : null;
      rows.push({
        personaId: pid,
        sex: p.sex,
        scenarioId: s.id,
        applicable: true,
        deltas: { dFfmKg: s.dFfmKg, dAlmKg: s.dAlmKg, dWaistCm: s.dWaistCm },
        indices: cur.x,
        baseIndices: base.x,
        health: {
          constructScores: cur.ht,
          aggregate: cur.h.aggregate,
          baseAggregate: base.h.aggregate,
          aggregateDelta: dHealth,
          changeContribution: cur.ht && base.ht ? changeContributions("health", base.ht, cur.ht) : null,
          falseImprovementIndicator: falseImprovementIndicator(base.h.aggregate, cur.h.aggregate),
        },
        performance: {
          constructScores: cur.pt,
          aggregate: cur.f.aggregate,
          baseAggregate: base.f.aggregate,
          aggregateDelta: dPerf,
          changeContribution: cur.pt && base.pt ? changeContributions("performance", base.pt, cur.pt) : null,
          falseImprovementIndicator: falseImprovementIndicator(base.f.aggregate, cur.f.aggregate),
        },
        label: ACUTE_LABEL,
      });
    }
  }
  return rows;
}

export function bcv034Run(): RunOutput {
  const rows = bcv034Rows();
  const applicable = rows.filter((r) => r.applicable === true && r.scenarioId !== "BASE");
  const collect = (fam: "health" | "performance", filter: (r: Record<string, unknown>) => boolean) =>
    applicable
      .filter(filter)
      .map((r) => (r[fam] as { falseImprovementIndicator: 0 | 1 | null }).falseImprovementIndicator);
  const byPersona = ACUTE_BASELINE_PERSONAS.map((pid) => ({
    personaId: pid,
    health: falseImprovementRate(collect("health", (r) => r.personaId === pid)),
    performance: falseImprovementRate(collect("performance", (r) => r.personaId === pid)),
  }));
  const overall = {
    health: falseImprovementRate(collect("health", () => true)),
    performance: falseImprovementRate(collect("performance", () => true)),
  };
  return {
    protocolId: "BCV-034",
    experimentId: "BCV-034",
    paramSetId: "struct",
    interpretationClass: "evidence_dependent_acceptance",
    results: {
      protocolId: "BCV-034",
      label: ACUTE_LABEL,
      scenarioMatrix: ACUTE_SCENARIOS,
      rows,
      falseImprovement: { excludes: "BASE", byPersona, overall },
      definition: "falseImprovementIndicator = 1 iff scenarioAggregate - baseAggregate > EPS_NUM; not a clinical false-positive rate.",
    },
    summaryMd: [
      "# BCV-034 — Acute-state sensitivity simulation",
      "",
      `Label: ${ACUTE_LABEL}.`,
      `Health false-improvement rate (excl. BASE): ${overall.health.rate} (${overall.health.numerator}/${overall.health.denominator}, unavailable ${overall.health.unavailableCount}).`,
      `Performance false-improvement rate (excl. BASE): ${overall.performance.rate} (${overall.performance.numerator}/${overall.performance.denominator}, unavailable ${overall.performance.unavailableCount}).`,
      "",
      "Synthetic fallback perturbations; ER-BC-16 may later replace. Apparent improvement is NOT validated biological change.",
    ].join("\n"),
    manifest: {
      inputDomains: { baselines: ACUTE_BASELINE_PERSONAS },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        scenarioMatrix: provenance("validation_plan", "§23.13 BCV-034", ACUTE_SCENARIOS),
        label: provenance("synthetic_fallback", "§23.13 BCV-034", ACUTE_LABEL),
      },
      notes: "Deterministic; weight metadata only; FM/FMI unchanged by the Wave 1 matrix.",
    },
  };
}

export const bcv034: ProtocolDefinition = {
  protocolId: "BCV-034",
  experimentId: "BCV-034",
  streamCode: 34,
  title: "Acute-state simulation",
  interpretationClass: "evidence_dependent_acceptance",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv034Run();
  },
};
