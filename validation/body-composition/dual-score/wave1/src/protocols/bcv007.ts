/**
 * BCV-007 — Sex fairness (structural + exploratory) (§23.12.1).
 * Documents sex-specific transform differences at the sex-matched anchors. NOT assumed fair.
 */
import { STRUCTURAL_ANCHORS } from "../constants";
import type { Sex } from "../constants";
import { constructFn } from "../scoringPure";
import { engineView } from "../engineView";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";
import type { ConstructKey } from "../domains";

/** Common raw probe values evaluated under BOTH sex transforms (transform contrast). */
export const BCV007_PROBES: Record<Exclude<ConstructKey, never>, readonly number[]> = {
  H1: [0.4, 0.5, 0.6],
  H2: [3.5, 5.5, 8.5, 13.0],
  H3_ALMI: [4.5, 5.5, 6.3, 8.0],
  H3_FFMI: [14.0, 16.0, 18.5],
  P1: [14.0, 16.5, 19.0],
  P3: [3.5, 7.0, 10.0, 14.0],
};

export function bcv007Run(): RunOutput {
  const anchorScores = (["male", "female"] as Sex[]).map((sex) => {
    const a = STRUCTURAL_ANCHORS[sex];
    return {
      sex,
      anchors: a,
      engine: engineView({
        sex,
        ageYears: 30,
        heightCm: a.heightCm,
        whtr: a.whtr,
        fmi: a.fmi,
        almi: a.almi,
        ffmi: a.ffmi,
      }),
    };
  });
  const contrasts: Array<{ construct: string; x: number; male: number | null; female: number | null; delta: number | null }> = [];
  for (const [construct, xs] of Object.entries(BCV007_PROBES)) {
    const fm = constructFn(construct as ConstructKey, "male");
    const ff = constructFn(construct as ConstructKey, "female");
    for (const x of xs) {
      const m = fm(x);
      const f = ff(x);
      contrasts.push({ construct, x, male: m, female: f, delta: m == null || f == null ? null : f - m });
    }
  }
  const pairwise = {
    healthAggregate: diff(anchorScores[1]!.engine.healthScore, anchorScores[0]!.engine.healthScore),
    perfAggregate: diff(anchorScores[1]!.engine.perfScore, anchorScores[0]!.engine.perfScore),
    note: "female minus male at sex-matched structural anchors; not a claim of biological equivalence",
  };
  return {
    protocolId: "BCV-007",
    experimentId: "BCV-007",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: { protocolId: "BCV-007", anchorScores, transformContrasts: contrasts, pairwise, assumedFair: false },
    csv: toCsv(
      ["construct", "x", "maleScore", "femaleScore", "delta"],
      contrasts.map((c) => [c.construct, c.x, c.male, c.female, c.delta]),
    ),
    summaryMd: [
      "# BCV-007 — Sex fairness (structural + exploratory)",
      "",
      `Anchor aggregate scores — male: Health ${anchorScores[0]!.engine.healthScore}, Performance ${anchorScores[0]!.engine.perfScore}; ` +
        `female: Health ${anchorScores[1]!.engine.healthScore}, Performance ${anchorScores[1]!.engine.perfScore}.`,
      "",
      "Transform contrasts evaluate the SAME raw input under the male and female sex-specific transforms.",
      "Differences are documented, not assumed fair. H1 (WHtR) is sex-independent.",
    ].join("\n"),
    manifest: {
      inputDomains: { anchors: STRUCTURAL_ANCHORS, probes: BCV007_PROBES },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        anchors: provenance("validation_plan", "§23.12.1", STRUCTURAL_ANCHORS),
        probes: provenance("synthetic_fallback", "BCV-007 probe values (knot-adjacent)", BCV007_PROBES),
      },
      notes: "Sex-specific transform differences documented; fairness not assumed. P1 is normalized from the Resolver\'s natural policy_not_frozen (FFMI+FFM open precedence); see IMPLEMENTATION_SPEC.md.",
    },
  };
}

function diff(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : a - b;
}

export const bcv007: ProtocolDefinition = {
  protocolId: "BCV-007",
  experimentId: "BCV-007",
  streamCode: 7,
  title: "Sex fairness (structural)",
  interpretationClass: "structural_invariant",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv007Run();
  },
};
