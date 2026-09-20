/**
 * Gallagher et al. 2000 — BMI-equivalent Body Fat screening reference tests.
 * Locks age×sex boundaries and rejects ACE / Optimal / invented ranges.
 */

import {
  GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID,
  GALLAGHER_BODY_FAT_SCREENING_VERSION,
  GALLAGHER_COMBINED_AA_WHITE_TABLE,
  classifyGallagherBodyFatPercent,
  formatGallagherMassRange,
  formatGallagherPercentRange,
  formatGallagherPercentRangeAccessible,
  lookupGallagherCombinedTable,
} from "@/lib/body/standards/gallagherBodyFatScreeningReference";
import { resolveBodyFatNumericalReferenceChart } from "@/lib/body/presentation/resolveBodyFatNumericalReferenceChart";

describe("Gallagher Body Fat screening reference — table identity", () => {
  it("locks standard id, version, and six age×sex tables", () => {
    expect(GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID).toBe(
      "gallagher-4c-bmi-equivalent-body-fat-reference",
    );
    expect(GALLAGHER_BODY_FAT_SCREENING_VERSION).toBe("2000.1");
    expect(GALLAGHER_COMBINED_AA_WHITE_TABLE).toHaveLength(6);
  });

  it("formats percent ranges with en dash and rejects ACE labels", () => {
    const male4059 = GALLAGHER_COMBINED_AA_WHITE_TABLE.find(
      (t) => t.sex === "male" && t.ageBandId === "40_59",
    )!;
    expect(male4059.bands.map((b) => formatGallagherPercentRange(b))).toEqual([
      "<11%",
      "11–<22%",
      "≥22%",
    ]);
    expect(formatGallagherPercentRangeAccessible(male4059.bands[0]!)).toBe(
      "less than 11 percent",
    );
    expect(formatGallagherPercentRangeAccessible(male4059.bands[1]!)).toBe(
      "11 percent to less than 22 percent",
    );
    expect(formatGallagherPercentRangeAccessible(male4059.bands[2]!)).toBe(
      "22 percent or greater",
    );
    const serialized = JSON.stringify(GALLAGHER_COMBINED_AA_WHITE_TABLE);
    expect(serialized).not.toMatch(/Essential|Athletic|Fitness|Average|Optimal|Excellence|Elite/i);
  });
});

describe("Gallagher Body Fat screening reference — applicability", () => {
  it("rejects age 19, age 80, missing DOB, and unsupported reference sex", () => {
    expect(lookupGallagherCombinedTable({ ageYears: 19, sex: "male" }).status).toBe(
      "unavailable",
    );
    expect(lookupGallagherCombinedTable({ ageYears: 80, sex: "female" }).status).toBe(
      "unavailable",
    );
    expect(lookupGallagherCombinedTable({ ageYears: null, sex: "male" }).status).toBe(
      "unavailable",
    );
    expect(
      lookupGallagherCombinedTable({ ageYears: 40, sex: "unspecified" }).status,
    ).toBe("unavailable");
    expect(lookupGallagherCombinedTable({ ageYears: 40, sex: null }).status).toBe(
      "unavailable",
    );
  });
});

type BoundaryCase = {
  sex: "female" | "male";
  age: number;
  samples: readonly { percent: number; band: "lower" | "mid_range" | "higher" }[];
};

const BOUNDARY_CASES: readonly BoundaryCase[] = [
  {
    sex: "male",
    age: 30,
    samples: [
      { percent: 7.9, band: "lower" },
      { percent: 8.0, band: "mid_range" },
      { percent: 19.9, band: "mid_range" },
      { percent: 20.0, band: "higher" },
    ],
  },
  {
    sex: "male",
    age: 50,
    samples: [
      { percent: 10.9, band: "lower" },
      { percent: 11.0, band: "mid_range" },
      { percent: 21.9, band: "mid_range" },
      { percent: 22.0, band: "higher" },
    ],
  },
  {
    sex: "male",
    age: 70,
    samples: [
      { percent: 12.9, band: "lower" },
      { percent: 13.0, band: "mid_range" },
      { percent: 24.9, band: "mid_range" },
      { percent: 25.0, band: "higher" },
    ],
  },
  {
    sex: "female",
    age: 30,
    samples: [
      { percent: 20.9, band: "lower" },
      { percent: 21.0, band: "mid_range" },
      { percent: 32.9, band: "mid_range" },
      { percent: 33.0, band: "higher" },
    ],
  },
  {
    sex: "female",
    age: 50,
    samples: [
      { percent: 22.9, band: "lower" },
      { percent: 23.0, band: "mid_range" },
      { percent: 33.9, band: "mid_range" },
      { percent: 34.0, band: "higher" },
    ],
  },
  {
    sex: "female",
    age: 70,
    samples: [
      { percent: 23.9, band: "lower" },
      { percent: 24.0, band: "mid_range" },
      { percent: 35.9, band: "mid_range" },
      { percent: 36.0, band: "higher" },
    ],
  },
];

