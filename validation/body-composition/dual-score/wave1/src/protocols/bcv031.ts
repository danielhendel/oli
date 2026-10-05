/**
 * BCV-031 — Intersectional structural fairness (§23.12). HARD FAIL on hidden-path dependence.
 *
 * Score inputs are held identical; only the demographic / context dimension under test varies.
 * Non-scoring labels (athletic status, menopause, ethnicity structural labels, site) are attached to the
 * (unparsed) bundle object, subjectContext and observations so ANY hidden read would change the output.
 * Vendor is varied through the real `source.deviceFamily/deviceModel` fields; BMI-proxy through
 * metadata-only body_mass/bmi observations.
 */
import { EPS_NUM, STRUCTURAL_ANCHORS } from "../constants";
import type { Sex } from "../constants";
import { maxAbsViewDelta, viewFromScore } from "../engineView";
import type { EngineView } from "../engineView";
import { buildBundle, resolveAndScore } from "../scoringBundle";
import type { BundleSpec } from "../scoringBundle";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export const AGES = [20, 40, 60, 80] as const;
export const HEIGHTS = { short: 155, medium: 175, tall: 195 } as const;
export const BMI_PROXY = { low: 18.5, mid: 25.0, high: 35.0 } as const;
export const ATHLETIC = ["sedentary", "recreational", "trained"] as const;
export const MENOPAUSE = ["pre", "peri", "post"] as const;
export const ETHNICITY = ["group_a", "group_b", "group_c"] as const;
export const VENDORS = ["vendor_a", "vendor_b"] as const;
export const SITES = ["site_1", "site_2"] as const;

type Labels = Record<string, string | number>;

export type Case = {
  study: string;
  sex: Sex;
  levels: Labels;
  spec: BundleSpec;
  labels: Labels;
};

function anchorSpec(sex: Sex, over: Partial<BundleSpec> = {}): BundleSpec {
  const a = STRUCTURAL_ANCHORS[sex];
  return {
    sex,
    ageYears: 30,
    heightCm: a.heightCm,
    whtr: a.whtr,
    fmi: a.fmi,
    almi: a.almi,
    ffmi: a.ffmi,
    ...over,
  };
}

/** Attach non-scoring labels everywhere an engine could (incorrectly) read them. */
export function withLabels<T extends object>(bundle: T, labels: Labels): T {
  const b = bundle as Record<string, unknown>;
  const sc = (b.subjectContext ?? {}) as Record<string, unknown>;
  const obs = Array.isArray(b.observations) ? (b.observations as Array<Record<string, unknown>>) : null;
  return {
    ...bundle,
    validationLabels: { ...labels },
    subjectContext: { ...sc, ...labels },
    ...(obs
      ? {
          observations: obs.map((o) => ({
            ...o,
            source: { ...((o.source ?? {}) as Record<string, unknown>), ...(labels.site ? { site: labels.site } : {}) },
          })),
        }
      : {}),
  } as T;
}

export function allCases(): Case[] {
  const cases: Case[] = [];
  const sexes: Sex[] = ["male", "female"];
  for (const sex of sexes) {
    for (const age of AGES) {
      cases.push({ study: "age_x_sex", sex, levels: { age }, spec: anchorSpec(sex, { ageYears: age }), labels: {} });
    }
    for (const [name, h] of Object.entries(HEIGHTS)) {
      cases.push({ study: "height_x_sex", sex, levels: { height: name, heightCm: h }, spec: anchorSpec(sex, { heightCm: h }), labels: {} });
    }
    for (const [name, bmi] of Object.entries(BMI_PROXY)) {
      cases.push({ study: "bmi_proxy_x_sex", sex, levels: { bmiLabel: name, bmiProxy: bmi }, spec: anchorSpec(sex, { bmiProxy: bmi }), labels: { bmiLabel: name } });
    }
    for (const a of ATHLETIC) {
      cases.push({ study: "athletic_x_sex", sex, levels: { athleticStatus: a }, spec: anchorSpec(sex), labels: { athleticStatus: a } });
    }
    for (const e of ETHNICITY) {
      cases.push({ study: "ethnicity_x_sex", sex, levels: { ethnicityStructuralLabel: e }, spec: anchorSpec(sex), labels: { ethnicityStructuralLabel: e } });
    }
    for (const v of VENDORS) {
      for (const s of SITES) {
        cases.push({
          study: "vendor_x_site_x_sex",
          sex,
          levels: { vendor: v, site: s },
          spec: anchorSpec(sex, { deviceFamily: v, deviceModel: `${v}_model` }),
          labels: { vendor: v, site: s },
        });
      }
    }
  }
  for (const m of MENOPAUSE) {
    for (const age of AGES) {
      cases.push({
        study: "menopause_x_age",
        sex: "female",
        levels: { menopause: m, age },
        spec: anchorSpec("female", { ageYears: age }),
        labels: { menopauseStatus: m },
      });
    }
  }
  return cases;
}

