/**
 * BCV-012 — Sensitivity map (§23.13). Deterministic.
 *
 * Contexts: explicit knot-pair centers (companions at §23.5.4 references) and personas P-01..P-12
 * (companions at the persona's own indices). OAT central differences at WHtR {EPS_SURF,0.01,0.1} and
 * FMI/ALMI/FFMI {EPS_SURF,0.1,0.5}; joint finite differences for the six surface pairs with signs
 * (+,+) (+,-) (-,+) (-,-) at EPS_SURF on both axes. Normalized sensitivity = |slope| * DOMAIN_RANGE.
 */

import { EPS_SURF, REFERENCE_ANCHORS, SEXES } from "../constants";
import type { Sex } from "../constants";
import {
  CONSTRUCT_KEYS,
  OAT_STEPS,
  SENSITIVITY_CENTERS,
  SURFACES,
  domainOf,
  domainRangeOf,
  variableOfConstruct,
} from "../domains";
import type { ConstructKey } from "../domains";
import { changeContributions, contributionSummary } from "../contribution";
import type { ScoreFamily } from "../contribution";
import { PERSONAS } from "../personas";
import { constructFn, scoreHealthPure, scorePerfPure } from "../scoringPure";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

type Base = { whtr: number; fmi: number; almi: number; ffmi: number };
type Over = Partial<Record<ConstructKey, number>>;

export function familyOf(c: ConstructKey): ScoreFamily {
  return c === "P1" || c === "P3" ? "performance" : "health";
}

export function evalAt(
  family: ScoreFamily,
  kind: "ALMI" | "FFMI",
  sex: Sex,
  base: Base,
  over: Over,
): { scores: Record<string, number> | null; aggregate: number | null } {
  if (family === "health") {
    const r = scoreHealthPure(sex, {
      whtr: over.H1 ?? base.whtr,
      fmi: over.H2 ?? base.fmi,
      h3Kind: kind,
      h3Value: kind === "ALMI" ? (over.H3_ALMI ?? base.almi) : (over.H3_FFMI ?? base.ffmi),
    });
    if (r.H1 == null || r.H2 == null || r.H3 == null) return { scores: null, aggregate: r.aggregate };
    return { scores: { H1: r.H1, H2: r.H2, H3: r.H3 }, aggregate: r.aggregate };
  }
  const r = scorePerfPure(sex, { ffmi: over.P1 ?? base.ffmi, fmi: over.P3 ?? base.fmi });
  if (r.P1 == null || r.P3 == null) return { scores: null, aggregate: r.aggregate };
  return { scores: { P1: r.P1, P3: r.P3 }, aggregate: r.aggregate };
}

function valueOfConstruct(c: ConstructKey, b: Base): number {
  switch (variableOfConstruct(c)) {
    case "whtr":
      return b.whtr;
    case "fmi":
      return b.fmi;
    case "almi":
      return b.almi;
    case "ffmi":
      return b.ffmi;
  }
}

const kindOf = (c: ConstructKey): "ALMI" | "FFMI" => (c === "H3_FFMI" ? "FFMI" : "ALMI");

type Ctx = { context: "center" | "persona"; contextId: string; sex: Sex; base: Base };

function contexts(): Ctx[] {
  const out: Ctx[] = [];
  for (const sex of SEXES) {
    for (const c of CONSTRUCT_KEYS) {
      for (const x of SENSITIVITY_CENTERS[c][sex]) {
        out.push({ context: "center", contextId: `${c}@${x}`, sex, base: { ...REFERENCE_ANCHORS[sex] } });
      }
    }
  }
  for (const p of PERSONAS) {
    out.push({
      context: "persona",
      contextId: p.id,
      sex: p.sex,
      base: { whtr: p.whtr, fmi: p.fmi, almi: p.almi, ffmi: p.ffmi },
    });
  }
  return out;
}

