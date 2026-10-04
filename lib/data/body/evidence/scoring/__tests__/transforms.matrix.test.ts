/**
 * Construct transforms and aggregate weights — mathematical truth freeze.
 */
import { describe, expect, it } from "@jest/globals";

import {
  H1_whtr,
  H2_fmi_female,
  H2_fmi_male,
  H3_almi_female,
  H3_almi_male,
  H3_ffmi_female,
  H3_ffmi_male,
  Health_aggregate,
  P1_ffmi_female,
  P1_ffmi_male,
  P3_fmi_female,
  P3_fmi_male,
  PerformanceSupporting_aggregate,
} from "../transforms";
import { healthReadyBundle, scoreHealthFromBundle } from "../testFixtures";

describe("H1_whtr matrix", () => {
  const cases: [number, number][] = [
    [0.2, 100],
    [0.4, 100],
    [0.45, 90],
    [0.5, 80],
    [0.55, 65],
    [0.6, 50],
    [0.7, 25],
    [0.8, 0],
    [0.9, 0],
  ];
  it.each(cases)("WHtR %p → %p", (x, y) => {
    expect(H1_whtr(x)).toBeCloseTo(y, 10);
  });
});

function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}

describe("H2 FMI sex-specific transforms", () => {
  const maleKnots: [number, number][] = [
    [2.0, 80],
    [3.5, 92],
    [5.5, 92],
    [9.0, 50],
    [15.0, 10],
  ];
  const femaleKnots: [number, number][] = [
    [3.5, 80],
    [5.5, 92],
    [8.5, 92],
    [13.0, 50],
    [21.0, 10],
  ];

  it("male knots, midpoints, and tails", () => {
    for (const [x, y] of maleKnots) expect(H2_fmi_male(x)).toBe(y);
    expect(H2_fmi_male(1)).toBe(80);
    expect(H2_fmi_male(20)).toBe(10);
    expect(H2_fmi_male(midpoint(2, 3.5))).toBeCloseTo(86, 10);
    expect(H2_fmi_male(midpoint(5.5, 9))).toBeCloseTo(71, 10);
    expect(H2_fmi_male(midpoint(9, 15))).toBeCloseTo(30, 10);
  });

  it("female knots, midpoints, and tails", () => {
    for (const [x, y] of femaleKnots) expect(H2_fmi_female(x)).toBe(y);
    expect(H2_fmi_female(2)).toBe(80);
    expect(H2_fmi_female(25)).toBe(10);
    expect(H2_fmi_female(midpoint(3.5, 5.5))).toBeCloseTo(86, 10);
    expect(H2_fmi_female(midpoint(8.5, 13))).toBeCloseTo(71, 10);
  });
});

describe("H3 ALMI / FFMI transforms", () => {
  it("male ALMI knots and midpoints", () => {
    expect(H3_almi_male(6)).toBe(15);
    expect(H3_almi_male(7)).toBe(55);
    expect(H3_almi_male(8)).toBe(92);
    expect(H3_almi_male(10)).toBe(92);
    expect(H3_almi_male(midpoint(6, 7))).toBeCloseTo(35, 10);
    expect(H3_almi_male(midpoint(7, 8))).toBeCloseTo(73.5, 10);
  });

  it("female ALMI knots and midpoints", () => {
    expect(H3_almi_female(4.5)).toBe(15);
    expect(H3_almi_female(5.5)).toBe(55);
    expect(H3_almi_female(6.3)).toBe(92);
    expect(H3_almi_female(7)).toBe(92);
    expect(H3_almi_female(midpoint(4.5, 5.5))).toBeCloseTo(35, 10);
  });

  it("male/female FFMI H3 knots and midpoints", () => {
    expect(H3_ffmi_male(16)).toBe(15);
    expect(H3_ffmi_male(16.7)).toBe(55);
    expect(H3_ffmi_male(18.5)).toBe(92);
    expect(H3_ffmi_female(14)).toBe(15);
    expect(H3_ffmi_female(14.6)).toBe(55);
    expect(H3_ffmi_female(16)).toBe(92);
    expect(H3_ffmi_male(midpoint(16, 16.7))).toBeCloseTo(35, 10);
  });
});

describe("P1 FFMI transforms", () => {
  it("male knots, midpoints, tails", () => {
    expect(P1_ffmi_male(16)).toBe(10);
    expect(P1_ffmi_male(16.7)).toBe(40);
    expect(P1_ffmi_male(19)).toBe(90);
    expect(P1_ffmi_male(20.5)).toBe(95);
    expect(P1_ffmi_male(22)).toBe(95);
    expect(P1_ffmi_male(15)).toBe(10);
    expect(P1_ffmi_male(midpoint(16.7, 19))).toBeCloseTo(65, 10);
  });

  it("female knots, midpoints, tails", () => {
    expect(P1_ffmi_female(14)).toBe(10);
    expect(P1_ffmi_female(14.6)).toBe(40);
    expect(P1_ffmi_female(16.5)).toBe(90);
    expect(P1_ffmi_female(17.5)).toBe(95);
    expect(P1_ffmi_female(18)).toBe(95);
    expect(P1_ffmi_female(midpoint(14.6, 16.5))).toBeCloseTo(65, 10);
  });
});

