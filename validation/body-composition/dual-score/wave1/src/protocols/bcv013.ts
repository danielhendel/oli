/**
 * BCV-013 — Knot / plateau neighborhood analysis (§23.13). Deterministic.
 *
 * discontinuityDelta = max(|f(k)-f(k-EPS_NUM)|, |f(k+EPS_NUM)-f(k)|)  (one-sided jumps; a continuous
 * piecewise-linear function has jump = EPS_NUM * slope). acrossKnotDelta = |f(k+EPS_NUM)-f(k-EPS_NUM)|
 * is also reported. Continuity invariant: discontinuityDelta <= 1e-6 score points.
 */

import { EPS_NUM, EPS_SURF, SEXES } from "../constants";
import type { Sex } from "../constants";
import { CONSTRUCT_KEYS, KNOTS, PLATEAUS, domainOf, variableOfConstruct } from "../domains";
import type { ConstructKey } from "../domains";
import { constructFn } from "../scoringPure";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";

export const CONTINUITY_TOL = 1e-6;

function d(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : Math.abs(a - b);
}

export function knotRows() {
  const rows: Array<Record<string, unknown>> = [];
  for (const sex of SEXES) {
    for (const c of CONSTRUCT_KEYS) {
      const f = constructFn(c, sex);
      const [lo, hi] = domainOf(variableOfConstruct(c), sex);
      for (const k of KNOTS[c][sex]) {
        if (k < lo || k > hi) continue;
        const left = f(k - EPS_SURF);
        const center = f(k);
        const right = f(k + EPS_SURF);
        const lNum = f(k - EPS_NUM);
        const rNum = f(k + EPS_NUM);
        const j1 = d(center, lNum);
        const j2 = d(rNum, center);
        const discontinuityDelta = j1 == null || j2 == null ? null : Math.max(j1, j2);
        rows.push({
          construct: c,
          sex,
          knot: k,
          leftValue: left,
          knotValue: center,
          rightValue: right,
          leftSlope: left == null || center == null ? null : (center - left) / EPS_SURF,
          rightSlope: right == null || center == null ? null : (right - center) / EPS_SURF,
          acrossKnotDelta: d(rNum, lNum),
          discontinuityDelta,
          continuityPass: discontinuityDelta != null && discontinuityDelta <= CONTINUITY_TOL,
        });
      }
    }
  }
  return rows;
}

export function plateauRows() {
  const rows: Array<Record<string, unknown>> = [];
  for (const p of PLATEAUS) {
    const sexes: Sex[] = p.sex === "both" ? ["male", "female"] : [p.sex];
    for (const sex of sexes) {
      const f = constructFn(p.construct, sex);
      const [dlo, dhi] = domainOf(variableOfConstruct(p.construct), sex);
      const lower = p.lower ?? dlo;
      const upper = p.upper ?? dhi;
      // 21 evenly spaced samples inside [lower, upper] (inclusive both ends)
      const samples: number[] = [];
      for (let i = 0; i <= 20; i++) samples.push(lower + ((upper - lower) * i) / 20);
      const flat = samples.every((x) => {
        const v = f(x);
        return v != null && Math.abs(v - p.value) <= EPS_NUM;
      });
      rows.push({
        id: p.id,
        construct: p.construct,
        sex,
        value: p.value,
        lowerBoundary: p.lower,
        upperBoundary: p.upper,
        plateauWidth: p.lower == null || p.upper == null ? null : p.upper - p.lower,
        unboundedSide: p.lower == null ? "left_tail" : p.upper == null ? "right_tail" : null,
        domain: [dlo, dhi],
        sampledInclusiveFlat: flat,
        valueAtLower: f(lower),
        valueAtUpper: f(upper),
      });
    }
  }
  return rows;
}

/** Tails are unbounded vs synthetic domain; report domain-edge value and domain occupancy only. */
export function tailRows() {
  const rows: Array<Record<string, unknown>> = [];
  for (const sex of SEXES) {
    for (const c of CONSTRUCT_KEYS) {
      const f = constructFn(c, sex);
      const [lo, hi] = domainOf(variableOfConstruct(c), sex);
      const ks = KNOTS[c][sex];
      const first = ks[0] as number;
      const last = ks[ks.length - 1] as number;
      rows.push({
        construct: c as ConstructKey,
        sex,
        leftTail: { unbounded: true, domainEdge: lo, edgeValue: f(lo), domainOccupancy: (first - lo) / (hi - lo) },
        rightTail: { unbounded: true, domainEdge: hi, edgeValue: f(hi), domainOccupancy: (hi - last) / (hi - lo) },
      });
    }
  }
  return rows;
}

export function bcv013Run(): RunOutput {
  const knots = knotRows();
  const plateaus = plateauRows();
  const tails = tailRows();
  const allPass = knots.every((k) => k.continuityPass === true);
  const plateausPass = plateaus.every((p) => p.sampledInclusiveFlat === true);
  const csvRows: unknown[][] = [
    ...knots.map((k) => [
      "knot", k.construct, k.sex, "", k.knot, k.leftValue, k.knotValue, k.rightValue,
      k.leftSlope, k.rightSlope, k.acrossKnotDelta, k.discontinuityDelta, "", "", "",
    ]),
    ...plateaus.map((p) => [
      "plateau", p.construct, p.sex, p.id, "", p.valueAtLower, p.value, p.valueAtUpper,
      "", "", "", "", p.lowerBoundary, p.upperBoundary, p.plateauWidth,
    ]),
  ];
  return {
    protocolId: "BCV-013",
    experimentId: "BCV-013",
    paramSetId: "struct",
    interpretationClass: "structural_invariant",
    results: {
      protocolId: "BCV-013",
      continuityTolerance: CONTINUITY_TOL,
      knots,
      plateaus,
      tails,
      continuityAllPass: allPass,
      plateauAllFlat: plateausPass,
    },
    csv: toCsv(
      [
        "kind", "construct", "sex", "id", "knot", "left", "center", "right", "leftSlope", "rightSlope",
        "acrossKnotDelta", "discontinuityDelta", "plateauLower", "plateauUpper", "plateauWidth",
      ],
      csvRows,
    ),
    summaryMd: [
      "# BCV-013 — Knot / plateau analysis",
      "",
      `Knots analysed: ${knots.length}; continuity (<= ${CONTINUITY_TOL}) all pass: ${allPass}.`,
      `Plateaus analysed: ${plateaus.length}; all flat at EPS_NUM (inclusive both ends): ${plateausPass}.`,
      "",
      "Tails are reported as unbounded vs the synthetic domain; no finite biological tail widths are invented.",
    ].join("\n"),
    manifest: {
      inputDomains: { knots: KNOTS, plateaus: PLATEAUS },
      gridSteps: { epsNum: EPS_NUM, epsSurf: EPS_SURF },
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        knots: provenance("mathematical_freeze", "§23.5.2", KNOTS),
        plateaus: provenance("validation_plan", "§23.13 BCV-013", PLATEAUS),
        continuityTolerance: provenance("validation_plan", "§23.13 BCV-013", CONTINUITY_TOL),
      },
      notes: "Deterministic structural invariant.",
    },
  };
}

export const bcv013: ProtocolDefinition = {
  protocolId: "BCV-013",
  experimentId: "BCV-013",
  streamCode: 13,
  title: "Knot / plateau",
  interpretationClass: "structural_invariant",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv013Run();
  },
};
