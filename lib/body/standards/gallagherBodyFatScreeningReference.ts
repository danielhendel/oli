/**
 * Gallagher et al. 2000 — BMI-equivalent adult % body-fat screening reference.
 *
 * Combined African American / White Table 4 values, simplified to three landing
 * bands (Lower / Mid-range / Higher). Higher merges the source Elevated + Obesity
 * upper regions for compact card presentation.
 *
 * General educational screening reference — not universal, not ethnicity-inferred,
 * not method-independent, not diagnosis or performance classification.
 * ACE Essential/Athletic/Fitness/Average are rejected as Oli health truth.
 */

export const GALLAGHER_BODY_FAT_SCREENING_STANDARD_ID =
  "gallagher-4c-bmi-equivalent-body-fat-reference" as const;

export const GALLAGHER_BODY_FAT_SCREENING_VERSION = "2000.1" as const;

export type GallagherReferenceSex = "female" | "male";

export type GallagherAgeBandId = "20_39" | "40_59" | "60_79";

export type GallagherBodyFatBandId = "lower" | "mid_range" | "higher";

/**
 * Numeric domain for one landing band.
 * Bounds are percent body fat. Mid-range is [lowerBound, upperBound).
 * Higher is [lowerBound, +∞). Lower is (−∞, upperBound).
 */
export type GallagherBodyFatBandBounds = {
  readonly id: GallagherBodyFatBandId;
  readonly label: "Lower" | "Mid-range" | "Higher";
  /** Inclusive lower edge; null = unbounded below. */
  readonly lowerBound: number | null;
  /** Exclusive upper edge for mid; null = unbounded above for Higher. */
  readonly upperBound: number | null;
  readonly lowerInclusive: boolean;
  readonly upperInclusive: boolean;
  readonly tone: "cool" | "reference" | "caution";
};

export type GallagherAgeSexTable = {
  readonly ageBandId: GallagherAgeBandId;
  readonly ageMinYears: number;
  readonly ageMaxYearsInclusive: number;
  readonly sex: GallagherReferenceSex;
  readonly bands: readonly [
    GallagherBodyFatBandBounds,
    GallagherBodyFatBandBounds,
    GallagherBodyFatBandBounds,
  ];
};

function threeBands(
  lowerUpper: number,
  midUpper: number,
): GallagherAgeSexTable["bands"] {
  return [
    {
      id: "lower",
      label: "Lower",
      lowerBound: null,
      upperBound: lowerUpper,
      lowerInclusive: false,
      upperInclusive: false,
      tone: "cool",
    },
    {
      id: "mid_range",
      label: "Mid-range",
      lowerBound: lowerUpper,
      upperBound: midUpper,
      lowerInclusive: true,
      upperInclusive: false,
      tone: "reference",
    },
    {
      id: "higher",
      label: "Higher",
      lowerBound: midUpper,
      upperBound: null,
      lowerInclusive: true,
      upperInclusive: false,
      tone: "caution",
    },
  ];
}

/**
 * Combined African American / White Table 4 — landing three-band cutoffs.
 * Mid-range upper edge is the source “Elevated” lower edge (Higher starts there).
 */
export const GALLAGHER_COMBINED_AA_WHITE_TABLE: readonly GallagherAgeSexTable[] = [
  {
    ageBandId: "20_39",
    ageMinYears: 20,
    ageMaxYearsInclusive: 39,
    sex: "male",
    bands: threeBands(8, 20),
  },
  {
    ageBandId: "40_59",
    ageMinYears: 40,
    ageMaxYearsInclusive: 59,
    sex: "male",
    bands: threeBands(11, 22),
  },
  {
    ageBandId: "60_79",
    ageMinYears: 60,
    ageMaxYearsInclusive: 79,
    sex: "male",
    bands: threeBands(13, 25),
  },
  {
    ageBandId: "20_39",
    ageMinYears: 20,
    ageMaxYearsInclusive: 39,
    sex: "female",
    bands: threeBands(21, 33),
  },
  {
    ageBandId: "40_59",
    ageMinYears: 40,
    ageMaxYearsInclusive: 59,
    sex: "female",
    bands: threeBands(23, 34),
  },
  {
    ageBandId: "60_79",
    ageMinYears: 60,
    ageMaxYearsInclusive: 79,
    sex: "female",
    bands: threeBands(24, 36),
  },
] as const;

export type GallagherTableLookupResult =
  | { readonly status: "ready"; readonly table: GallagherAgeSexTable }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "age_out_of_range"
        | "age_missing"
        | "reference_sex_unsupported"
        | "reference_sex_missing";
    };