export function oatRows() {
  const rows: Array<Record<string, unknown>> = [];
  for (const sex of SEXES) {
    // centers: each (construct, center) is its own sweep point
    for (const c of CONSTRUCT_KEYS) {
      for (const x of SENSITIVITY_CENTERS[c][sex]) {
        rows.push(...oatAtPoint({ context: "center", contextId: `${c}@${x}`, sex, base: REFERENCE_ANCHORS[sex] }, c, x));
      }
    }
  }
  for (const p of PERSONAS) {
    const base: Base = { whtr: p.whtr, fmi: p.fmi, almi: p.almi, ffmi: p.ffmi };
    const ctx: Ctx = { context: "persona", contextId: p.id, sex: p.sex, base };
    for (const c of CONSTRUCT_KEYS) rows.push(...oatAtPoint(ctx, c, valueOfConstruct(c, base)));
  }
  return rows;
}

function oatAtPoint(ctx: Ctx, c: ConstructKey, x: number): Array<Record<string, unknown>> {
  const variable = variableOfConstruct(c);
  const fn = constructFn(c, ctx.sex);
  const [lo, hi] = domainOf(variable, ctx.sex);
  const family = familyOf(c);
  const kind = kindOf(c);
  const range = domainRangeOf(variable, ctx.sex);
  const baseEval = evalAt(family, kind, ctx.sex, ctx.base, { [c]: x });
  const baseContribution = baseEval.scores ? contributionSummary(family, baseEval.scores) : null;
  const out: Array<Record<string, unknown>> = [];
  for (const h of OAT_STEPS[variable]) {
    const inDomain = x - h >= lo && x + h <= hi;
    const fp = inDomain ? fn(x + h) : null;
    const fm = inDomain ? fn(x - h) : null;
    const slope = fp == null || fm == null ? null : (fp - fm) / (2 * h);
    const plus = inDomain ? evalAt(family, kind, ctx.sex, ctx.base, { [c]: x + h }) : null;
    const minus = inDomain ? evalAt(family, kind, ctx.sex, ctx.base, { [c]: x - h }) : null;
    const aggregateDelta =
      plus?.aggregate != null && minus?.aggregate != null ? plus.aggregate - minus.aggregate : null;
    const change =
      plus?.scores && minus?.scores ? changeContributions(family, minus.scores, plus.scores) : null;
    out.push({
      context: ctx.context,
      contextId: ctx.contextId,
      sex: ctx.sex,
      construct: c,
      family,
      x,
      step: h,
      localSlope: slope,
      normalizedSensitivity: slope == null ? null : Math.abs(slope) * range,
      domainRange: range,
      baseAggregate: baseEval.aggregate,
      aggregateDelta,
      baseContribution,
      changeContribution: change,
    });
  }
  return out;
}

const SIGNS: ReadonlyArray<readonly [1 | -1, 1 | -1]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function jointRows() {
  const rows: Array<Record<string, unknown>> = [];
  const push = (ctx: Ctx, s: (typeof SURFACES)[number], xv: number, yv: number) => {
    const family: ScoreFamily = s.id.startsWith("PERFORMANCE") ? "performance" : "health";
    const kind = s.h3Primary ?? "ALMI";
    const base = evalAt(family, kind, ctx.sex, ctx.base, { [s.x]: xv, [s.y]: yv });
    for (const [sx, sy] of SIGNS) {
      const pt = evalAt(family, kind, ctx.sex, ctx.base, {
        [s.x]: xv + sx * EPS_SURF,
        [s.y]: yv + sy * EPS_SURF,
      });
      const d = base.aggregate != null && pt.aggregate != null ? pt.aggregate - base.aggregate : null;
      rows.push({
        context: ctx.context,
        contextId: ctx.contextId,
        sex: ctx.sex,
        surfaceId: s.id,
        x: xv,
        y: yv,
        signX: sx,
        signY: sy,
        eps: EPS_SURF,
        baseAggregate: base.aggregate,
        aggregateDelta: d,
        aggregateDeltaPerEps: d == null ? null : d / EPS_SURF,
      });
    }
  };
  for (const sex of SEXES) {
    const ctx0: Ctx = { context: "center", contextId: "centers", sex, base: REFERENCE_ANCHORS[sex] };
    for (const s of SURFACES) {
      for (const xv of SENSITIVITY_CENTERS[s.x][sex]) {
        for (const yv of SENSITIVITY_CENTERS[s.y][sex]) {
          push({ ...ctx0, contextId: `${s.id}@${xv},${yv}` }, s, xv, yv);
        }
      }
    }
  }
  for (const p of PERSONAS) {
    const base: Base = { whtr: p.whtr, fmi: p.fmi, almi: p.almi, ffmi: p.ffmi };
    for (const s of SURFACES) {
      push({ context: "persona", contextId: p.id, sex: p.sex, base }, s, valueOfConstruct(s.x, base), valueOfConstruct(s.y, base));
    }
  }
  return rows;
}