describe("P3 FMI transforms", () => {
  it("male knots, midpoints, tails", () => {
    expect(P3_fmi_male(2)).toBe(80);
    expect(P3_fmi_male(3)).toBe(92);
    expect(P3_fmi_male(7)).toBe(92);
    expect(P3_fmi_male(10)).toBe(45);
    expect(P3_fmi_male(16)).toBe(8);
    expect(P3_fmi_male(20)).toBe(8);
    expect(P3_fmi_male(midpoint(2, 3))).toBeCloseTo(86, 10);
    expect(P3_fmi_male(midpoint(7, 10))).toBeCloseTo(68.5, 10);
  });

  it("female knots, midpoints, tails", () => {
    expect(P3_fmi_female(3.5)).toBe(80);
    expect(P3_fmi_female(5)).toBe(92);
    expect(P3_fmi_female(10)).toBe(92);
    expect(P3_fmi_female(14)).toBe(45);
    expect(P3_fmi_female(22)).toBe(8);
    expect(P3_fmi_female(25)).toBe(8);
  });
});

describe("Health aggregate examples (scientific spec §21)", () => {
  it("matches adversarial and corner aggregates via transforms", () => {
    const severeHighLean = Health_aggregate(
      H1_whtr(0.72)!,
      H2_fmi_male(5.5)!,
      H3_almi_male(8.5)!,
    );
    expect(severeHighLean).toBeCloseTo(59.6, 1);

    const favorableWhtrHighFmi = Health_aggregate(
      H1_whtr(0.45)!,
      H2_fmi_male(14)!,
      H3_almi_male(8.5)!,
    );
    expect(favorableWhtrHighFmi).toBeCloseTo(64.7, 1);

    const lowLeanFavorableAdiposity = Health_aggregate(
      H1_whtr(0.45)!,
      H2_fmi_male(5.5)!,
      H3_almi_male(6.2)!,
    );
    expect(lowLeanFavorableAdiposity).toBeCloseTo(77.3, 1);

    const allFavorable = Health_aggregate(H1_whtr(0.35)!, H2_fmi_male(5.5)!, H3_almi_male(9)!);
    expect(allFavorable).toBeCloseTo(95.6, 1);

    const allAdverse = Health_aggregate(H1_whtr(0.9)!, H2_fmi_male(16)!, H3_almi_male(5.5)!);
    expect(allAdverse).toBeCloseTo(6.5, 1);
  });

  it("end-to-end bundles align with transform expectations", () => {
    const favorable = scoreHealthFromBundle(
      healthReadyBundle({ whtr: 0.35, fmi: 5.5, almi: 9 }),
    );
    expect(favorable.score).toBeCloseTo(95.6, 1);

    const adverse = scoreHealthFromBundle(
      healthReadyBundle({ whtr: 0.9, fmi: 16, almi: 5.5 }),
    );
    expect(adverse.score).toBeCloseTo(6.5, 1);
  });
});

describe("Performance aggregate examples", () => {
  it("matches scientific spec adversarial PS aggregates", () => {
    const highP1LowFmi = PerformanceSupporting_aggregate(
      P1_ffmi_male(20.5)!,
      P3_fmi_male(2)!,
    );
    expect(highP1LowFmi).toBeCloseTo(87.5, 1);

    const highP1HighFmi = PerformanceSupporting_aggregate(
      P1_ffmi_male(20.5)!,
      P3_fmi_male(14)!,
    );
    expect(highP1HighFmi).toBeCloseTo(57.7, 1);

    const lowP1FavorableFmi = PerformanceSupporting_aggregate(
      P1_ffmi_male(16)!,
      P3_fmi_male(5)!,
    );
    expect(lowP1FavorableFmi).toBeCloseTo(51.0, 1);

    const bothAdverse = PerformanceSupporting_aggregate(P1_ffmi_male(16)!, P3_fmi_male(16)!);
    expect(bothAdverse).toBeCloseTo(9.0, 1);

    const bothMax = PerformanceSupporting_aggregate(P1_ffmi_male(21)!, P3_fmi_male(7)!);
    expect(bothMax).toBeCloseTo(93.5, 1);
  });

});

describe("frozen aggregate weights", () => {
  it("Health uses exact 45/35/20", () => {
    expect(Health_aggregate(100, 100, 100)).toBe(100);
    expect(Health_aggregate(0, 0, 0)).toBe(0);
    expect(Health_aggregate(100, 0, 0)).toBeCloseTo(45, 10);
    expect(Health_aggregate(0, 100, 0)).toBeCloseTo(35, 10);
    expect(Health_aggregate(0, 0, 100)).toBeCloseTo(20, 10);
    expect(Health_aggregate(80, 60, 40)).toBeCloseTo(0.45 * 80 + 0.35 * 60 + 0.2 * 40, 10);
  });

  it("Performance-Supporting uses exact 50/50", () => {
    expect(PerformanceSupporting_aggregate(100, 0)).toBe(50);
    expect(PerformanceSupporting_aggregate(0, 100)).toBe(50);
    expect(PerformanceSupporting_aggregate(80, 60)).toBe(70);
  });
});
