/**
 * BCV-001 — Mathematical surface stress (§23.5.3, §23.5.4, §23.13, §23.17.5).
 *
 *  1. Independent 1D sweeps: vary ONE input, hold companions at §23.5.4 references.
 *     Grid = coarse ∪ dense-local(±0.05 around every knot) ∪ knots ∪ knot±EPS_NUM ∪ knot±EPS_SURF.
 *  2. Deterministic 2D aggregate surfaces (six Surface IDs): canonicalAxisGrid(x) × canonicalAxisGrid(y)
 *     (coarse ∪ knots ∪ knot±EPS_SURF; NO dense-local). No 3D cube.
 *
 * Runs: grid_male, grid_female. Artifacts: results.json, results.csv, summary.md, manifest.json.
 */

import {
  DOMAINS,
  EPS_NUM,
  EPS_SURF,
  REFERENCE_ANCHORS,
} from "../constants";
import type { Sex } from "../constants";
import {
  CONSTRUCT_KEYS,
  KNOTS,
  SURFACES,
  canonicalAxisGrid,
  oneDimensionalSweepGrid,
  variableOfConstruct,
  domainOf,
} from "../domains";
import type { ConstructKey } from "../domains";
import { constructFn, scoreHealthPure, scorePerfPure } from "../scoringPure";
import { provenance, svgLineChart, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";
import { COARSE_STEP, DENSE_STEP, DENSE_HALF_WIDTH } from "../domains";

const SEXES: Sex[] = ["male", "female"];

type Agg = number | null;

/** Aggregate for a 1D sweep of `construct`, companions at §23.5.4 reference. */
export function sweepAggregate(construct: ConstructKey, sex: Sex, x: number): Agg {
  const ref = REFERENCE_ANCHORS[sex];
  switch (construct) {
    case "H1":
      return scoreHealthPure(sex, { whtr: x, fmi: ref.fmi, h3Kind: "ALMI", h3Value: ref.almi }).aggregate;
    case "H2":
      return scoreHealthPure(sex, { whtr: ref.whtr, fmi: x, h3Kind: "ALMI", h3Value: ref.almi }).aggregate;
    case "H3_ALMI":
      return scoreHealthPure(sex, { whtr: ref.whtr, fmi: ref.fmi, h3Kind: "ALMI", h3Value: x }).aggregate;
    case "H3_FFMI":
      return scoreHealthPure(sex, { whtr: ref.whtr, fmi: ref.fmi, h3Kind: "FFMI", h3Value: x }).aggregate;
    case "P1":
      return scorePerfPure(sex, { ffmi: x, fmi: ref.fmi }).aggregate;
    case "P3":
      return scorePerfPure(sex, { ffmi: ref.ffmi, fmi: x }).aggregate;
  }
}

export function surfaceAggregate(
  surfaceId: (typeof SURFACES)[number]["id"],
  sex: Sex,
  xv: number,
  yv: number,
): Agg {
  const s = SURFACES.find((q) => q.id === surfaceId);
  if (!s) throw new Error(`surface_not_found:${surfaceId}`);
  const ref = REFERENCE_ANCHORS[sex];
  if (surfaceId === "PERFORMANCE_P1_P3") return scorePerfPure(sex, { ffmi: xv, fmi: yv }).aggregate;
  const h3Kind = s.h3Primary ?? "ALMI";
  const v = { whtr: ref.whtr, fmi: ref.fmi, h3: h3Kind === "ALMI" ? ref.almi : ref.ffmi };
  const assign = (c: ConstructKey, val: number) => {
    if (c === "H1") v.whtr = val;
    else if (c === "H2") v.fmi = val;
    else v.h3 = val;
  };
  assign(s.x, xv);
  assign(s.y, yv);
  return scoreHealthPure(sex, { whtr: v.whtr, fmi: v.fmi, h3Kind, h3Value: v.h3 }).aggregate;
}

type SweepPoint = { x: number; constructScore: number | null; aggregate: Agg; slopeToNext: number | null };

export function runSweep(construct: ConstructKey, sex: Sex) {
  const fn = constructFn(construct, sex);
  const xs = oneDimensionalSweepGrid(construct, sex);
  const pts: SweepPoint[] = xs.map((x) => ({
    x,
    constructScore: fn(x),
    aggregate: sweepAggregate(construct, sex, x),
    slopeToNext: null,
  }));
  let maxJump = 0;
  let maxAbsSlope = 0;
  let nonFinite = 0;
  let outOfRange = 0;
  let nullCount = 0;
  let floorCount = 0;
  let ceilingCount = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as SweepPoint;
    const s = p.constructScore;
    if (s === null) {
      nullCount++;
      continue;
    }
    if (!Number.isFinite(s)) {
      nonFinite++;
      continue;
    }
    if (s < 0 || s > 100) outOfRange++;
    if (s === 0) floorCount++;
    if (s === 100) ceilingCount++;
    minScore = Math.min(minScore, s);
    maxScore = Math.max(maxScore, s);
    const q = pts[i + 1];
    if (q && q.constructScore !== null && Number.isFinite(q.constructScore)) {
      const dx = q.x - p.x;
      const ds = q.constructScore - s;
      p.slopeToNext = dx > 0 ? ds / dx : null;
      maxJump = Math.max(maxJump, Math.abs(ds));
      if (p.slopeToNext !== null) maxAbsSlope = Math.max(maxAbsSlope, Math.abs(p.slopeToNext));
    }
  }
  // knot continuity: |f(k+eps) - f(k-eps)| at both epsilons (in-domain knots only)
  const [lo, hi] = domainOf(variableOfConstruct(construct), sex);
  const knotContinuity = KNOTS[construct][sex]
    .filter((k) => k >= lo && k <= hi)
    .map((k) => {
      const at = (e: number): number | null => fn(k + e);
      const dNum = diff(at(EPS_NUM), at(-EPS_NUM));
      const dSurf = diff(at(EPS_SURF), at(-EPS_SURF));
      return { knot: k, jumpEpsNum: dNum, jumpEpsSurf: dSurf };
    });
  return {
    construct,
    sex,
    variable: variableOfConstruct(construct),
    nPoints: pts.length,
    domain: [lo, hi],
    minScore: Number.isFinite(minScore) ? minScore : null,
    maxScore: Number.isFinite(maxScore) ? maxScore : null,
    maxAdjacentJump: maxJump,
    maxAbsLocalSlope: maxAbsSlope,
    nonFiniteCount: nonFinite,
    outOfRangeCount: outOfRange,
    nullCount,
    floorCount,
    ceilingCount,
    knotContinuity,
    points: pts,
  };
}