export function evaluateCase(c: Case): EngineView {
  const bundle = withLabels(buildBundle(c.spec), c.labels);
  return viewFromScore(resolveAndScore(bundle, { normalizeP1: true }));
}

export function bcv031Run(): RunOutput {
  const cases = allCases();
  const evaluated = cases.map((c) => ({ c, view: evaluateCase(c) }));
  // group by study + sex; reference = first case in group
  const groups = new Map<string, Array<(typeof evaluated)[number]>>();
  for (const e of evaluated) {
    const k = `${e.c.study}|${e.c.sex}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
  }
  const groupResults = [...groups.entries()].map(([key, list]) => {
    const [study, sex] = key.split("|") as [string, Sex];
    const ref = list[0]!.view;
    let maxDelta = 0;
    const statusConsistent = list.every(
      (e) =>
        e.view.healthStatus === ref.healthStatus &&
        e.view.perfStatus === ref.perfStatus &&
        e.view.healthReason === ref.healthReason &&
        e.view.perfReason === ref.perfReason,
    );
    const pairwise: Array<{ a: Labels; b: Labels; maxAbsDelta: number }> = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = maxAbsViewDelta(list[i]!.view, list[j]!.view);
        pairwise.push({ a: list[i]!.c.levels, b: list[j]!.c.levels, maxAbsDelta: d });
        maxDelta = Math.max(maxDelta, d);
      }
    }
    const available = list.every((e) => e.view.healthScore != null && e.view.perfScore != null);
    return {
      study,
      sex,
      nLevels: list.length,
      maxAbsDelta: maxDelta,
      statusConsistent,
      allAvailable: available,
      invariancePass: available && statusConsistent && maxDelta <= EPS_NUM,
      pairwise,
    };
  });
  const failures = groupResults.filter((g) => !g.invariancePass);
  const hardFail = failures.length > 0;
  const csv = toCsv(
    ["study", "sex", "levels", "healthScore", "H1", "H2", "H3", "perfScore", "P1", "P3", "healthStatus", "perfStatus"],
    evaluated.map((e) => [
      e.c.study, e.c.sex, JSON.stringify(e.c.levels), e.view.healthScore, e.view.H1, e.view.H2, e.view.H3,
      e.view.perfScore, e.view.P1, e.view.P3, e.view.healthStatus, e.view.perfStatus,
    ]),
  );
  return {
    protocolId: "BCV-031",
    experimentId: "BCV-031",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    hardFail,
    results: {
      protocolId: "BCV-031",
      epsilon: EPS_NUM,
      hardFail,
      hiddenPathDependenceDetected: hardFail,
      groups: groupResults,
      failures: failures.map((f) => `${f.study}|${f.sex}`),
      cases: evaluated.map((e) => ({ study: e.c.study, sex: e.c.sex, levels: e.c.levels, view: e.view })),
      notes: "Empirical vendor/site/ethnicity/athletic bias is OUT OF SCOPE (structural code-path invariance only).",
    },
    csv,
    summaryMd: [
      "# BCV-031 — Intersectional structural fairness",
      "",
      `Groups: ${groupResults.length}; failing: ${failures.length}. HARD FAIL: ${hardFail}.`,
      "",
      "| study | sex | levels | max abs delta | status consistent | pass |",
      "|---|---|---|---|---|---|",
      ...groupResults.map((g) => `| ${g.study} | ${g.sex} | ${g.nLevels} | ${g.maxAbsDelta} | ${g.statusConsistent} | ${g.invariancePass} |`),
      "",
      "Any non-invariance on an unused factor is a hidden-path dependence and a HARD FAIL.",
    ].join("\n"),
    manifest: {
      inputDomains: { ages: AGES, heights: HEIGHTS, bmiProxy: BMI_PROXY, athletic: ATHLETIC, menopause: MENOPAUSE, ethnicity: ETHNICITY, vendors: VENDORS, sites: SITES },
      gridSteps: null,
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        levels: provenance("validation_plan", "§23.12.2", { AGES, HEIGHTS, BMI_PROXY, ATHLETIC, MENOPAUSE, ETHNICITY, VENDORS, SITES }),
        anchors: provenance("validation_plan", "§23.12.1", STRUCTURAL_ANCHORS),
      },
      notes: "Structural invariance only; hard fail on hidden-path dependence. P1 is normalized from the Resolver\'s natural policy_not_frozen (FFMI+FFM open precedence); see IMPLEMENTATION_SPEC.md.",
    },
  };
}

export const bcv031: ProtocolDefinition = {
  protocolId: "BCV-031",
  experimentId: "BCV-031",
  streamCode: 31,
  title: "Intersectional structural fairness",
  interpretationClass: "structural_invariant",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv031Run();
  },
};
