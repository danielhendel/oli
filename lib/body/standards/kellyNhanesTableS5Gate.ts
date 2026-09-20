/**
 * Kelly et al. 2009 NHANES Table S5 — Lean Mass/Height² primary-source gate record.
 *
 * Runtime numerical Lean Mass ranges are BLOCKED: Table S5 is ethnicity-specific
 * (White / Black / Mexican American) with no pooled adult reference. Shipping
 * ranges would require silent ethnicity inference or invented universal lb bands.
 *
 * This module records verification metadata only — it does not encode LMS curves
 * for runtime classification.
 */

export const KELLY_NHANES_TOTAL_LMI_STANDARD_CANDIDATE_ID =
  "kelly-nhanes-hologic-total-lmi-reference" as const;

export const KELLY_NHANES_TOTAL_LMI_VERSION_CANDIDATE = "2009.1" as const;

export const KELLY_TABLE_S5_SUPPLEMENT_DOI = "10.1371/journal.pone.0007038.s025" as const;

/** SHA-256 of the downloaded Microsoft Word DOC supplement bytes. */
export const KELLY_TABLE_S5_DOC_SHA256 =
  "43371bbccbc42af900bbd15770470414c61bac2cead2ac13b16068d64debb718" as const;

export const KELLY_TABLE_S5_BIBLIOGRAPHIC_IDENTITY =
  "Kelly TL, Wilson KE, Heymsfield SB. Dual Energy X-Ray Absorptiometry Body Composition Reference Values from NHANES. PLoS ONE. 2009;4(9):e7038. Table S5: Lean Mass/Height² (kg/m²) vs. Age in adult subjects." as const;

export const KELLY_TABLE_S5_LICENSE_NOTE =
  "PLoS ONE articles and supplements are published under Creative Commons Attribution (CC BY). Extraction notes and checksum recording for scientific verification are permitted; runtime personal classification still requires an approved non-inferred reference population." as const;

export const KELLY_TABLE_S5_COLUMNS = ["Age", "M", "σ", "L"] as const;

export const KELLY_TABLE_S5_REFERENCE_POPULATIONS = [
  "White",
  "Black",
  "Mexican American",
] as const;

export const KELLY_TABLE_S5_SEX_GROUPS = ["Males", "Females"] as const;

export const KELLY_TABLE_S5_CONSTRUCT = "total_lean_mass_index" as const;

/**
 * Independently verified sample rows from the DOC (Age / M / σ / L).
 * White males age 20; Black females age 40; Mexican American males age 60.
 */
export const KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS = [
  {
    sex: "male" as const,
    population: "White" as const,
    age: 20,
    M: 18.98,
    sigma: 2.5,
    L: -1.115,
  },
  {
    sex: "female" as const,
    population: "Black" as const,
    age: 40,
    M: 18.12,
    sigma: 2.86,
    L: -0.872,
  },
  {
    sex: "male" as const,
    population: "Mexican American" as const,
    age: 60,
    M: 19.93,
    sigma: 2.16,
    L: -0.492,
  },
] as const;

export const KELLY_TABLE_S5_POOLED_ADULT_REFERENCE_AVAILABLE = false as const;

export const KELLY_LEAN_MASS_NUMERICAL_RUNTIME_STATUS =
  "BLOCKED_NO_APPROVED_NON_INFERRED_REFERENCE_POPULATION" as const;

export const KELLY_LEAN_MASS_NUMERICAL_BLOCKER =
  "LEAN MASS NUMERICAL REFERENCE BLOCKED — NO APPROVED NON-INFERRED REFERENCE POPULATION" as const;