export function lookupGallagherCombinedTable(input: {
  readonly ageYears: number | null;
  readonly sex: "female" | "male" | "unspecified" | null;
}): GallagherTableLookupResult {
  if (input.ageYears == null || !Number.isFinite(input.ageYears)) {
    return { status: "unavailable", reason: "age_missing" };
  }
  const age = Math.floor(input.ageYears);
  if (age < 20 || age > 79) {
    return { status: "unavailable", reason: "age_out_of_range" };
  }
  if (input.sex == null || input.sex === "unspecified") {
    return {
      status: "unavailable",
      reason: input.sex == null ? "reference_sex_missing" : "reference_sex_unsupported",
    };
  }
  const table = GALLAGHER_COMBINED_AA_WHITE_TABLE.find(
    (t) =>
      t.sex === input.sex &&
      age >= t.ageMinYears &&
      age <= t.ageMaxYearsInclusive,
  );
  if (table == null) {
    return { status: "unavailable", reason: "age_out_of_range" };
  }
  return { status: "ready", table };
}

export function classifyGallagherBodyFatPercent(
  percent: number,
  bands: GallagherAgeSexTable["bands"],
): GallagherBodyFatBandId | null {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  for (const band of bands) {
    const aboveLower =
      band.lowerBound == null ||
      (band.lowerInclusive ? percent >= band.lowerBound : percent > band.lowerBound);
    const belowUpper =
      band.upperBound == null ||
      (band.upperInclusive ? percent <= band.upperBound : percent < band.upperBound);
    if (aboveLower && belowUpper) return band.id;
  }
  return null;
}

/** Format percent range for card face (en dash). */
export function formatGallagherPercentRange(band: GallagherBodyFatBandBounds): string {
  if (band.upperBound != null && band.lowerBound == null) {
    return `<${band.upperBound}%`;
  }
  if (band.lowerBound != null && band.upperBound != null) {
    return `${band.lowerBound}–<${band.upperBound}%`;
  }
  if (band.lowerBound != null && band.upperBound == null) {
    return `≥${band.lowerBound}%`;
  }
  return "—";
}

export function formatGallagherPercentRangeAccessible(
  band: GallagherBodyFatBandBounds,
): string {
  if (band.upperBound != null && band.lowerBound == null) {
    return `less than ${band.upperBound} percent`;
  }
  if (band.lowerBound != null && band.upperBound != null) {
    return `${band.lowerBound} percent to less than ${band.upperBound} percent`;
  }
  if (band.lowerBound != null && band.upperBound == null) {
    return `${band.lowerBound} percent or greater`;
  }
  return "range unavailable";
}

/** Format mass range from percent bounds × compatible weight (kg). */
export function formatGallagherMassRange(input: {
  readonly band: GallagherBodyFatBandBounds;
  readonly weightKg: number;
  readonly massDisplayUnit: "lb" | "kg";
}): string {
  const { band, weightKg, massDisplayUnit } = input;
  const LB = 2.2046226218;
  const toDisplay = (kg: number): string => {
    const v = massDisplayUnit === "lb" ? kg * LB : kg;
    const one = v.toFixed(1);
    return one.endsWith(".0") ? one.slice(0, -2) : one;
  };
  const unit = massDisplayUnit;
  if (band.upperBound != null && band.lowerBound == null) {
    return `<${toDisplay(weightKg * (band.upperBound / 100))} ${unit}`;
  }
  if (band.lowerBound != null && band.upperBound != null) {
    return `${toDisplay(weightKg * (band.lowerBound / 100))}–<${toDisplay(
      weightKg * (band.upperBound / 100),
    )} ${unit}`;
  }
  if (band.lowerBound != null && band.upperBound == null) {
    return `≥${toDisplay(weightKg * (band.lowerBound / 100))} ${unit}`;
  }
  return "—";
}

export function formatGallagherMassRangeAccessible(input: {
  readonly band: GallagherBodyFatBandBounds;
  readonly weightKg: number;
  readonly massDisplayUnit: "lb" | "kg";
}): string {
  const formatted = formatGallagherMassRange(input);
  const unitWord = input.massDisplayUnit === "lb" ? "pounds" : "kilograms";
  if (formatted.startsWith("<")) {
    return `less than ${formatted.slice(1).replace(/ (lb|kg)$/, "")} ${unitWord}`;
  }
  if (formatted.startsWith("≥")) {
    return `${formatted.slice(1).replace(/ (lb|kg)$/, "")} ${unitWord} or greater`;
  }
  const m = formatted.match(/^([\d.]+)–<([\d.]+) (lb|kg)$/);
  if (m) {
    return `${m[1]} ${unitWord} to less than ${m[2]} ${unitWord}`;
  }
  return "mass range unavailable";
}

export const GALLAGHER_GENERAL_REFERENCE_LIMITATION =
  "General educational screening reference (combined African American / White Table 4). Not universal; not ethnicity-inferred; not method-independent." as const;