function diff(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : Math.abs(a - b);
}

export type SurfaceSummary = {
  surfaceId: string;
  sex: Sex;
  xConstruct: ConstructKey;
  yConstruct: ConstructKey;
  nX: number;
  nY: number;
  nCells: number;
  min: number | null;
  max: number | null;
  nullCount: number;
  nonFiniteCount: number;
  outOfRangeCount: number;
  floorCount: number;
  ceilingCount: number;
  maxAdjacentDiffAlongX: number;
  maxAdjacentDiffAlongY: number;
  maxAbsSlopeAlongX: number;
  maxAbsSlopeAlongY: number;
  nonVaried: string;
};

export function runSurface(
  surface: (typeof SURFACES)[number],
  sex: Sex,
  emitRow: (row: unknown[]) => void,
): SurfaceSummary {
  const xs = canonicalAxisGrid(surface.x, sex);
  const ys = canonicalAxisGrid(surface.y, sex);
  let min = Infinity;
  let max = -Infinity;
  let nullCount = 0;
  let nonFinite = 0;
  let oor = 0;
  let floorC = 0;
  let ceilC = 0;
  let maxDx = 0;
  let maxDy = 0;
  let maxSlopeX = 0;
  let maxSlopeY = 0;
  let prevRow: Agg[] | null = null;
  for (let iy = 0; iy < ys.length; iy++) {
    const y = ys[iy] as number;
    const row: Agg[] = [];
    for (let ix = 0; ix < xs.length; ix++) {
      const x = xs[ix] as number;
      const a = surfaceAggregate(surface.id, sex, x, y);
      row.push(a);
      emitRow(["surface2d", surface.id, sex, x, y, "", a, ""]);
      if (a === null) {
        nullCount++;
      } else if (!Number.isFinite(a)) {
        nonFinite++;
      } else {
        if (a < 0 || a > 100) oor++;
        if (a === 0) floorC++;
        if (a === 100) ceilC++;
        min = Math.min(min, a);
        max = Math.max(max, a);
      }
      const left = ix > 0 ? row[ix - 1] : null;
      if (a != null && left != null) {
        const d = Math.abs(a - left);
        maxDx = Math.max(maxDx, d);
        maxSlopeX = Math.max(maxSlopeX, d / ((x as number) - (xs[ix - 1] as number)));
      }
      const down = prevRow ? prevRow[ix] : null;
      if (a != null && down != null) {
        const d = Math.abs(a - down);
        maxDy = Math.max(maxDy, d);
        maxSlopeY = Math.max(maxSlopeY, d / (y - (ys[iy - 1] as number)));
      }
    }
    prevRow = row;
  }
  return {
    surfaceId: surface.id,
    sex,
    xConstruct: surface.x,
    yConstruct: surface.y,
    nX: xs.length,
    nY: ys.length,
    nCells: xs.length * ys.length,
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    nullCount,
    nonFiniteCount: nonFinite,
    outOfRangeCount: oor,
    floorCount: floorC,
    ceilingCount: ceilC,
    maxAdjacentDiffAlongX: maxDx,
    maxAdjacentDiffAlongY: maxDy,
    maxAbsSlopeAlongX: maxSlopeX,
    maxAbsSlopeAlongY: maxSlopeY,
    nonVaried: surface.nonVaried,
  };
}

export const BCV001_CSV_HEADERS = [
  "kind",
  "id",
  "sex",
  "x",
  "y",
  "constructScore",
  "aggregate",
  "slopeToNext",
] as const;