export const BCV012_CSV_HEADERS = [
  "kind",
  "context",
  "contextId",
  "sex",
  "id",
  "x",
  "y",
  "step",
  "signX",
  "signY",
  "localSlope",
  "normalizedSensitivity",
  "baseAggregate",
  "aggregateDelta",
] as const;

export function bcv012Run(): RunOutput {
  const oat = oatRows();
  const joint = jointRows();
  const csvRows: unknown[][] = [];
  for (const r of oat) {
    csvRows.push([
      "oat", r.context, r.contextId, r.sex, r.construct, r.x, "", r.step, "", "",
      r.localSlope, r.normalizedSensitivity, r.baseAggregate, r.aggregateDelta,
    ]);
  }
  for (const r of joint) {
    csvRows.push([
      "joint", r.context, r.contextId, r.sex, r.surfaceId, r.x, r.y, r.eps, r.signX, r.signY,
      r.aggregateDeltaPerEps, "", r.baseAggregate, r.aggregateDelta,
    ]);
  }
  const maxNorm = oat.reduce((m, r) => Math.max(m, (r.normalizedSensitivity as number | null) ?? 0), 0);
  return {
    protocolId: "BCV-012",
    experimentId: "BCV-012",
    paramSetId: "struct",
    interpretationClass: "exploratory",
    results: {
      protocolId: "BCV-012",
      centers: SENSITIVITY_CENTERS,
      oatSteps: OAT_STEPS,
      jointSigns: SIGNS,
      normalization: "|dScore/dx| * DOMAIN_RANGE (§23.5); no data-derived normalization",
      oat,
      joint,
      counts: { oat: oat.length, joint: joint.length, contexts: contexts().length },
    },
    csv: toCsv(BCV012_CSV_HEADERS, csvRows),
    summaryMd: [
      "# BCV-012 — Sensitivity map",
      "",
      `OAT rows: ${oat.length}; joint FD rows: ${joint.length}; max normalized sensitivity: ${maxNorm.toFixed(4)}.`,
      "",
      "Central differences (f(x+h)-f(x-h))/(2h) where defined; joint signs (+,+) (+,-) (-,+) (-,-) at EPS_SURF on both axes.",
      "Contribution fields follow §23.17.1 only.",
    ].join("\n"),
    manifest: {
      inputDomains: { centers: SENSITIVITY_CENTERS, personas: PERSONAS.map((p) => p.id) },
      gridSteps: { oatSteps: OAT_STEPS, jointEps: EPS_SURF },
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        centers: provenance("validation_plan", "§23.13 BCV-012", SENSITIVITY_CENTERS),
        oatSteps: provenance("validation_plan", "§23.13 BCV-012", OAT_STEPS),
        referenceAnchors: provenance("validation_plan", "§23.5.4", REFERENCE_ANCHORS),
      },
      notes: "Deterministic; no random draws.",
    },
  };
}

export const bcv012: ProtocolDefinition = {
  protocolId: "BCV-012",
  experimentId: "BCV-012",
  streamCode: 12,
  title: "Sensitivity map",
  interpretationClass: "exploratory",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv012Run();
  },
};
