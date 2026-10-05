/**
 * BCV-018 — Contribution / adverse-hide analysis (§23.13, §23.17.1).
 * Companion-anchor combinations (single adverse; dual adverse pairs) + personas P-01..P-12.
 * adverse-hide: any construct < 40 while aggregate >= 70.
 */
import { SEXES } from "../constants";
import type { Sex } from "../constants";
import { adverseHide, changeContributions, contributionSummary } from "../contribution";
import type { ScoreFamily } from "../contribution";
import { PERSONAS } from "../personas";
import { scoreHealthPure, scorePerfPure } from "../scoringPure";
import { provenance } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export const HEALTH_FAVORABLE = {
  whtr: 0.4,
  fmi: { male: 5.5, female: 8.5 },
  almi: { male: 8.0, female: 6.3 },
} as const;
export const HEALTH_ADVERSE = {
  whtr: 0.8,
  fmi: { male: 15.0, female: 21.0 },
  almi: { male: 6.0, female: 4.5 },
} as const;
export const PERF_FAVORABLE = {
  ffmi: { male: 20.5, female: 17.5 },
  fmi: { male: 7.0, female: 10.0 },
} as const;
export const PERF_ADVERSE = {
  ffmi: { male: 16.0, female: 14.0 },
  fmi: { male: 16.0, female: 22.0 },
} as const;

export const HEALTH_COMBOS: ReadonlyArray<{ id: string; adverse: ReadonlyArray<"H1" | "H2" | "H3"> }> = [
  { id: "H1_adverse", adverse: ["H1"] },
  { id: "H2_adverse", adverse: ["H2"] },
  { id: "H3_adverse", adverse: ["H3"] },
  { id: "H1_H2_adverse", adverse: ["H1", "H2"] },
  { id: "H1_H3_adverse", adverse: ["H1", "H3"] },
  { id: "H2_H3_adverse", adverse: ["H2", "H3"] },
];
export const PERF_COMBOS: ReadonlyArray<{ id: string; adverse: ReadonlyArray<"P1" | "P3"> }> = [
  { id: "P1_adverse", adverse: ["P1"] },
  { id: "P3_adverse", adverse: ["P3"] },
  { id: "P1_P3_adverse", adverse: ["P1", "P3"] },
];

function healthRow(sex: Sex, adverse: ReadonlyArray<string>, id: string) {
  const adv = (c: string) => adverse.includes(c);
  const inputs = {
    whtr: adv("H1") ? HEALTH_ADVERSE.whtr : HEALTH_FAVORABLE.whtr,
    fmi: (adv("H2") ? HEALTH_ADVERSE : HEALTH_FAVORABLE).fmi[sex],
    almi: (adv("H3") ? HEALTH_ADVERSE : HEALTH_FAVORABLE).almi[sex],
  };
  return evaluateHealth(sex, id, inputs, adverse);
}

function evaluateHealth(
  sex: Sex,
  id: string,
  inputs: { whtr: number; fmi: number; almi: number },
  adverse: ReadonlyArray<string>,
) {
  const r = scoreHealthPure(sex, { whtr: inputs.whtr, fmi: inputs.fmi, h3Kind: "ALMI", h3Value: inputs.almi });
  const fav = scoreHealthPure(sex, {
    whtr: HEALTH_FAVORABLE.whtr,
    fmi: HEALTH_FAVORABLE.fmi[sex],
    h3Kind: "ALMI",
    h3Value: HEALTH_FAVORABLE.almi[sex],
  });
  return buildRow("health", sex, id, inputs, adverse, r, fav);
}

function buildRow(
  family: ScoreFamily,
  sex: Sex,
  id: string,
  inputs: Record<string, number>,
  adverse: ReadonlyArray<string>,
  r: { aggregate: number | null; unclippedAggregate: number | null } & Record<string, number | null>,
  fav: Record<string, number | null>,
) {
  const keys = family === "health" ? ["H1", "H2", "H3"] : ["P1", "P3"];
  const scores = Object.fromEntries(keys.map((k) => [k, r[k]])) as Record<string, number | null>;
  const favScores = Object.fromEntries(keys.map((k) => [k, fav[k]])) as Record<string, number | null>;
  const complete = keys.every((k) => scores[k] != null && favScores[k] != null);
  const sc = scores as Record<string, number>;
  const fv = favScores as Record<string, number>;
  return {
    family,
    sex,
    id,
    adverseConstructs: adverse,
    inputs,
    constructScores: scores,
    aggregate: r.aggregate,
    unclippedAggregate: r.unclippedAggregate,
    contribution: complete ? contributionSummary(family, sc) : null,
    changeVsAllFavorable: complete ? changeContributions(family, fv, sc) : null,
    adverseHide:
      complete && r.aggregate != null ? adverseHide(keys.map((k) => sc[k] as number), r.aggregate) : null,
  };
}

