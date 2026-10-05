import { EPS_NUM, EPS_SURF, REFERENCE_ANCHORS } from "../src/constants";
import { KNOTS, SURFACES, canonicalAxisGrid, coarseGrid, oneDimensionalSweepGrid, variableOfConstruct } from "../src/domains";
import { BCV001_CSV_HEADERS, buildBcv001Run, runSurface, runSweep, surfaceAggregate, sweepAggregate } from "../src/protocols/bcv001";

describe("canonicalAxisGrid (§23.5.3)", () => {
  it("is the sorted unique union of coarse grid, knots, knot±EPS_SURF (in domain)", () => {
    for (const sex of ["male", "female"] as const) {
      for (const c of ["H1", "H2", "H3_ALMI", "H3_FFMI", "P1", "P3"] as const) {
        const g = canonicalAxisGrid(c, sex);
        expect([...g].sort((a, b) => a - b)).toEqual(g);
        expect(new Set(g).size).toBe(g.length);
        const coarse = coarseGrid(variableOfConstruct(c), sex);
        for (const x of coarse) expect(g).toContain(x);
        for (const k of KNOTS[c][sex]) {
          expect(g.some((x) => Math.abs(x - k) < 1e-12)).toBe(true);
          expect(g.some((x) => Math.abs(x - (k - EPS_SURF)) < 1e-12)).toBe(true);
          expect(g.some((x) => Math.abs(x - (k + EPS_SURF)) < 1e-12)).toBe(true);
        }
      }
    }
  });
  it("does NOT contain dense-local points (e.g. knot ± 0.05 steps) or EPS_NUM points", () => {
    const g = canonicalAxisGrid("H2", "male"); // coarse step 0.25; knot 3.5 → 3.55 is not coarse
    expect(g.some((x) => Math.abs(x - 3.55) < 1e-9)).toBe(false);
    expect(g.some((x) => Math.abs(x - (3.5 + EPS_NUM)) < 1e-12)).toBe(false);
  });
  it("covers the synthetic domain end-points", () => {
    expect(canonicalAxisGrid("H1", "male")[0]).toBe(0.3);
    expect(canonicalAxisGrid("H1", "male").at(-1)).toBe(0.95);
    expect(canonicalAxisGrid("H2", "female")[0]).toBe(1);
    expect(canonicalAxisGrid("H2", "female").at(-1)).toBe(30);
  });
});

describe("1D sweep grid", () => {
  it("includes dense-local points and ±EPS_NUM/±EPS_SURF around every knot", () => {
    const g = oneDimensionalSweepGrid("H2", "male");
    expect(g.some((x) => Math.abs(x - 3.55) < 1e-9)).toBe(true);
    expect(g.some((x) => Math.abs(x - 3.45) < 1e-9)).toBe(true);
    for (const k of KNOTS.H2.male) {
      for (const e of [EPS_NUM, EPS_SURF]) {
        expect(g.some((x) => x === k - e)).toBe(true);
        expect(g.some((x) => x === k + e)).toBe(true);
      }
    }
  });
});

describe("BCV-001 2D surfaces", () => {
  it("has the six Surface IDs", () => {
    expect(SURFACES.map((s) => s.id)).toEqual([
      "HEALTH_H1_H2",
      "HEALTH_H1_H3_ALMI",
      "HEALTH_H1_H3_FFMI",
      "HEALTH_H2_H3_ALMI",
      "HEALTH_H2_H3_FFMI",
      "PERFORMANCE_P1_P3",
    ]);
  });
  it("surface = Cartesian product of canonicalAxisGrid(x) × canonicalAxisGrid(y)", () => {
    const rows: unknown[][] = [];
    const s = SURFACES[0]!;
    const summary = runSurface(s, "male", (r) => rows.push(r));
    const nx = canonicalAxisGrid(s.x, "male").length;
    const ny = canonicalAxisGrid(s.y, "male").length;
    expect(summary.nX).toBe(nx);
    expect(summary.nY).toBe(ny);
    expect(summary.nCells).toBe(nx * ny);
    expect(rows).toHaveLength(nx * ny);
    expect(summary.nonFiniteCount).toBe(0);
    expect(summary.outOfRangeCount).toBe(0);
    expect(summary.nullCount).toBe(0);
  });
  it("H3 pathways are distinct (ALMI vs FFMI surfaces differ)", () => {
    expect(surfaceAggregate("HEALTH_H1_H3_ALMI", "male", 0.5, 7.0)).not.toBe(
      surfaceAggregate("HEALTH_H1_H3_FFMI", "male", 0.5, 7.0),
    );
  });
  it("non-varied constructs are held at the §23.5.4 reference", () => {
    const ref = REFERENCE_ANCHORS.male;
    const a = surfaceAggregate("HEALTH_H1_H2", "male", ref.whtr, ref.fmi);
    expect(a).toBe(sweepAggregate("H1", "male", ref.whtr));
    expect(a).toBe(sweepAggregate("H2", "male", ref.fmi));
  });
});

describe("BCV-001 run output", () => {
  const run = buildBcv001Run("female", true);
  it("emits results + csv + plots, class structural, run id parameter grid_female", () => {
    expect(run.paramSetId).toBe("grid_female");
    expect(run.interpretationClass).toBe("structural_invariant");
    expect(run.csv!.split("\n")[0]).toBe(BCV001_CSV_HEADERS.join(","));
    expect(Object.keys(run.extraFiles ?? {}).length).toBe(6);
  });
  it("has zero NaN / out-of-range / null across all sweeps and surfaces", () => {
    const t = (run.results as { totals: { nonFinite: number; outOfRange: number; nulls: number } }).totals;
    expect(t).toEqual(expect.objectContaining({ nonFinite: 0, outOfRange: 0, nulls: 0 }));
  });
  it("records knot continuity for every sweep", () => {
    const sweeps = (run.results as { sweeps: Array<{ knotContinuity: Array<{ jumpEpsNum: number | null }> }> }).sweeps;
    for (const s of sweeps) for (const k of s.knotContinuity) expect(k.jumpEpsNum).not.toBeNull();
  });
  it("sweep points are strictly increasing", () => {
    const s = runSweep("P3", "male");
    for (let i = 1; i < s.points.length; i++) expect(s.points[i]!.x).toBeGreaterThan(s.points[i - 1]!.x);
  });
});
