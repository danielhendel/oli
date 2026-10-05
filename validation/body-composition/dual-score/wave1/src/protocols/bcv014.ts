/**
 * BCV-014 — Floor / ceiling occupancy (§23.13). Deterministic coarse grids by sex.
 * Exact floor == 0, exact ceiling == 100; near floor (0,5], near ceiling [95,100) are exploratory only.
 */

import { SEXES } from "../constants";
import type { Sex } from "../constants";
import { CONSTRUCT_KEYS, SURFACES, coarseGrid, variableOfConstruct } from "../domains";
import { constructFn } from "../scoringPure";
import { provenance, toCsv } from "../artifacts";
import type { ProtocolDefinition, RunOutput } from "../artifacts";
import { surfaceAggregate } from "./bcv001";

export type Occupancy = {
  n: number;
  unavailable: number;
  exactFloor: number;
  exactCeiling: number;
  nearFloor: number;
  nearCeiling: number;
  pctExactFloor: number;
  pctExactCeiling: number;
  pctNearFloor: number;
  pctNearCeiling: number;
};

export class OccupancyCounter {
  n = 0;
  unavailable = 0;
  exactFloor = 0;
  exactCeiling = 0;
  nearFloor = 0;
  nearCeiling = 0;
  add(v: number | null): void {
    if (v == null || !Number.isFinite(v)) {
      this.unavailable++;
      return;
    }
    this.n++;
    if (v === 0) this.exactFloor++;
    else if (v > 0 && v <= 5) this.nearFloor++;
    if (v === 100) this.exactCeiling++;
    else if (v >= 95 && v < 100) this.nearCeiling++;
  }
  result(): Occupancy {
    const p = (c: number) => (this.n === 0 ? 0 : (100 * c) / this.n);
    return {
      n: this.n,
      unavailable: this.unavailable,
      exactFloor: this.exactFloor,
      exactCeiling: this.exactCeiling,
      nearFloor: this.nearFloor,
      nearCeiling: this.nearCeiling,
      pctExactFloor: p(this.exactFloor),
      pctExactCeiling: p(this.exactCeiling),
      pctNearFloor: p(this.nearFloor),
      pctNearCeiling: p(this.nearCeiling),
    };
  }
}

export function bcv014Run(): RunOutput {
  const oneD: Array<{ id: string; sex: Sex } & Occupancy> = [];
  const twoD: Array<{ id: string; sex: Sex } & Occupancy> = [];
  for (const sex of SEXES) {
    for (const c of CONSTRUCT_KEYS) {
      const f = constructFn(c, sex);
      const oc = new OccupancyCounter();
      for (const x of coarseGrid(variableOfConstruct(c), sex)) oc.add(f(x));
      oneD.push({ id: c, sex, ...oc.result() });
    }
    for (const s of SURFACES) {
      const xs = coarseGrid(variableOfConstruct(s.x), sex);
      const ys = coarseGrid(variableOfConstruct(s.y), sex);
      const oc = new OccupancyCounter();
      for (const y of ys) for (const x of xs) oc.add(surfaceAggregate(s.id, sex, x, y));
      twoD.push({ id: s.id, sex, ...oc.result() });
    }
  }
  const csvRows = [
    ...oneD.map((r) => ["1d_construct", r.id, r.sex, r.n, r.exactFloor, r.exactCeiling, r.nearFloor, r.nearCeiling, r.pctExactFloor, r.pctExactCeiling, r.pctNearFloor, r.pctNearCeiling]),
    ...twoD.map((r) => ["2d_aggregate", r.id, r.sex, r.n, r.exactFloor, r.exactCeiling, r.nearFloor, r.nearCeiling, r.pctExactFloor, r.pctExactCeiling, r.pctNearFloor, r.pctNearCeiling]),
  ];
  return {
    protocolId: "BCV-014",
    experimentId: "BCV-014",
    paramSetId: "struct",
    interpretationClass: "exploratory",
    results: {
      protocolId: "BCV-014",
      definitions: { exactFloor: "==0", exactCeiling: "==100", nearFloor: "(0,5]", nearCeiling: "[95,100)" },
      oneDimensional: oneD,
      twoDimensional: twoD,
    },
    csv: toCsv(
      ["kind", "id", "sex", "n", "exactFloor", "exactCeiling", "nearFloor", "nearCeiling", "pctExactFloor", "pctExactCeiling", "pctNearFloor", "pctNearCeiling"],
      csvRows,
    ),
    summaryMd: [
      "# BCV-014 — Floor / ceiling occupancy",
      "",
      "Occupancy over the canonical synthetic COARSE grids (uniform over the synthetic domain; not population prevalence).",
      "",
      "| kind | id | sex | n | %floor | %ceiling | %near floor | %near ceiling |",
      "|---|---|---|---|---|---|---|---|",
      ...csvRows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${Number(r[8]).toFixed(2)} | ${Number(r[9]).toFixed(2)} | ${Number(r[10]).toFixed(2)} | ${Number(r[11]).toFixed(2)} |`),
    ].join("\n"),
    manifest: {
      inputDomains: { grid: "coarse by sex (§23.5.1)" },
      gridSteps: { whtr: 0.01, fmi: 0.25, almi: 0.1, ffmi: 0.1 },
      monteCarloProtocol: null,
      noiseParameters: null,
      covarianceParameters: null,
      scheduleId: null,
      personaId: null,
      parameterProvenance: {
        coarseSteps: provenance("validation_plan", "§23.5.1", { whtr: 0.01, fmi: 0.25, almi: 0.1, ffmi: 0.1 }),
      },
      notes: "Synthetic uniform-grid occupancy only.",
      epsilon: false,
    },
  };
}

export const bcv014: ProtocolDefinition = {
  protocolId: "BCV-014",
  experimentId: "BCV-014",
  streamCode: 14,
  title: "Floor / ceiling occupancy",
  interpretationClass: "exploratory",
  emitsCsv: true,
  plannedParamSetIds: () => ["struct"],
  *run() {
    yield bcv014Run();
  },
};