function perfRow(sex: Sex, adverse: ReadonlyArray<string>, id: string) {
  const adv = (c: string) => adverse.includes(c);
  const inputs = {
    ffmi: (adv("P1") ? PERF_ADVERSE : PERF_FAVORABLE).ffmi[sex],
    fmi: (adv("P3") ? PERF_ADVERSE : PERF_FAVORABLE).fmi[sex],
  };
  const r = scorePerfPure(sex, inputs);
  const fav = scorePerfPure(sex, { ffmi: PERF_FAVORABLE.ffmi[sex], fmi: PERF_FAVORABLE.fmi[sex] });
  return buildRow("performance", sex, id, inputs, adverse, r, fav);
}

export function bcv018Rows() {
  const combos: Array<ReturnType<typeof healthRow> | ReturnType<typeof perfRow>> = [];
  for (const sex of SEXES) {
    combos.push(healthRow(sex, [], "H_all_favorable"));
    for (const c of HEALTH_COMBOS) combos.push(healthRow(sex, c.adverse, c.id));
    combos.push(perfRow(sex, [], "P_all_favorable"));
    for (const c of PERF_COMBOS) combos.push(perfRow(sex, c.adverse, c.id));
  }
  const personas = PERSONAS.flatMap((p) => {
    const h = evaluateHealth(p.sex, `${p.id}_health`, { whtr: p.whtr, fmi: p.fmi, almi: p.almi }, []);
    const pf = scorePerfPure(p.sex, { ffmi: p.ffmi, fmi: p.fmi });
    const pfFav = scorePerfPure(p.sex, { ffmi: PERF_FAVORABLE.ffmi[p.sex], fmi: PERF_FAVORABLE.fmi[p.sex] });
    return [
      { personaId: p.id, ...h },
      { personaId: p.id, ...buildRow("performance", p.sex, `${p.id}_performance`, { ffmi: p.ffmi, fmi: p.fmi }, [], pf, pfFav) },
    ];
  });
  return { combos, personas };
}

export function bcv018Run(): RunOutput {
  const { combos, personas } = bcv018Rows();
  const hides = [...combos, ...personas].filter((r) => r.adverseHide === true).map((r) => `${r.sex}:${r.id}`);
  return {
    protocolId: "BCV-018",
    experimentId: "BCV-018",
    paramSetId: "struct",
    interpretationClass: "exploratory",
    results: {
      protocolId: "BCV-018",
      companions: { HEALTH_FAVORABLE, HEALTH_ADVERSE, PERF_FAVORABLE, PERF_ADVERSE },
      combos,
      personas,
      adverseHideRows: hides,
    },
    summaryMd: [
      "# BCV-018 — Contribution / adverse-hide",
      "",
      `Combination rows: ${combos.length}; persona rows: ${personas.length}.`,
      `Adverse-hide (any construct < 40 while aggregate >= 70): ${hides.length === 0 ? "none" : hides.join(", ")}.`,
      "",
      "Metrics are the §23.17.1 fields only: absoluteContribution, marginalContributionPerConstructPoint, weightedDeficit, dominantAdverseConstruct, changeContribution.",
    ].join("\n"),
    manifest: {
      inputDomains: { HEALTH_FAVORABLE, HEALTH_ADVERSE, PERF_FAVORABLE, PERF_ADVERSE },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        companions: provenance("validation_plan", "§23.13 BCV-018", { HEALTH_FAVORABLE, HEALTH_ADVERSE, PERF_FAVORABLE, PERF_ADVERSE }),
        weights: provenance("mathematical_freeze", "§23.17.1", { H1: 0.45, H2: 0.35, H3: 0.2, P1: 0.5, P3: 0.5 }),
      },
      notes: "Pure-transform scoring (approved transforms); H3 ALMI primary.",
      epsilon: false,
    },
  };
}

export const bcv018: ProtocolDefinition = {
  protocolId: "BCV-018",
  experimentId: "BCV-018",
  streamCode: 18,
  title: "Contribution / adverse-hide",
  interpretationClass: "exploratory",
  emitsCsv: false,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv018Run();
  },
};