describe("Gallagher Body Fat screening reference — exhaustive boundaries", () => {
  for (const c of BOUNDARY_CASES) {
    it(`${c.sex} age ${c.age}`, () => {
      const lookup = lookupGallagherCombinedTable({ ageYears: c.age, sex: c.sex });
      expect(lookup.status).toBe("ready");
      if (lookup.status !== "ready") return;
      for (const sample of c.samples) {
        expect(classifyGallagherBodyFatPercent(sample.percent, lookup.table.bands)).toBe(
          sample.band,
        );
      }
    });
  }

  it("rejects invalid percents", () => {
    const lookup = lookupGallagherCombinedTable({ ageYears: 40, sex: "male" });
    expect(lookup.status).toBe("ready");
    if (lookup.status !== "ready") return;
    expect(classifyGallagherBodyFatPercent(Number.NaN, lookup.table.bands)).toBeNull();
    expect(classifyGallagherBodyFatPercent(Number.POSITIVE_INFINITY, lookup.table.bands)).toBeNull();
    expect(classifyGallagherBodyFatPercent(-1, lookup.table.bands)).toBeNull();
    expect(classifyGallagherBodyFatPercent(101, lookup.table.bands)).toBeNull();
  });
});

describe("resolveBodyFatNumericalReferenceChart", () => {
  const evidence = {
    weightKg: 80,
    bodyFatPercent: 18,
    leanBodyMassKg: 60,
    overviewDay: "2026-09-20",
  };

  it("builds Lower / Mid-range / Higher percent ranges and withholds marker", () => {
    const chart = resolveBodyFatNumericalReferenceChart({
      ageYears: 45,
      sex: "male",
      bodyFatPercent: 18,
      view: "percentage",
      massDisplayUnit: "lb",
      evidence,
      measurementMethod: null,
    });
    expect(chart).not.toBeNull();
    expect(chart!.standardId).toBe(GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID);
    expect(chart!.standardVersion).toBe(GALLAGHER_BODY_FAT_SCREENING_VERSION);
    expect(chart!.segments.map((s) => s.label)).toEqual(["Lower", "Mid-range", "Higher"]);
    expect(chart!.segments.map((s) => s.formattedRange)).toEqual(["<11%", "11–<22%", "≥22%"]);
    expect(chart!.marker).toBeNull();
    expect(chart!.accessibleSummary).toMatch(/screening reference/i);
    expect(chart!.accessibleSummary).toMatch(/No personal placement/i);
    expect(chart!.accessibleSummary).not.toMatch(/Essential|Athletic|Optimal|Excellence/i);
  });

  it("translates mass ranges from compatible Weight and does not invent zero", () => {
    const chart = resolveBodyFatNumericalReferenceChart({
      ageYears: 45,
      sex: "male",
      bodyFatPercent: 18,
      view: "fatMass",
      massDisplayUnit: "lb",
      evidence,
      measurementMethod: "apple_health",
    });
    expect(chart).not.toBeNull();
    expect(chart!.marker).toBeNull();
    const expected = GALLAGHER_COMBINED_AA_WHITE_TABLE.find(
      (t) => t.sex === "male" && t.ageBandId === "40_59",
    )!.bands.map((band) =>
      formatGallagherMassRange({ band, weightKg: 80, massDisplayUnit: "lb" }),
    );
    expect(chart!.segments.map((s) => s.formattedRange)).toEqual(expected);
    expect(chart!.segments.every((s) => s.formattedRange !== "0 lb" && s.formattedRange !== "—")).toBe(
      true,
    );
  });

  it("keeps percent ranges when Weight missing for mass view, shows em dash mass ranges", () => {
    const mass = resolveBodyFatNumericalReferenceChart({
      ageYears: 30,
      sex: "female",
      bodyFatPercent: 25,
      view: "fatMass",
      massDisplayUnit: "kg",
      evidence: {
        weightKg: null,
        bodyFatPercent: 25,
        leanBodyMassKg: null,
        overviewDay: "2026-09-20",
      },
      measurementMethod: null,
    });
    expect(mass).not.toBeNull();
    expect(mass!.segments.every((s) => s.formattedRange === "—")).toBe(true);
    expect(mass!.accessibleSummary).toMatch(/compatible Weight/i);

    const pct = resolveBodyFatNumericalReferenceChart({
      ageYears: 30,
      sex: "female",
      bodyFatPercent: 25,
      view: "percentage",
      massDisplayUnit: "kg",
      evidence: {
        weightKg: null,
        bodyFatPercent: 25,
        leanBodyMassKg: null,
        overviewDay: "2026-09-20",
      },
      measurementMethod: null,
    });
    expect(pct!.segments.map((s) => s.formattedRange)).toEqual(["<21%", "21–<33%", "≥33%"]);
  });

  it("returns null when reference sex unsupported", () => {
    expect(
      resolveBodyFatNumericalReferenceChart({
        ageYears: 40,
        sex: "unspecified",
        bodyFatPercent: 20,
        view: "percentage",
        massDisplayUnit: "lb",
        evidence,
        measurementMethod: null,
      }),
    ).toBeNull();
  });

  it("does not change classification labels between unit views", () => {
    const lb = resolveBodyFatNumericalReferenceChart({
      ageYears: 45,
      sex: "male",
      bodyFatPercent: 18,
      view: "fatMass",
      massDisplayUnit: "lb",
      evidence,
      measurementMethod: null,
    });
    const kg = resolveBodyFatNumericalReferenceChart({
      ageYears: 45,
      sex: "male",
      bodyFatPercent: 18,
      view: "fatMass",
      massDisplayUnit: "kg",
      evidence,
      measurementMethod: null,
    });
    expect(lb!.segments.map((s) => s.label)).toEqual(kg!.segments.map((s) => s.label));
    expect(lb!.segments.map((s) => s.id)).toEqual(kg!.segments.map((s) => s.id));
  });
});