export function buildBcv001Run(sex: Sex, emitPlots: boolean): RunOutput {
  const rows: unknown[][] = [];
  const sweeps = CONSTRUCT_KEYS.map((c) => runSweep(c, sex));
  const extraFiles: Record<string, string> = {};
  for (const sw of sweeps) {
    for (const p of sw.points) rows.push(["sweep1d", sw.construct, sex, p.x, "", p.constructScore, p.aggregate, p.slopeToNext]);
    if (emitPlots) {
      extraFiles[`plots/sweep_${sw.construct}_${sex}.svg`] = svgLineChart(
        `${sw.construct} ${sex}`,
        sw.points.map((p) => p.x),
        sw.points.map((p) => p.constructScore ?? 0),
      );
    }
  }
  const surfaces = SURFACES.map((s) => runSurface(s, sex, (r) => rows.push(r)));
  const results = {
    protocolId: "BCV-001",
    sex,
    referenceAnchors: REFERENCE_ANCHORS[sex],
    geometry: "1D sweeps + six 2D surfaces; no 3D cube",
    sweeps: sweeps.map((s) => s),
    surfaces,
    surfaceIds: SURFACES.map((s) => s.id),
    totals: {
      sweepPoints: sweeps.reduce((a, s) => a + s.nPoints, 0),
      surfaceCells: surfaces.reduce((a, s) => a + s.nCells, 0),
      nonFinite: sweeps.reduce((a, s) => a + s.nonFiniteCount, 0) + surfaces.reduce((a, s) => a + s.nonFiniteCount, 0),
      outOfRange: sweeps.reduce((a, s) => a + s.outOfRangeCount, 0) + surfaces.reduce((a, s) => a + s.outOfRangeCount, 0),
      nulls: sweeps.reduce((a, s) => a + s.nullCount, 0) + surfaces.reduce((a, s) => a + s.nullCount, 0),
    },
  };
  const md = [
    `# BCV-001 — Mathematical surface stress (${sex})`,
    "",
    `Reference anchors: ${JSON.stringify(REFERENCE_ANCHORS[sex])} (validation-only, not normative targets).`,
    "",
    "## 1D sweeps",
    "",
    "| construct | points | min | max | max adjacent jump | max abs slope | non-finite | out-of-range | null |",
    "|---|---|---|---|---|---|---|---|---|",
    ...sweeps.map(
      (s) =>
        `| ${s.construct} | ${s.nPoints} | ${s.minScore} | ${s.maxScore} | ${s.maxAdjacentJump.toFixed(6)} | ${s.maxAbsLocalSlope.toFixed(4)} | ${s.nonFiniteCount} | ${s.outOfRangeCount} | ${s.nullCount} |`,
    ),
    "",
    "## 2D aggregate surfaces (canonicalAxisGrid Cartesian product)",
    "",
    "| surface | cells | min | max | floor | ceiling | null | non-finite |",
    "|---|---|---|---|---|---|---|---|",
    ...surfaces.map(
      (s) => `| ${s.surfaceId} | ${s.nCells} | ${s.min} | ${s.max} | ${s.floorCount} | ${s.ceilingCount} | ${s.nullCount} | ${s.nonFiniteCount} |`,
    ),
    "",
    "Dense-local grids apply to 1D sweeps only. NaN/out-of-range counts must be zero.",
  ].join("\n");
  return {
    protocolId: "BCV-001",
    experimentId: "BCV-001",
    paramSetId: `grid_${sex}`,
    interpretationClass: "structural_invariant",
    results,
    csv: toCsv(BCV001_CSV_HEADERS, rows),
    summaryMd: md,
    ...(emitPlots ? { extraFiles } : {}),
    manifest: {
      inputDomains: {
        sex,
        whtr: DOMAINS.whtr[sex],
        fmi: DOMAINS.fmi[sex],
        almi: DOMAINS.almi[sex],
        ffmi: DOMAINS.ffmi[sex],
        referenceAnchors: REFERENCE_ANCHORS[sex],
      },
      gridSteps: {
        coarse: COARSE_STEP,
        denseLocal: { halfWidth: DENSE_HALF_WIDTH, step: DENSE_STEP },
        twoD: "canonicalAxisGrid Cartesian product (coarse ∪ knots ∪ knot±EPS_SURF)",
      },
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        referenceAnchors: provenance("validation_plan", "§23.5.4", REFERENCE_ANCHORS[sex]),
        knots: provenance("mathematical_freeze", "§23.5.2", KNOTS),
        coarseStep: provenance("validation_plan", "§23.5.1", COARSE_STEP),
      },
      notes: "Structural + exploratory surface stress; interpretationClass reported as structural_invariant.",
    },
  };
}

export const bcv001: ProtocolDefinition = {
  protocolId: "BCV-001",
  experimentId: "BCV-001",
  streamCode: 1,
  title: "Mathematical surface stress",
  interpretationClass: "structural_invariant",
  emitsCsv: true,
  plannedParamSetIds: () => SEXES.map((s) => `grid_${s}`),
  *run(ctx) {
    for (const sex of SEXES) {
      ctx.log(`BCV-001 grid_${sex}`);
      yield buildBcv001Run(sex, ctx.emitPlots);
    }
  },
};
